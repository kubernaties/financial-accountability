/**
 * Money on Hold: voucher received (becomes an expense) and money returned.
 */
import {toast} from "../../core/feedback.js";
import {persist, state} from "../../core/store.js";
import {$, esc, money, num, today, uid} from "../../core/utils.js";
import {holdOutstanding} from "../../finance/calculations.js";
import {card} from "../components.js";
import {render} from "../shell.js";
import {simpleModal} from "./modal.js";

export function openHoldSettle(id){
 const h=(state.holds||[]).find(x=>x.id===id);if(!h)return;const left=holdOutstanding(h);
 simpleModal("Voucher received - confirm expense","hold-settle-form",
  `<div class="field"><label>Voucher amount (up to ${money(left)})</label><input name="amount" type="number" min="0.01" max="${left}" step="0.01" value="${left}" required></div>
   <div class="field"><label>Date</label><input name="date" type="date" value="${today()}" required></div>
   <div class="field"><label>Category</label><select name="category">${state.categories.map(c=>`<option>${esc(c)}</option>`).join("")}</select></div>
   <div class="field"><label>Voucher number</label><input name="voucherNumber" type="text"></div>
   <div class="field full"><label>Description</label><input name="description" type="text" value="${esc(h.purpose||"")}"></div>
   <div class="field full card-sub">This turns the held money into a real expense from ${esc(h.fund)}. The fund is not reduced twice. Any difference stays on hold until returned or settled.</div>`,
  d=>{
   const amount=Math.min(num(d.amount),left);if(amount<=0)return;
   const exp={id:uid("EXP"),timestamp:new Date().toISOString(),status:"Recorded",reimbursementStatus:"N/A",amount,date:d.date,category:d.category,description:d.description||h.purpose||"Held money settled",actualPayer:"You",fundedBy:h.fund,paymentMethod:"Cash",voucherNumber:d.voucherNumber||"",holdId:h.id,recipient:h.recipient};
   state.expenses.push(exp);
   state.transactions.push({id:uid("TX"),type:"Expense",date:exp.date,description:exp.description,amount,status:"Recorded",sourceId:exp.id});
   persist("Held money settled by voucher",id,null,JSON.stringify(exp),"Voucher received");
   $(".modal-backdrop")?.remove();render();toast("Expense confirmed from held money");
  });
}
export function openHoldReturn(id){
 const h=(state.holds||[]).find(x=>x.id===id);if(!h)return;const left=holdOutstanding(h);
 simpleModal("Held money returned","hold-return-form",
  `<div class="field"><label>Amount returned (up to ${money(left)})</label><input name="amount" type="number" min="0.01" max="${left}" step="0.01" value="${left}" required></div>
   <div class="field"><label>Date</label><input name="date" type="date" value="${today()}" required></div>
   <div class="field full"><label>Note</label><input name="note" type="text"></div>
   <div class="field full card-sub">Returned money is credited back to ${esc(h.fund)}.</div>`,
  d=>{
   const amount=Math.min(num(d.amount),left);if(amount<=0)return;
   h.returns=h.returns||[];h.returns.push({id:uid("RET"),amount,date:d.date,note:d.note||"",createdAt:new Date().toISOString()});
   persist("Held money returned",id,null,JSON.stringify(d),"Returned to "+h.fund);
   $(".modal-backdrop")?.remove();render();toast("Money credited back to "+h.fund);
  });
}
