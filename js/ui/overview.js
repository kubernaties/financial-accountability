/**
 * One-Glance dashboard section: Where Is Every Taka bar, clickable cards with drill-down, and the cash-count dialog.
 */
import {toast} from "../core/feedback.js";
import {persist, state} from "../core/store.js";
import {$, $$, DEAD, active, esc, money, num, uid} from "../core/utils.js";
import {expenseTotal, othersOweYou, principalOwesYou, stillToGetBack} from "../finance/calculations.js";
import {glanceData} from "../finance/overview.js";
import {mustGivePrincipal} from "../finance/boards.js";
import {ledger} from "../finance/reporting.js";
import {card, table} from "./components.js";
import {render} from "./shell.js";
import {calcExplain} from "./widgets.js";

// ---- One-glance overview: read-only, built only from saved records and the existing calculations ----
export const GL_KINDS={received:["collection","fine","custom"],spent:["expense","custom"],hand:["handover"],given:["custom"],hold:["hold"],adv:["advance"],owedme:["custom","adjustment","advance"],iowe:["custom","expense","adjustment"],cash:[],pers:["custom"]};
export function glance(){
 const g=glanceData(),m=money,tot=Math.max(1,g.parts.reduce((n,p)=>n+Math.max(0,p[1]),0));
 const c=(k,l,v,sub,cls="")=>`<button class="gl-card ${cls}" data-glance="${k}"><span class="card-label">${l}</span><strong>${m(v)}</strong><span class="card-sub">${esc(sub)}</span></button>`;
 return `<section class="glance">
  ${g.warn.length?`<div class="banner warn gl-warn">${g.warn.map(w=>`<div>⚠ ${esc(w)}</div>`).join("")}</div>`:`<div class="banner ok">Every taka reconciles and the last cash count matched.</div>`}
  <div class="gl-title">Where is every taka?</div>
  <div class="gl-bar" role="img" aria-label="Money distribution">${g.parts.map(p=>`<span class="seg s-${p[2]}" style="width:${(Math.max(0,p[1])/tot*100).toFixed(2)}%" title="${esc(p[0])} ${m(p[1])}"></span>`).join("")}</div>
  <div class="gl-legend">${g.parts.map(p=>`<span><i class="dot s-${p[2]}"></i>${esc(p[0])}: <strong>${m(p[1])}</strong></span>`).join("")}</div>
  <div class="gl-recon">Received <strong>${m(g.recv)}</strong> = placed <strong>${m(g.placed)}</strong> · unexplained <strong class="${Math.abs(g.diff)>0.005?"bad":""}">${m(g.diff)}</strong></div>
  <div class="gl-grid">
   ${c("received","Total received",g.recv,"All money in, all funds")}
   ${c("spent","Spent from funds",g.spentX,"Expenses only. Money given to people is not counted here","out")}
   ${c("given","Given to people",g.given,"Taken from a fund, someone owes it back","out")}
  cash:["Cash with me (expected)","All funds left minus handovers, advances, and adjustments. Main "+m(g.cashMain)+" · Fine "+m(g.cashFine)+". Expected physical cash."] ,
   ${c("hand","Given to principal",g.hand,"Held by the principal")}
   ${c("pers","Personal withdrawals",g.persOut,"Money taken for personal use. Must be repaid","out")}
   ${c("hold","Held by others",g.hold+g.adv,`Waiting for voucher ${m(g.hold)} · Advances ${m(g.adv)}`)}
   ${c("owedme","Owed to me",stillToGetBack(),`Principal ${m(principalOwesYou())} · Others ${m(othersOweYou())}`,"amber")}
   ${c("iowe","I owe others",g.iOweOthers,"Teachers and others, incl. student change")}
   ${c("owedprin","Due to principal",mustGivePrincipal(),"Main + Fine: collected minus real expenses minus given")}
   <div class="gl-card muted"><span class="card-label">Bank / bKash / Nagad</span><strong>Not tracked yet</strong><span class="card-sub">Account tracking is a later stage. No figure is shown rather than a made-up one.</span></div>
  </div>
  <div class="actions" style="margin-top:12px"><button class="btn primary" data-cash-count>Count cash now</button></div>
 </section>`;
}
export function glanceDetail(k){
 const g=glanceData(),m=money,F={
  received:["Total received","Money in across Regular, Fine and Principal's funds: collections, fines, restored fine money and custom 'money in' entries."],
  spent:["Spent from funds","Expenses you paid from a fund, teacher reimbursements you paid, and custom 'money out'. Money given and waiting for a voucher is NOT counted."],
  cash:["Cash with me (expected)","All funds left minus handovers, advances, and adjustments. Main "+m(g.cashMain)+" · Fine "+m(g.cashFine)+". Expected physical cash."] ,
  given:["Given to people","Custom entries where someone owes you, taken from a fund. Not an expense."],
  hand:["Given to principal","Sum of all active handovers."],hold:["Held by others","Money given to someone pending voucher, plus advances not yet returned or spent."],
  owedme:["Owed to me","Principal owes me + others owe me + money waiting for a voucher."],iowe:["I owe others","Teacher-paid expenses not reimbursed + custom 'I owe someone' entries still outstanding."],
  pers:["Personal withdrawals","Custom entries of type “I took personal money”, minus amounts repaid."],owedprin:["Due to principal","Main board + Fine board: collected − real expenses (including teacher-paid) − adjustments − money already given to the principal. Click a board card for the exact lines."]}[k];
 if(!F)return;
 const rows=ledger().filter(r=>(GL_KINDS[k]||["handover","custom","expense","adjustment"]).includes(r.kind)&&!DEAD.includes(r.status)).sort((x,y)=>y.date.localeCompare(x.date)).map(r=>[r.date||"—",esc(r.type),esc(r.desc),m(r.amount),esc(r.status)]);
 document.body.insertAdjacentHTML("beforeend",`<div class="modal-backdrop"><div class="modal"><div class="modal-head"><h2>${esc(F[0])}</h2><button class="btn small" data-close>×</button></div><div class="modal-body"><p>${esc(F[1])}</p>${rows.length?table(["Date","Type","Description","Amount","Status"],rows):'<div class="empty">No records for this figure.</div>'}</div></div></div>`);
 $$("[data-close]").forEach(b=>b.onclick=()=>$(".modal-backdrop")?.remove());
}
export function openCashCount(){
 const g=glanceData();
 document.body.insertAdjacentHTML("beforeend",`<div class="modal-backdrop"><div class="modal"><div class="modal-head"><h2>Count cash</h2><button class="btn small" data-close>×</button></div><form id="cc-form"><div class="modal-body"><p>Expected with you: <strong>${money(g.cash)}</strong></p><div class="form-grid"><div class="field"><label>Cash actually counted (৳)</label><input name="counted" type="number" step="0.01" min="0" required></div><div class="field full"><label>Note</label><input name="note"></div></div></div><div class="modal-foot"><button type="button" class="btn" data-close>Cancel</button><button class="btn primary">Save count</button></div></form></div></div>`);
 $$("[data-close]").forEach(b=>b.onclick=()=>$(".modal-backdrop")?.remove());
 $("#cc-form").onsubmit=e=>{e.preventDefault();const d=Object.fromEntries(new FormData(e.target).entries()),counted=num(d.counted),exp=g.cash;
  const rec={id:uid("CNT"),at:new Date().toISOString(),counted,expected:exp,diff:Math.round((counted-exp)*100)/100,note:d.note||""};
  state.cashCounts.push(rec);persist("Cash counted",rec.id,null,JSON.stringify(rec),rec.diff?`Difference ${rec.diff} left unadjusted`:"Matched");
  $(".modal-backdrop")?.remove();render();toast(rec.diff?`Difference of ${money(Math.abs(rec.diff))} recorded, not adjusted`:"Cash matches");};
}
