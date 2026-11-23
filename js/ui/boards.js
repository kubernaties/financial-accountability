/**
 * Main and Fine boards on the dashboard: month navigation, day-by-day rows, "still need to give",
 * finish accountability, who owes whom, and a detail window for every row and card.
 */
import {persist, state} from "../core/store.js";
import {$, $$, esc, money, today} from "../core/utils.js";
import {BOARDS, EXPENSE_KINDS, KINDS, boardMonth, breakdown, closeId, closeRec, eventByKey, obligations} from "../finance/boards.js";
import {openCustomReturn, openHoldReturn, openHoldSettle, openModal, openReimbursement, openRepayment, voidRecord} from "./forms/index.js";
import {view} from "./view-state.js";
import {render} from "./shell.js";

export const month=()=>view.boardMonth||(view.boardMonth=today().slice(0,7));
const shift=(m,d)=>{const x=new Date(Number(m.slice(0,4)),Number(m.slice(5,7))-1+d,1);return `${x.getFullYear()}-${String(x.getMonth()+1).padStart(2,"0")}`;};
export const monthName=m=>new Date(Number(m.slice(0,4)),Number(m.slice(5,7))-1,1).toLocaleString("en-GB",{month:"long",year:"numeric"});
const dayName=d=>d==="0000-00-00"?"No date":new Date(d+"T00:00:00").toLocaleDateString("en-GB",{day:"2-digit",month:"short",year:"numeric"});
const tag=k=>`<span class="bd-tag bd-${KINDS[k][1]}">${esc(KINDS[k][0])}</span>`;
const cashText=e=>e.cash>0?`+${money(e.cash)}`:e.cash<0?`−${money(-e.cash)}`:`${money(e.v)} · no cash moved`;
const cashCls=e=>e.k==="gp"?"bd-blue-t":e.k==="hd"?"bd-amber-t":e.cash>0?"bd-pos":e.cash<0?"bd-neg":"bd-zero";
const shouldEffect=e=>Math.round((e.should-e.given)*100)/100;

function row(e){
 return `<button class="bd-row" data-ev="${esc(e.key)}">${tag(e.k)}<span class="bd-desc">${esc(e.desc)}${e.who?`<span class="bd-who"> · ${esc(e.who)}</span>`:""}</span><span class="bd-amt ${cashCls(e)}">${cashText(e)}</span><span class="bd-go" aria-hidden="true">›</span></button>`;
}
function metric(label,value,attrs="",cls=""){return `<div class="bd-m ${cls}" ${attrs}><span class="bd-ml">${label}</span><strong>${value}</strong></div>`;}

function boardHtml(b,m){
 const closed=closeRec(m,b)?.status==="Closed",rec=closeRec(m,b),bm=boardMonth(b,m);
 const late=closed&&rec.closedAt?bm.days.flatMap(d=>d.rows).filter(e=>e.ts&&e.ts>rec.closedAt).length:0;
 let status;
 if(closed)status=`<div class="bd-status bd-ok"><strong>Accountability finished</strong><span>${new Date(rec.closedAt).toLocaleDateString("en-GB")}. Leftover ${money(rec.still||0)} carries into the next month as opening balance.</span></div>`;
 else if(bm.still<=0.005&&(bm.givenAll>0||bm.should>0))status=`<div class="bd-status bd-wait"><strong>All money is given to the principal</strong><span>Confirm accountability, then this month is done.</span></div>`;
 else status=`<div class="bd-status bd-open"><strong>Given ${money(bm.givenAll)}. Still need to give ${money(bm.still)}</strong><span>Accountability is open.</span></div>`;
 const warn=[];
 if(bm.neg.length)warn.push(`Cash goes below zero on ${bm.neg.map(dayName).join(", ")}. Something was spent or given that is not backed by recorded money.`);
 if(late)warn.push(`${late} entr${late>1?"ies were":"y was"} added or changed after accountability was finished. Reopen to check again.`);
 const opening=bm.open.cash||bm.open.still?`<div class="bd-open-row"><span>Opening balance carried from earlier months</span><span>Cash ${money(bm.open.cash)} · Still to give ${money(bm.open.still)}</span></div>`:"";
 const days=bm.days.map(d=>`<div class="bd-day"><span>${dayName(d.d)}</span><span>Day spent ${money(d.spent)}</span></div>${d.rows.map(row).join("")}<div class="bd-left"><span>Left after ${dayName(d.d)}</span><strong>${money(d.left)}</strong></div>`).join("")||`<div class="empty">No entries in ${esc(monthName(m))}.</div>`;
 return `<div class="card bd-board ${b.id==="main"?"bd-main":""}"><div class="bd-head"><h3>${b.id==="main"?"1. ":"2. "}${esc(b.title)}</h3><span class="bd-pill">${b.id==="main"?"Priority":"Fine money only"}</span></div>
 ${warn.map(w=>`<div class="banner warn">⚠ ${esc(w)}</div>`).join("")}
 <div class="bd-metrics">${metric("Money I had this month",money(bm.had),`data-calc="${b.id}:had"`)}${metric("Expenses this month",money(bm.spent),`data-calc="${b.id}:spent"`)}${metric("Given to principal (this month)",money(bm.given),`data-calc="${b.id}:given"`)}${metric("Cash left",money(bm.cash),`data-calc="${b.id}:cash"`)}${metric("Still need to give",money(bm.still),`data-calc="${b.id}:still"`,"bd-hl")}</div>
 ${opening}${days}${status}
 <div class="actions bd-actions"><button class="btn primary" data-modal="handover" data-preset-fund="${esc(b.fund)}">Give to principal</button>${closed?`<button class="btn" data-bd-reopen="${b.id}">Reopen</button>`:`<button class="btn" data-bd-close="${b.id}">Finish accountability</button>`}</div></div>`;
}

let OB=[];
function oblRows(list,cls){
 return list.length?list.map(x=>{OB.push(x);return `<button class="bd-row" data-ob="${OB.length-1}"><span class="bd-desc"><strong>${esc(x.name)}</strong><span class="bd-who"> · ${esc(x.sub||x.kind)} · ${esc(x.fund.replace(" fund",""))}</span></span><span class="bd-amt ${cls}">${money(x.amount)}</span><span class="bd-go" aria-hidden="true">›</span></button>`;}).join(""):`<div class="empty">Nobody.</div>`;
}
function obligationsHtml(){
 OB=[];const o=obligations();
 return `<div class="grid cards-3 bd-obl"><div class="card"><div class="toolbar"><strong>Owed to me</strong><span class="bd-pos">${money(o.totals.owedMe)}</span></div>${oblRows(o.owedMe,"bd-pos")}<div class="card-sub">Loans, change, money waiting for a voucher, advances.</div></div>
 <div class="card"><div class="toolbar"><strong>I owe others</strong><span class="bd-neg">${money(o.totals.iOwe)}</span></div>${oblRows(o.iOwe,"bd-neg")}<div class="card-sub">Teachers who paid for the college, change I owe students.</div></div>
 <div class="card"><div class="toolbar"><strong>My personal take</strong><span class="bd-neg">${money(o.totals.personal)}</span></div>${oblRows(o.personal,"bd-neg")}<div class="card-sub">Money I took for myself. It must be put back.</div></div></div>`;
}

/** The whole boards section (used by both dashboard styles). */
export function boardsSection(){
 const m=month(),bms=BOARDS.map(b=>boardMonth(b,m)),sh=bms.reduce((n,x)=>n+x.should,0),gv=bms.reduce((n,x)=>n+x.givenAll,0),st=Math.round((sh-gv)*100)/100;
 const quick=(label,kind,p)=>`<button class="btn" data-modal="${kind}" ${Object.entries(p).map(([k,v])=>`data-preset-${k}="${esc(v)}"`).join(" ")}>${label}</button>`;
 return `<section class="bd-section"><div class="bd-nav"><div class="actions"><button class="btn small" data-bd-month="-1" aria-label="Previous month">‹</button><strong class="bd-month">${esc(monthName(m))}</strong><button class="btn small" data-bd-month="1" aria-label="Next month">›</button><button class="btn small" data-bd-month="0">This month</button></div><button class="btn small" data-print>Print / PDF</button></div>
 <div class="bd-quick actions">
  <button class="btn primary" data-modal="collection">+ Collection</button><button class="btn primary" data-modal="expense">+ Expense</button>
  ${quick("Someone took money","custom",{direction:"Someone owes me",fund:"Regular fund",party:"Other"})}
  ${quick("I took personal money","custom",{direction:"I took personal money",fund:"Regular fund",party:"Other"})}
  ${quick("Change I owe","custom",{direction:"I owe someone",fund:"Regular fund",party:"Student"})}
  ${quick("Change owed to me","custom",{direction:"Someone owes me",fund:"Regular fund",party:"Student"})}
  <button class="btn" data-modal="hold">Money on hold (no voucher)</button></div>
 <div class="bd-total"><div><span>Should give principal</span><strong>${money(sh)}</strong></div><div><span>Already given</span><strong>${money(gv)}</strong></div><div class="bd-hl"><span>Still need to give (Main + Fine)</span><strong>${money(st)}</strong></div></div>
 ${BOARDS.map(b=>boardHtml(b,m)).join("")}${obligationsHtml()}</section>`;
}

/** Just the two boards and the owed lists (no month bar, no quick buttons). Used by the "Day by day" style. */
export function boardsCore(){const m=month();return `${BOARDS.map(b=>boardHtml(b,m)).join("")}${obligationsHtml()}`;}

const modal=(title,body,buttons=[])=>{
 $(".modal-backdrop")?.remove();
 document.body.insertAdjacentHTML("beforeend",`<div class="modal-backdrop"><div class="modal"><div class="modal-head"><h2>${esc(title)}</h2><button class="btn small" data-close>×</button></div><div class="modal-body">${body}</div><div class="modal-foot">${buttons.map((b,i)=>`<button class="btn ${b.cls||""}" data-bdact="${i}">${esc(b.label)}</button>`).join("")}<button class="btn" data-close>Close</button></div></div></div>`);
 $$("[data-close]").forEach(x=>x.onclick=()=>$(".modal-backdrop")?.remove());
 $$("[data-bdact]").forEach(x=>x.onclick=()=>{$(".modal-backdrop")?.remove();buttons[Number(x.dataset.bdact)].run();});
};
const rc=(a,b)=>`<div class="rc-row"><span>${a}</span><span>${b}</span></div>`;

function eventDetail(key){
 const e=eventByKey(key);if(!e)return;const s=e.src,eff=shouldEffect(e);
 const x=[];
 x.push(rc("Date",esc(dayName(e.d))),rc("Board",e.key.startsWith("fine")?"Fine":"Main income"),rc("Type",esc(KINDS[e.k][0])),rc("Description",esc(e.desc)));
 if(e.who)x.push(rc("Who",esc(e.who)));
 if(e.cat)x.push(rc("Category",esc(e.cat)));
 x.push(rc("Amount",money(e.v)),rc("Effect on cash",esc(cashText(e))),rc("Effect on still need to give",eff===0?"None":(eff>0?"+":"−")+money(Math.abs(eff))));
 if(e.sk==="expense"){x.push(rc("Paid by",esc(s.actualPayer||"You")),rc("Voucher number",esc(s.voucherNumber||"Not recorded")));}
 if(e.sk==="handover")x.push(rc("Accountability status",esc(s.status||"Pending")));
 if(e.sk==="hold")x.push(rc("Voucher status","Waiting for voucher until you press Voucher received"));
 if(e.ts)x.push(rc("Recorded",esc(new Date(e.ts).toLocaleString("en-GB"))));
 const b=[];
 if(e.sk==="hold"){b.push({label:"Voucher received",cls:"primary",run:()=>openHoldSettle(s.id)},{label:"Money returned",run:()=>openHoldReturn(s.id)});}
 if(e.sk==="custom"&&["lt","lr","ow","op","per","pr"].includes(e.k))b.push({label:e.k.startsWith("lt")||e.k==="lr"?"Money came back":e.k==="per"||e.k==="pr"?"I put it back":"I paid back",cls:"primary",run:()=>openCustomReturn(s.id)});
 if(e.k==="tp"||e.k==="rb")b.push({label:"Pay teacher back",run:()=>openReimbursement(s.id)});
 if(e.sk==="advance")b.push({label:"Advance repayment",run:()=>openRepayment(s.id)});
 b.push({label:"Edit entry",run:()=>openModal(e.sk,s.id)},{label:"Void entry",cls:"danger",run:()=>voidRecord(e.sk,s.id)});
 modal(KINDS[e.k][0],`<div class="receipt">${x.join("")}</div><p class="card-sub">Voiding keeps the record in the history. Every figure on the dashboard updates straight away.</p>`,b);
}
function obligationDetail(i){
 const x=OB[i];if(!x)return;const s=x.src,b=[];
 const lines=[rc("Type",esc(x.kind)),rc("Who",esc(x.name)),rc("Detail",esc(x.sub||"—")),rc("Fund",esc(x.fund)),rc("Date",esc(x.date||"—")),rc("Amount still open",money(x.amount))];
 if(x.sk==="custom")b.push({label:x.kind==="Took money"?"Money came back":x.kind==="Personal take"?"I put it back":"I paid back",cls:"primary",run:()=>openCustomReturn(s.id)});
 if(x.sk==="hold")b.push({label:"Voucher received",cls:"primary",run:()=>openHoldSettle(s.id)},{label:"Money returned",run:()=>openHoldReturn(s.id)});
 if(x.sk==="advance")b.push({label:"Advance repayment",cls:"primary",run:()=>openRepayment(s.id)});
 if(x.sk==="expense")b.push({label:"Pay teacher back",cls:"primary",run:()=>openReimbursement(s.id)});
 if(x.sk!=="adjustment")b.push({label:"Edit entry",run:()=>openModal(x.sk,s.id)});
 modal(x.name,`<div class="receipt">${lines.join("")}</div>${x.netted?`<p class="card-sub">This is already taken off "Still need to give", so you give the principal that much less.</p>`:""}`,b);
}
function calcDetail(id,what){
 const b=BOARDS.find(z=>z.id===id),bm=boardMonth(b,month()),ev=bm.upto,inM=ev.filter(e=>e.d.slice(0,7)===month());
 const field={cash:"cash",still:"should",had:"v",spent:"v",given:"given"}[what];
 let src=ev,title={cash:"Where your cash comes from and goes",still:"How still need to give is calculated",had:"Money received this month",spent:"Expenses this month",given:"Given to principal this month"}[what],extra="";
 let lines;
 if(what==="had")lines=breakdown(inM.filter(e=>["in","fin","mi"].includes(e.k)),"v");
 else if(what==="spent")lines=breakdown(inM.filter(e=>EXPENSE_KINDS.includes(e.k)),"v");
 else if(what==="given")lines=breakdown(inM,"given");
 else lines=breakdown(src,field);
 const sign=(v,k)=>what==="had"||what==="spent"||what==="given"?money(v):(v>0?"+":"−")+money(Math.abs(v));
 let body=lines.length?lines.map(l=>rc(esc(l.label),sign(l.value,l.k))).join(""):rc("No entries","");
 if(what==="still")extra=rc("= Should give principal",`<strong>${money(bm.should)}</strong>`)+rc("− Already given",money(bm.givenAll))+rc("= Still need to give",`<strong>${money(bm.still)}</strong>`);
 if(what==="cash")extra=rc("= Cash left",`<strong>${money(bm.cash)}</strong>`)+`<p class="card-sub">Cash carries over from earlier months. Count it with Cash Counter to compare with this figure.</p>`;
 modal(`${b.title}: ${title}`,`<div class="receipt">${body}${extra}</div>`);
}

function finish(id){
 const b=BOARDS.find(z=>z.id===id),m=month(),bm=boardMonth(b,m);
 const msg=bm.still>0.005?`You still hold ${money(bm.still)} for the principal on the ${b.title}. It will carry into the next month as opening balance.\n\nFinish accountability for ${monthName(m)}?`:`All money on the ${b.title} is accounted for.\n\nFinish accountability for ${monthName(m)}?`;
 if(!confirm(msg))return;
 const now=new Date().toISOString(),rec={id:closeId(m,b),month:m,fund:b.fund,status:"Closed",closedAt:now,updatedAt:now,cash:bm.cash,still:bm.still};
 state.boardClose=state.boardClose||[];const i=state.boardClose.findIndex(r=>r.id===rec.id);
 if(i>=0)state.boardClose[i]={...state.boardClose[i],...rec};else state.boardClose.push(rec);
 persist("Accountability finished",rec.id,null,JSON.stringify(rec),`${b.title} ${m}`);render();
}
function reopen(id){
 const b=BOARDS.find(z=>z.id===id),m=month(),r=closeRec(m,b);if(!r)return;
 if(!confirm(`Reopen ${b.title} for ${monthName(m)}? The history is kept.`))return;
 const before=JSON.stringify(r);r.status="Open";r.updatedAt=new Date().toISOString();
 persist("Accountability reopened",r.id,before,JSON.stringify(r),`${b.title} ${m}`);render();
}
export function bindBoards(){
 $$("[data-bd-month]").forEach(b=>b.onclick=()=>{const d=Number(b.dataset.bdMonth);view.boardMonth=d===0?today().slice(0,7):shift(month(),d);render();});
 $$("[data-ev]").forEach(b=>b.onclick=()=>eventDetail(b.dataset.ev));
 $$("[data-ob]").forEach(b=>b.onclick=()=>obligationDetail(Number(b.dataset.ob)));
 $$("[data-calc]").forEach(b=>b.onclick=()=>{const [id,w]=b.dataset.calc.split(":");calcDetail(id,w);});
 $$("[data-bd-close]").forEach(b=>b.onclick=()=>finish(b.dataset.bdClose));
 $$("[data-bd-reopen]").forEach(b=>b.onclick=()=>reopen(b.dataset.bdReopen));
}
