/**
 * Actions on existing records: void, reverse, repayments, custom-entry returns, reimbursements.
 */
import {toast} from "../../core/feedback.js";
import {persist, state} from "../../core/store.js";
import {$, $$, esc, money, num, sum, today, uid} from "../../core/utils.js";
import {customOutstanding} from "../../finance/calculations.js";
import {card} from "../components.js";
import {render} from "../shell.js";
import {collectionKey} from "./definitions.js";

export function voidRecord(kind,id){
 const key=collectionKey(kind),record=state[key].find(x=>x.id===id);if(!record)return;
 const reason=prompt("Reason for voiding this record","Incorrect entry");
 if(reason===null)return;
 const before=JSON.stringify(record);record.status="Void";record.voidedAt=new Date().toISOString();record.voidReason=reason;
 const tx=state.transactions.find(x=>x.sourceId===id);if(tx){tx.status="Void";tx.voidReason=reason;}
 persist(`${kind} voided`,id,before,JSON.stringify(record),reason);toast("Record voided");render();
}
export function reverseRecord(kind,id){
 const key=collectionKey(kind),record=state[key].find(x=>x.id===id);if(!record)return;
 const reason=prompt("Reason for reversal","Correction / duplicate");
 if(reason===null)return;
 const before=JSON.stringify(record);
 record.status="Reversed";record.reversedAt=new Date().toISOString();record.reversalReason=reason;
 const reverse={...record,id:uid("REV"),status:"Reversed",reversalOf:id,amount:-Math.abs(num(record.amount)),timestamp:new Date().toISOString()};
 state[key].push(reverse);
 if(["collection","expense"].includes(kind))state.transactions.push({id:uid("TX"),type:kind==="collection"?"Collection":"Expense",date:record.collectionDate||record.date,description:`Reversal: ${record.description||record.category||""}`,amount:-Math.abs(num(record.amount)),status:"Reversed",sourceId:reverse.id,reversalOf:id});
 persist(`${kind} reversed`,id,before,JSON.stringify(record),reason);toast("Reversal recorded");render();
}
export function openRepayment(id){
 const advance=state.advances.find(x=>x.id===id);if(!advance)return;
 document.body.insertAdjacentHTML("beforeend",`<div class="modal-backdrop"><div class="modal"><div class="modal-head"><h2>Advance repayment</h2><button class="btn small" data-close>×</button></div><form id="repayment-form"><div class="modal-body"><div class="form-grid"><div class="field"><label>Amount</label><input name="amount" type="number" min="0.01" step="0.01" required></div><div class="field"><label>Date</label><input name="date" type="date" value="${today()}"></div><div class="field full"><label>Method</label><select name="method"><option>Cash</option><option>Bank transfer</option><option>Mobile banking</option></select></div><div class="field full"><label>Reference / note</label><input name="note"></div></div></div><div class="modal-foot"><button type="button" class="btn" data-close>Cancel</button><button class="btn primary">Save repayment</button></div></form></div></div>`);
 $$("[data-close]").forEach(b=>b.onclick=()=>$(".modal-backdrop")?.remove());
 $("#repayment-form").onsubmit=e=>{
  e.preventDefault();const d=Object.fromEntries(new FormData(e.target).entries());d.amount=num(d.amount);
  advance.repayments=advance.repayments||[];advance.repayments.push({id:uid("RPY"),...d,createdAt:new Date().toISOString()});
  const outstanding=Math.max(0,num(advance.amount)-num(advance.returned)-num(advance.spent)-sum(advance.repayments,"amount"));
  if(outstanding<=0)advance.status="Settled";
  persist("Advance repayment recorded",id,null,JSON.stringify(d),"Repayment");$(".modal-backdrop")?.remove();render();toast("Repayment recorded");
 };
}
export function openCustomReturn(id){
 const c=state.custom.find(x=>x.id===id);if(!c)return;
 const owedMe=c.direction==="Someone owes me",left=customOutstanding(c);
 document.body.insertAdjacentHTML("beforeend",`<div class="modal-backdrop"><div class="modal"><div class="modal-head"><h2>${owedMe?"Money came back":"Paid back"}</h2><button class="btn small" data-close>×</button></div><form id="custom-return-form"><div class="modal-body"><div class="form-grid"><div class="field"><label>Amount (up to ${money(left)})</label><input name="amount" type="number" min="0.01" max="${left}" step="0.01" value="${left}" required></div><div class="field"><label>Date</label><input name="date" type="date" value="${today()}"></div><div class="field full"><label>Note</label><input name="note"></div></div></div><div class="modal-foot"><button type="button" class="btn" data-close>Cancel</button><button class="btn primary">Save</button></div></form></div></div>`);
 $$("[data-close]").forEach(b=>b.onclick=()=>$(".modal-backdrop")?.remove());
 $("#custom-return-form").onsubmit=e=>{
  e.preventDefault();const d=Object.fromEntries(new FormData(e.target).entries());d.amount=Math.min(num(d.amount),customOutstanding(c));
  c.returns=c.returns||[];c.returns.push({id:uid("RET"),...d,createdAt:new Date().toISOString()});
  persist(owedMe?"Custom money returned":"Custom money paid back",id,null,JSON.stringify(d),"Return recorded");$(".modal-backdrop")?.remove();render();toast("Saved");
 };
}
export function openReimbursement(expenseId){
 const expense=state.expenses.find(x=>x.id===expenseId);if(!expense)return;
 if(expense.actualPayer!=="Teacher")return toast("Only expenses paid by a teacher need a reimbursement");
 const left=Math.max(0,num(expense.amount)-num(expense.reimbursedAmount));
 if(left<=0)return toast("This expense is already fully reimbursed");
 document.body.insertAdjacentHTML("beforeend",`<div class="modal-backdrop"><div class="modal"><div class="modal-head"><h2>Expense reimbursement</h2><button class="btn small" data-close>×</button></div><form id="reimbursement-form"><div class="modal-body"><p class="card-sub">${esc(expense.id)}: ${money(expense.amount)} paid by ${esc(expense.actualPayer)}. Already reimbursed ${money(expense.reimbursedAmount)}, remaining ${money(left)}.</p><div class="form-grid"><div class="field"><label>Amount paid now</label><input name="amount" type="number" step="0.01" min="0.01" max="${left}" value="${left}" required></div><div class="field"><label>Paid from</label><select name="fund"><option value="Principal paid directly">Principal paid directly (no money from you)</option><option value="Regular fund">Regular fund</option><option value="Fine fund">Fine fund</option><option value="Principal's money">Principal's money</option></select></div><div class="field"><label>Payment date</label><input name="date" type="date" value="${today()}"></div><div class="field"><label>Method</label><select name="method"><option>Cash</option><option>Bank transfer</option><option>Mobile banking</option></select></div></div></div><div class="modal-foot"><button type="button" class="btn" data-close>Cancel</button><button class="btn primary">Save reimbursement</button></div></form></div></div>`);
 $$("[data-close]").forEach(b=>b.onclick=()=>$(".modal-backdrop")?.remove());
 $("#reimbursement-form").onsubmit=e=>{
  e.preventDefault();const d=Object.fromEntries(new FormData(e.target).entries());d.amount=Math.min(num(d.amount),left);
  if(d.amount<=0)return;
  expense.reimbursedAmount=num(expense.reimbursedAmount)+d.amount;
  expense.reimbursementStatus=expense.reimbursedAmount>=num(expense.amount)?"Paid":"Partially reimbursed";
  state.reimbursements.push({id:uid("RMB"),expenseId,...d,createdAt:new Date().toISOString()});
  persist("Reimbursement paid",expenseId,null,JSON.stringify(d),"Reimbursement");$(".modal-backdrop")?.remove();render();toast("Reimbursement saved");
 };
}
