/**
 * Dashboard and report building blocks: fund table, person table, charts, principal panel, 'how it is calculated' table, page summaries.
 */
import {state} from "../core/store.js";
import {$, active, badge, esc, money, num, sum} from "../core/utils.js";
import {FINE, PRIN, REG, advanceNetOut, advanceOutstanding, cashPaidExpenses, customList, customOutstanding, expenseTotal, fineCollected, finePending, fineRestored, fineRestoredByAdjustment, fineUsed, fundFlow, fundList, handoverTotal, holdList, holdOutstanding, holdTotal, moneyInHand, othersOweYou, owedToOthers, principalOwesYou, regularCollections, stillToGetBack} from "../finance/calculations.js";
import {collectionItems, expenseItems, flowItems, groupSum} from "../finance/reporting.js";
import {bars, card, table, toolbar} from "./components.js";
import {view} from "./view-state.js";
import {BOARDS, boardTotals, mustGivePrincipal} from "../finance/boards.js";

export function calcExplain(){
 const coll=regularCollections()+fineCollected(),hand=handoverTotal(),paid=cashPaidExpenses();
 const adj=sum(active(state.adjustments).filter(a=>a.credit==="Principal payable"));
 const lefts=fundList().reduce((n,f)=>n+fundFlow(f).left,0),adv=advanceNetOut(),fra=fineRestoredByAdjustment();
 const owe=mustGivePrincipal();
 const m=money,r=(a,h,v)=>[`<strong>${a}</strong>`,h,`<strong>${m(v)}</strong>`];
 return table(["Number","How it is calculated","Amount"],[
  r("Money collected",`Regular ${m(regularCollections())} + Fines ${m(fineCollected())}`,coll),
  r("Money spent",`Confirmed expenses only. Money given and waiting for a voucher (${m(holdTotal())}) is not included`,expenseTotal()),
  r("Money with me now",`All funds left ${m(lefts)} − Given to principal ${m(hand)} − Advances out ${m(adv)}${fra?` − Fine restored by adjustment ${m(fra)}`:""}`,moneyInHand()),
  r("I must give principal",`Main board and Fine board: collected − real expenses (yours and teacher-paid)${adj?` − Adjustments ${m(adj)}`:""} − Given to principal ${m(hand)}`,owe),
  r("Still to get back (total)",`Principal owes me ${m(principalOwesYou())} + Others owe me ${m(othersOweYou())} + Waiting for voucher ${m(holdTotal())}`,stillToGetBack()),
  r("Not given yet",`Collected ${m(coll)} − Given to principal ${m(hand)}`,Math.max(0,coll-hand)),
  r("Fine money left",`Fines ${m(fineCollected())} + Restored ${m(fineRestored())} − Fine fund spending, holds and moves`,fundFlow(FINE).left),
  r("Fine money to put back",`Fine money used ${m(fineUsed())} − Restored ${m(fineRestored())}`,finePending()),
  r("Each fund: Left",`Money in − Spent − Waiting for voucher + Moved in − Moved out (see the fund table)`,lefts),
  r("Advances not returned",`Given − Returned − Spent − Repayments`,advanceOutstanding()),
  r("I must pay teachers back",`Teacher-paid expenses − Reimbursed`,owedToOthers())
 ]);
}
export function principalPanel(){
 const coll=regularCollections()+fineCollected(),paid=cashPaidExpenses(),hand=handoverTotal();
 const adj=sum(active(state.adjustments).filter(a=>a.credit==="Principal payable"));
 const total=BOARDS.reduce((n,b)=>n+boardTotals(b).should,0),remaining=mustGivePrincipal(),extra=Math.round((total-(coll-paid-adj))*100)/100;
 const pct=total>0?Math.min(100,Math.max(0,hand/total*100)):0;
 const waiting=holdTotal(),pendV=active(state.vouchers).filter(v=>v.verification==="Pending");
 const covered=new Set(active(state.handovers).flatMap(h=>h.collectionDates||[]));
 const days=new Map(),day=d=>{if(!days.has(d))days.set(d,{c:0,s:0});return days.get(d);};
 collectionItems().forEach(i=>{if(i.date)day(i.date).c+=i.amount;});
 active(state.expenses).filter(x=>x.actualPayer==="You").forEach(x=>{if(x.date)day(x.date).s+=num(x.amount);});
 const dates=[...days.keys()].sort().reverse(),notCovered=dates.filter(d=>days.get(d).c>0&&!covered.has(d));
 let tone="ok",msg;
 if(coll===0&&hand===0)msg="No money collected yet. Add a collection when you receive money.";
 else if(hand>total&&total>=0&&remaining<=0&&hand-total>0.005){tone="warn";msg=`You gave the principal ${money(hand-total)} more than collected minus spending. Please check your handovers or add an adjustment.`;}
 else if(remaining<=0.005)msg="All settled. You have given the principal everything. Nothing is left to give.";
 else msg=`You still have to give the principal ${money(remaining)}. Every taka is recorded, nothing is lost.`;
 const row=(l,v,b,cls="")=>`<div class="rc-row ${cls}"><span>${l}</span><span>${b?`<strong>${money(v)}</strong>`:money(v)}</span></div>`;
 const chk=(ok,t)=>`<div class="chk ${ok?"ok":"wait"}"><span>${ok?"✓":"!"}</span><span>${t}</span></div>`;
 const dayRows=dates.map(d=>{const x=days.get(d),g=x.c-x.s;return [d,money(x.c),money(x.s),`<strong>${money(g)}</strong>`,x.c<=0?"—":covered.has(d)?badge("Given ✓","green"):badge("Not given yet","amber")];});
 const dc=[...days.values()].reduce((a,x)=>({c:a.c+x.c,s:a.s+x.s}),{c:0,s:0});
 if(dayRows.length)dayRows.push([`<strong>Total</strong>`,`<strong>${money(dc.c)}</strong>`,`<strong>${money(dc.s)}</strong>`,`<strong>${money(dc.c-dc.s)}</strong>`,""]);
 const hov=[...active(state.handovers)].sort((a,b)=>String(b.date).localeCompare(String(a.date))).slice(0,5).map(h=>[h.date,esc(h.recipient||"Principal"),money(h.amount),badge(h.status||"Pending",h.status==="Accounted"?"green":"blue")]);
 return `<div class="card principal-panel">
  <div class="pp-title">Collected → Principal <span class="card-sub">(accountability)</span></div>
  <div class="banner ${tone}">${esc(msg)}</div>
  <div class="receipt">
   ${row("Money collected",coll)}
   ${row("− Spent (you paid, keep vouchers)",paid)}
   ${adj?row("− Adjustments",adj):""}
   ${Math.abs(extra)>0.005?row("± Teacher-paid expenses, money moved, other entries",extra):""}
   ${row("= Total to give principal",total,true,"line")}
   ${row("− Already given to principal",hand)}
   ${row("= STILL TO GIVE",remaining,true,"big")}
  </div>
  <div class="progress" aria-label="Given so far"><div class="progress-fill" style="width:${pct.toFixed(1)}%"></div></div>
  <div class="card-sub">${pct.toFixed(0)}% given to the principal</div>
  <div class="actions" style="margin:14px 0"><button class="btn primary" data-modal="handover">Give money to principal</button><button class="btn" data-route="accountability">Accountability periods</button><button class="btn" data-route="handovers">All handovers</button></div>
  <div class="card-label" style="margin:16px 0 8px">Check before you give</div>
  ${chk(pendV.length===0,pendV.length?`${pendV.length} voucher(s) not verified yet (${money(sum(pendV))})`:"All vouchers are verified")}
  ${chk(waiting<=0,waiting>0?`${money(waiting)} was given to someone and is waiting for a voucher or return`:"No money waiting for vouchers")}
  ${chk(notCovered.length===0,notCovered.length?`${notCovered.length} collection day(s) not covered by a handover yet`:"Every collection day is covered by a handover")}
  ${chk(state.periods.filter(p=>p.status!=="Closed").length===0,state.periods.filter(p=>p.status!=="Closed").length?`${state.periods.filter(p=>p.status!=="Closed").length} accountability period(s) still open`:"No open accountability periods")}
  ${dayRows.length?`<div class="card-label" style="margin:18px 0 8px">Day by day: collected and spent</div>${table(["Date","Collected","Spent (you paid)","To give","Handover"],dayRows)}`:""}
  ${hov.length?`<div class="card-label" style="margin:18px 0 8px">Latest handovers to principal</div>${table(["Date","To","Amount","Status"],hov)}`:""}
 </div>`;
}
export function monthlyChart(){
 const now=new Date(),months=[];
 for(let i=5;i>=0;i--){const x=new Date(now.getFullYear(),now.getMonth()-i,1);months.push(`${x.getFullYear()}-${String(x.getMonth()+1).padStart(2,"0")}`);}
 const items=flowItems();
 const data=months.map(m=>({m,inn:sum(items.filter(i=>i.kind==="in"&&i.date.startsWith(m))),exp:sum(items.filter(i=>i.kind==="exp"&&i.date.startsWith(m)))}));
 const max=Math.max(1,...data.flatMap(d=>[d.inn,d.exp]));
 return `<div class="vchart">${data.map(d=>`<div class="vcol"><div class="vbars"><div class="vbar in" title="Collected ${money(d.inn)}" style="height:${(d.inn/max*100).toFixed(1)}%"></div><div class="vbar exp" title="Expenses ${money(d.exp)}" style="height:${(d.exp/max*100).toFixed(1)}%"></div></div><div class="vlabel">${d.m.slice(2)}</div></div>`).join("")}</div><div class="legend"><span class="dot in"></span> Collected <span class="dot exp"></span> Expenses</div>`;
}
export function fundTable(){
 const flows=fundList().map(f=>[f,fundFlow(f)]);
 const z={inn:0,out:0,hold:0,tin:0,tout:0,left:0,back:0};
 const T=flows.reduce((a,[,x])=>{for(const k in z)a[k]+=x[k];return a;},{...z});
 const showHold=flows.some(([,x])=>x.hold),showMove=flows.some(([,x])=>x.tin||x.tout),showBack=flows.some(([,x])=>x.back);
 const head=["Fund","Money in","Spent / given out"];if(showHold)head.push("Waiting for voucher");if(showMove)head.push("Moved in","Moved out");head.push("Left");if(showBack)head.push("To get back");
 const row=(l,x)=>{const r=[`<strong>${esc(l)}</strong>`,money(x.inn),money(x.out)];if(showHold)r.push(money(x.hold));if(showMove)r.push(money(x.tin),money(x.tout));r.push(`<strong>${money(x.left)}</strong>`);if(showBack)r.push(x.back?money(x.back):"—");return r;};
 const rows=flows.map(([f,x])=>row(f,x));rows.push(row("All funds together",T));
 return table(head,rows);
}
export function expenseSourceTable(){
 const items=expenseItems(),funds=[REG,FINE,PRIN,"Other fund","No fund"];
 const mk=(l,list,b)=>[b?`<strong>${esc(l)}</strong>`:esc(l),`<strong>${money(sum(list))}</strong>`,money(sum(list.filter(i=>i.payer==="You"))),money(sum(list.filter(i=>i.payer==="Teacher"))),money(sum(list.filter(i=>i.payer==="Principal")))];
 const rows=funds.map(f=>[f,items.filter(i=>i.fund===f)]).filter(([f,l])=>l.length||[REG,FINE,PRIN].includes(f)).map(([f,l])=>mk(f,l));
 rows.push(mk("All expenses",items,true));
 return table(["Fund source","Total expenses","Paid by you","Paid by teacher","Paid by principal"],rows);
}
export function categoryBars(){return bars(groupSum(expenseItems(),i=>i.category).map(([l,v])=>({label:l,value:v,kind:"red"})));}
export function collectionBars(){return bars(groupSum(collectionItems(),i=>i.cat).map(([l,v])=>({label:l,value:v,kind:l==="Fines"?"amber":"green"})));}
export function personTable(){
 const m=new Map(),add=(n,k,v)=>{if(!v)return;const key=n||"Unnamed";if(!m.has(key))m.set(key,{owesMe:0,iOwe:0,hold:0});m.get(key)[k]+=v;};
 add("Principal","owesMe",principalOwesYou());add("Principal","iOwe",mustGivePrincipal());
 customList().forEach(c=>{if(c.party==="Principal")return;
  if(c.direction==="Someone owes me")add(c.party||"Other","owesMe",customOutstanding(c));
  if(c.direction==="I owe someone")add(c.party||"Other","iOwe",customOutstanding(c));});
 active(state.advances).forEach(a=>add(a.recipient,"owesMe",Math.max(0,num(a.amount)-num(a.returned)-num(a.spent)-sum(a.repayments||[],"amount"))));
 active(state.expenses).filter(x=>x.actualPayer==="Teacher"&&!["Paid","N/A"].includes(x.reimbursementStatus||"")).forEach(x=>add("Teacher","iOwe",Math.max(0,num(x.amount)-num(x.reimbursedAmount))));
 holdList().forEach(h=>add(h.recipient,"hold",holdOutstanding(h)));
 const rows=[...m.entries()].map(([n,b])=>[`<strong>${esc(n)}</strong>`,money(b.owesMe),money(b.iOwe),money(b.hold)]);
 return table(["Person","Owes you","You owe","Holding your money (pending voucher)"],rows);
}
export function voucherStatusCards(){
 const v=active(state.vouchers),by=s=>v.filter(x=>x.verification===s);
 return `<div class="grid cards-4">${card("Vouchers",v.length,money(sum(v))+" total")}${["Verified","Pending","Rejected"].map(s=>card(s+" vouchers",by(s).length,money(sum(by(s))))).join("")}</div>`;
}
export function collectionSummary(){
 const rows=groupSum(collectionItems(),i=>i.cat).map(([c,v])=>[esc(c),money(v)]);
 rows.push([`<strong>Total collected</strong>`,`<strong>${money(regularCollections()+fineCollected())}</strong>`]);
 return `<div class="grid cards-4">${card("Total collected",money(regularCollections()+fineCollected()),"Regular + fines")}${card("Regular collection",money(regularCollections()),"Every category except fines")}${card("Fine collection",money(fineCollected()),"Collections and fine page")}${card("Records",active(state.collections).length,"Active collections")}</div><br>${table(["Category","Subtotal"],rows)}<br>`;
}
export function expenseSummary(){
 return `<div class="grid cards-4">${card("Total expenses",money(expenseTotal()),"Confirmed expenses only")}${card("Paid by you",money(cashPaidExpenses()),"From money you hold")}${card("On hold (not expenses)",money(holdTotal()),"Until vouchers arrive")}${card("Pending reimbursements",money(owedToOthers()),"Teacher-paid expenses")}</div><br>${expenseSourceTable()}<br>`;
}
export function handoverSummary(){
 const l=active(state.handovers);
 return `<div class="grid cards-4">${card("Handed to principal",money(handoverTotal()),"All handovers")}${card("Not yet handed over",money(Math.max(0,regularCollections()+fineCollected()-handoverTotal())),"Collected minus handed over")}${card("Allocated",money(sum(l.filter(x=>x.allocated))),"To collection dates")}${card("Unallocated",money(sum(l.filter(x=>!x.allocated))),"Not yet allocated")}</div><br>`;
}


export function voucherSummary(){
 const day=active(state.vouchers).filter(v=>v.date===view.voucherDate);
 const by=st=>day.filter(v=>v.verification===st);
 return `<div class="card"><div class="toolbar"><strong>Daily voucher register</strong><div class="actions"><input type="date" id="voucher-date" value="${esc(view.voucherDate)}" aria-label="Voucher date"></div></div><div class="grid cards-4">${card("Vouchers",day.length,"On this date")}${card("Total value",money(sum(day)),"All vouchers that day")}${card("Verified / Pending / Rejected",`${by("Verified").length} / ${by("Pending").length} / ${by("Rejected").length}`,"Counts")}${card("Verified value",money(sum(by("Verified"))),"Verified vouchers only")}</div></div><br>`;
}
