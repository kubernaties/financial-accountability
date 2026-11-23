/**
 * Accountability periods, monthly reports and the day detail popup.
 */
import {toast} from "../../core/feedback.js";
import {persist, state} from "../../core/store.js";
import {$, $$, esc, money} from "../../core/utils.js";
import {table} from "../components.js";
import {render} from "../shell.js";

export function closePeriod(id){
 const p=state.periods.find(x=>x.id===id);if(!p)return;
 p.status="Closed";p.closedAt=new Date().toISOString();
 persist("Accountability period closed",id,null,JSON.stringify(p),"Period closed");render();toast("Period closed");
}
export function reopenPeriod(id){
 const p=state.periods.find(x=>x.id===id);if(!p)return;
 const reason=prompt("Reason for reopening the period","Needs correction");
 if(reason===null)return;
 p.status="Reopened";p.reopenedAt=new Date().toISOString();p.reopenReason=reason;
 persist("Accountability period reopened",id,JSON.stringify(p),JSON.stringify(p),reason);render();toast("Period reopened");
}
export function closeMonth(id){
 const m=state.monthly.find(x=>x.id===id);if(!m)return;m.status="Closed";m.closedAt=new Date().toISOString();
 persist("Monthly report closed",id,null,JSON.stringify(m),"Month closed");render();toast("Month closed");
}
export function reopenMonth(id){
 const m=state.monthly.find(x=>x.id===id);if(!m)return;const reason=prompt("Reason for reopening the monthly report","Correction");
 if(reason===null)return;m.status="Open";m.reopenedAt=new Date().toISOString();
 persist("Monthly report reopened",id,null,JSON.stringify(m),reason);render();toast("Month reopened");
}
export function openDay(date){
 const ok=x=>!["Void","Reversed"].includes(x.status);
 const rows=[
  ...state.collections.filter(x=>x.collectionDate===date&&ok(x)).map(x=>["Collection - "+esc(x.category),esc(x.description||x.person||""),money(x.amount)]),
  ...state.expenses.filter(x=>x.date===date&&ok(x)).map(x=>["Expense - "+esc(x.category),esc((x.description||"")+" ("+x.actualPayer+", "+x.fundedBy+")"),money(x.amount)]),
  ...state.vouchers.filter(x=>x.date===date&&ok(x)).map(x=>["Voucher "+esc(x.id),esc(x.category+" · "+x.verification),money(x.amount)]),
  ...state.handovers.filter(x=>x.date===date&&ok(x)).map(x=>["Handover",esc(x.recipient),money(x.amount)]),
  ...state.fines.filter(x=>x.date===date&&ok(x)).map(x=>["Fine - "+esc(x.source),esc(x.reason||x.status),money(x.amount)]),
  ...(state.custom||[]).filter(x=>x.date===date&&ok(x)).map(x=>["Custom - "+esc(x.direction),esc(x.label),money(x.amount)])
 ];
 const content=rows.length?table(["Type","Description","Amount"],rows):`<div class="empty">No activity recorded</div>`;
 document.body.insertAdjacentHTML("beforeend",`<div class="modal-backdrop"><div class="modal"><div class="modal-head"><h2>${esc(date)}</h2><button class="btn small" data-close>×</button></div><div class="modal-body">${content}<br><button class="btn" data-confirm-date="${esc(date)}">Confirm no activity</button></div></div></div>`);
 $$("[data-close]").forEach(b=>b.onclick=()=>$(".modal-backdrop")?.remove());
 $$("[data-confirm-date]").forEach(b=>b.onclick=()=>{const d=b.dataset.confirmDate;if(!state.reconfirmedDates.includes(d))state.reconfirmedDates.push(d);persist("Nothing happened confirmed",d);$(".modal-backdrop")?.remove();render();toast("Day confirmed");});
}
