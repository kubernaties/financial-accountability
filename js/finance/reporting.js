/**
 * Builds lists from records for ledgers, charts and monthly snapshots (grouping, date buckets, transaction ledger).
 */
import {state} from "../core/store.js";
import {$, active, num, sum, uid} from "../core/utils.js";
import {customList, fundOf, holdList, holdStatus} from "./calculations.js";

export function expenseItems(){
 return [...active(state.expenses).map(x=>({fund:fundOf(x),payer:x.actualPayer,category:x.category||"Uncategorised",amount:num(x.amount),date:x.date})),
  ...customList().filter(c=>c.direction==="Money out"&&c.countsExpense==="Yes").map(c=>({fund:c.fund||"No fund",payer:"You",category:"Custom entries",amount:num(c.amount),date:c.date}))];
}
export function collectionItems(){
 return [...active(state.collections).map(x=>({cat:x.category||"Uncategorised",amount:num(x.amount),date:x.collectionDate})),
  ...active(state.fines).filter(f=>f.source==="Fine collection").map(f=>({cat:"Fines",amount:num(f.amount),date:f.date}))];
}
export function groupSum(items,keyFn){const m=new Map();items.forEach(i=>{const k=keyFn(i);m.set(k,(m.get(k)||0)+i.amount);});return [...m.entries()].sort((a,b)=>b[1]-a[1]);}
export function flowItems(){
 const out=[];
 collectionItems().forEach(c=>out.push({date:c.date,kind:"in",fine:c.cat==="Fines",amount:c.amount}));
 expenseItems().forEach(e=>out.push({date:e.date,kind:"exp",amount:e.amount}));
 active(state.handovers).forEach(h=>out.push({date:h.date,kind:"hov",amount:num(h.amount)}));
 holdList().forEach(h=>out.push({date:h.date,kind:"hold",amount:num(h.amount)}));
 return out.filter(x=>x.date);
}
export function bucketKey(date,mode){
 if(mode==="daily")return date;if(mode==="monthly")return date.slice(0,7);if(mode==="yearly")return date.slice(0,4);
 const d=new Date(date+"T00:00:00");d.setDate(d.getDate()-((d.getDay()+6)%7));
 return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
}
export function ledger(){
 const rows=[],push=(kind,type,x,date,desc,amount,status)=>rows.push({kind,type,id:x.id,date:date||"",desc:desc||"",amount:num(amount),status:status||x.status||"Recorded"});
 state.collections.forEach(x=>push("collection",x.category==="Fines"?"Fine collection":"Collection",x,x.collectionDate,`${x.person?x.person+" · ":""}${x.description||x.category||""}`,x.amount));
 state.expenses.forEach(x=>push("expense","Expense",x,x.date,`${x.category||""}${x.description?" · "+x.description:""} (${fundOf(x)})`,x.amount));
 state.handovers.forEach(x=>push("handover","Handover",x,x.date,`To ${x.recipient||"principal"}`,x.amount));
 (state.holds||[]).forEach(x=>push("hold","Money on hold",x,x.date,`${x.recipient||""} · ${x.purpose||""} (${x.fund})`,x.amount,holdStatus(x)));
 (state.transfers||[]).forEach(x=>push("transfer","Fund transfer",x,x.date,`${x.from} → ${x.to}${x.note?" · "+x.note:""}`,x.amount));
 state.advances.forEach(x=>push("advance","Advance",x,x.date,`${x.recipient||""} · ${x.purpose||""}`,x.amount));
 (state.custom||[]).forEach(x=>push("custom","Custom entry",x,x.date,`${x.label||""} (${x.direction})`,x.amount));
 state.adjustments.forEach(x=>push("adjustment","Adjustment",x,x.date,`${x.debit||""} → ${x.credit||""} · ${x.reason||""}`,x.amount));
 state.fines.forEach(x=>push("fine","Fine activity",x,x.date,`${x.source||""} · ${x.reason||""}`,x.amount));
 return rows;
}
export function snapshotMonth(d){
 const prefix=d.month;
 const inMonth=(list,dateField)=>active(list).filter(x=>String(x[dateField]||x.collectionDate||x.date||"").startsWith(prefix));
 return {id:uid("MON"),month:d.month,status:d.status,closedAt:d.status==="Closed"?new Date().toISOString():null,
  regular:sum(inMonth(state.collections,"collectionDate").filter(x=>x.category!=="Fines")),
  fines:sum(inMonth(state.collections,"collectionDate").filter(x=>x.category==="Fines"))+sum(inMonth(state.fines,"date").filter(f=>f.source==="Fine collection")),
  expenses:sum(inMonth(state.expenses,"date"))+sum(inMonth(state.custom||[],"date").filter(c=>c.direction==="Money out"&&c.countsExpense==="Yes")),
  handovers:sum(inMonth(state.handovers,"date")),
  vouchers:sum(inMonth(state.vouchers,"date")),
  reimbursements:sum(inMonth(state.expenses,"date").filter(x=>x.actualPayer==="Teacher"&&!["Paid","N/A"].includes(x.reimbursementStatus||"")).map(x=>({amount:Math.max(0,num(x.amount)-num(x.reimbursedAmount))}))),
  advances:sum(inMonth(state.advances,"date"))
 };
}
