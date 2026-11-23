/**
 * CSV export and the additive JSON import (imports merge, they never delete).
 */
import {download, toast} from "../../core/feedback.js";
import {MERGE_ARRAYS, mergeState} from "../../core/merge.js";
import {defaultState, persist, replaceState, state} from "../../core/store.js";
import {$} from "../../core/utils.js";
import {customOutstanding, customRet, holdOutstanding, holdReturned, holdSettled, holdStatus} from "../../finance/calculations.js";
import {render} from "../shell.js";

export function exportCSV(routeName){
 let rows=[];
 if(routeName==="collections")rows=state.collections.map(x=>({ID:x.id,Date:x.collectionDate,Person:x.person,Category:x.category,Amount:x.amount,Status:x.status||"Recorded"}));
 else if(routeName==="expenses")rows=state.expenses.map(x=>({ID:x.id,Date:x.date,Category:x.category,Description:x.description,Payer:x.actualPayer,Amount:x.amount,Reimbursement:x.reimbursementStatus,Status:x.status||"Recorded"}));
 else if(routeName==="transactions")rows=[...state.collections.map(x=>({Date:x.collectionDate,Type:"Collection",Description:x.description||x.category,Amount:x.amount,Status:x.status||"Recorded"})),...state.expenses.map(x=>({Date:x.date,Type:"Expense",Description:x.description||x.category,Amount:x.amount,Status:x.status||"Recorded"})),...state.handovers.map(x=>({Date:x.date,Type:"Handover",Description:x.recipient,Amount:-x.amount,Status:x.status||"Pending"}))];
 else if(routeName==="custom")rows=(state.custom||[]).map(c=>({ID:c.id,Date:c.date,Name:c.label,Type:c.direction,Fund:c.fund,Who:c.party,Amount:c.amount,Returned:customRet(c),Waiting:customOutstanding(c),Note:c.note}));
 else if(routeName==="holds")rows=(state.holds||[]).map(h=>({ID:h.id,Date:h.date,Recipient:h.recipient,Fund:h.fund,Purpose:h.purpose,Given:h.amount,Settled:holdSettled(h),Returned:holdReturned(h),OnHold:holdOutstanding(h),Status:holdStatus(h)}));
 else if(routeName==="transfers")rows=(state.transfers||[]).map(t=>({ID:t.id,Date:t.date,From:t.from,To:t.to,Amount:t.amount,Note:t.note,Status:t.status}));
 else if(routeName==="monthly")rows=state.monthly;
 else rows=state.vouchers.map(x=>({ID:x.id,Date:x.date,Category:x.category,Amount:x.amount,Verification:x.verification,Reimbursement:x.reimbursement}));
 const headers=[...new Set(rows.flatMap(r=>Object.keys(r)))];
 const csv=[headers.join(","),...rows.map(r=>headers.map(h=>`"${String(r[h]??"").replace(/"/g,'""')}"`).join(","))].join("\n");
 download(`${routeName||"all"}.csv`,csv,"text/csv");
}
export function importJSON(){
 const input=document.createElement("input");input.type="file";input.accept="application/json";
 input.onchange=()=>{
  const file=input.files?.[0];if(!file)return;
  const reader=new FileReader();reader.onload=()=>{try{
   const data=JSON.parse(reader.result);if(!data||typeof data!=="object"||Array.isArray(data))throw new Error("this is not a backup file");
   const before=JSON.stringify(state),d=defaultState(),m=mergeState(state,{...d,...data});
   const added=MERGE_ARRAYS.reduce((n,k)=>n+(m.state[k].length-(state[k]||[]).length),0);
   if(!confirm(`Import will ADD ${added} new record(s) and will not change or delete any existing record. Continue?`))return;
   download("financial-backup-before-import.json",before,"application/json");
   replaceState({...d,...m.state,settings:state.settings,theme:state.theme});
   persist("JSON backup merged (additive)","",null,null,`Added ${added} records`);render();toast(`Merged: ${added} new record(s) added`);
  }catch(e){toast("Could not import: "+(e&&e.message||"invalid file")+". Nothing was changed.");}};
  reader.readAsText(file);
 };
 input.click();
}
