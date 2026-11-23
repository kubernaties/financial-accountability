/**
 * New dashboard: movable blocks (drag and drop, saved), colour styles, and the "People who owe me" list
 * that shows which fund each amount was given from. The Classic dashboard is still available.
 */
import {persist, state} from "../core/store.js";
import {$, $$, active, badge, esc, money, num, sum} from "../core/utils.js";
import {FINE, PRIN, REG, customList, customOutstanding, customRet, fundFlow, holdList, holdOutstanding, holdStatus} from "../finance/calculations.js";
import {glanceData} from "../finance/overview.js";
import {card, table} from "./components.js";
import {glance} from "./overview.js";
import {view} from "./view-state.js";
import {categoryBars, collectionBars, expenseSourceTable, fundTable, monthlyChart, personTable, principalPanel, voucherStatusCards} from "./widgets.js";
import {render} from "./shell.js";
import {bindBoards, boardsCore, boardsSection, month, monthName} from "./boards.js";
import {ENTRY_TYPES, addEntry} from "./inline-add.js";
import {closeRec} from "../finance/boards.js";
import {today} from "../core/utils.js";
import {BOARDS, boardMonth, boardTotals, mustGivePrincipal, obligations} from "../finance/boards.js";
import {openCustomReturn, openHoldReturn, openHoldSettle, openModal, openRepayment} from "./forms/index.js";

/** Dashboard styles (layouts). "new" = movable blocks (kept id for saved settings), "classic" = the original page. */
export const STYLES=[
 ["mock","Day by day (my design)","Header, add anything on any day, Where is every taka, Main and Fine boards, who owes whom, categories, vouchers, last 6 months."],
 ["smart","Smart (best of all)","The most useful parts of every style on one screen: big still-to-give, key figures, add-anything on the side, who owes you, boards that fold away, reports below."],
 ["focus","Focus (clean, what I need most)","Calm and simple: still to give, Main and Fine kept apart (or together), who owes you, quick add."],
 ["new","Movable blocks","Drag blocks to reorder them and hide what you do not need. Your own order, saved."],
 ["classic","Classic","The dashboard exactly as it was before."],
 ["essentials","Essentials","Only what you check every day: money in, money out, who owes you, quick actions."],
 ["tabs","Tabs","One topic at a time: Overview, Boards, Who owes me, Money, Reports."],
 ["accordion","Fold-away sections","Every block folds open and closed. The first three start open."],
 ["twocol","Two columns","Main figures on the left, who owes you and quick actions on the right."],
 ["compact","Compact","Smaller type and tighter spacing, so more fits on one screen."],
 ["large","Large and easy","Big numbers, big buttons, one column. Easiest on a phone."],
 ["hero","Big total","Total received as a large banner, then everything below it."],
 ["columns","Notice board","Blocks flow in two columns, like cards on a board."],
 ["jump","Quick jump","A menu stays at the top and jumps straight to any block."],
 ["story","Plain sentences","A short written summary first, then the blocks."]
];

export const SKINS=[["comfort","Eye comfort (soft dark)"],["default","Current theme"],["paper","Paper (light)"],["ledger","Ledger (dark, warm)"],["soft","Soft pastel"],["bold","Bold (black and yellow)"],["calm","Calm (green and cream)"]];

/** Saved dashboard settings, always in a safe shape. */
export function cfg(){
 const d=state.dash&&typeof state.dash==="object"?state.dash:(state.dash={});
 if(d.v!==4){d.v=4;d.style="mock";if(!d.skin||d.skin==="default")d.skin="comfort";}
 d.fineTogether=!!d.fineTogether;
 if(!STYLES.some(x=>x[0]===d.style))d.style="new";
 if(!SKINS.some(s=>s[0]===d.skin))d.skin="default";
 if(!Array.isArray(d.order))d.order=[];
 if(!Array.isArray(d.hidden))d.hidden=[];
 return d;
}

/** Everyone who holds money from you, with the fund it came from. Adds up to "Still to get back". */
export function owedRows(){
 const r=[];
 customList().filter(c=>c.direction==="Someone owes me").forEach(c=>{const o=customOutstanding(c);
  if(o>0)r.push({key:"c:"+c.id,name:c.label||c.party||"Other",who:c.party||"Custom entry",amount:o,given:num(c.amount),returned:customRet(c),fund:c.fund||"Not recorded",date:c.date||"",status:"Not returned",note:c.note||""});});
 holdList().forEach(h=>{const o=holdOutstanding(h);
  if(o>0)r.push({key:"h:"+h.id,name:h.recipient||"Someone",who:"Waiting for voucher",amount:o,given:num(h.amount),returned:sum(h.returns||[],"amount"),fund:h.fund||"Not recorded",date:h.date||"",status:holdStatus(h),note:h.purpose||""});});
 active(state.advances).forEach(a=>{const o=Math.max(0,num(a.amount)-num(a.returned)-num(a.spent)-sum(a.repayments||[],"amount"));
  if(o>0)r.push({key:"a:"+a.id,name:a.recipient||"Someone",who:"Advance",amount:o,given:num(a.amount),returned:num(a.returned),fund:REG,date:a.date||"",status:a.status||"Open",note:a.purpose||""});});
 const p=sum(active(state.adjustments).filter(a=>a.credit==="Principal payable"));
 if(p>0)r.push({key:"p:adj",name:"Principal",who:"Account adjustment",amount:p,given:p,returned:0,fund:REG,date:"",status:"Principal owes me",note:""});
 return r.sort((x,y)=>String(y.date).localeCompare(String(x.date)));
}
const fundChip=f=>badge(f,f===FINE?"amber":f===REG?"green":"blue");
const owedTotal=()=>sum(owedRows().map(x=>({amount:x.amount})));

function owedBlock(){
 const rows=owedRows();
 return `<div class="card owed"><div class="toolbar"><strong>People who owe me</strong><span class="out-text">${money(owedTotal())}</span></div>${rows.length?table(["Person","Amount","Given from","Date","Status",""],rows.map(x=>[`<strong>${esc(x.name)}</strong><div class="card-sub">${esc(x.who)}</div>`,`<strong class="out-text">${money(x.amount)}</strong>`,fundChip(x.fund),esc(x.date||"—"),esc(x.status),`<button class="btn small" data-owed="${esc(x.key)}">Details ›</button>`])):`<div class="empty">Nobody owes you money.</div>`}<div class="card-sub">Click Details to see exactly what was given, from which fund, and what came back.</div></div>`;
}
export function owedDetail(key){
 const x=owedRows().find(r=>r.key===key);if(!x)return;
 const row=(a,b)=>`<div class="rc-row"><span>${a}</span><span>${b}</span></div>`;
 const id=key.includes(":")?key.split(":")[1]:"";
 const kind=key.startsWith("c:")?"custom":key.startsWith("h:")?"hold":key.startsWith("a:")?"advance":"";
 const acts=[];
 if(kind==="custom")acts.push(`<button class="btn primary" data-od-act="custom-return" data-od-id="${esc(id)}">Record return</button>`);
 if(kind==="hold"){acts.push(`<button class="btn primary" data-od-act="hold-settle" data-od-id="${esc(id)}">Voucher received</button>`);acts.push(`<button class="btn" data-od-act="hold-return" data-od-id="${esc(id)}">Money returned</button>`);}
 if(kind==="advance")acts.push(`<button class="btn primary" data-od-act="repayment" data-od-id="${esc(id)}">Record repayment</button>`);
 if(kind&&kind!=="")acts.push(`<button class="btn" data-od-act="edit" data-od-kind="${kind}" data-od-id="${esc(id)}">Edit entry</button>`);
 document.body.insertAdjacentHTML("beforeend",`<div class="modal-backdrop"><div class="modal"><div class="modal-head"><h2>${esc(x.name)}</h2><button class="btn small" data-close>×</button></div><div class="modal-body"><div class="banner warn">Still owed to you: <strong>${money(x.amount)}</strong> · taken from <strong>${esc(x.fund)}</strong></div><div class="receipt">${row("Type",esc(x.who))}${row("Date given",esc(x.date||"—"))}${row("Amount given",money(x.given))}${row("Returned so far",money(x.returned))}${row("Outstanding",money(x.amount))}${row("Status",esc(x.status))}${x.note?row("Note",esc(x.note)):""}</div><p class="card-sub">This amount is not treated as an expense until a voucher or settlement is recorded.</p></div><div class="modal-foot">${acts.join("")}<button class="btn" data-close>Close</button></div></div></div>`);
 $$("[data-close]").forEach(b=>b.onclick=()=>$(".modal-backdrop")?.remove());
 $$("[data-od-act]").forEach(b=>b.onclick=()=>{
  const act=b.dataset.odAct,oid=b.dataset.odId;$(".modal-backdrop")?.remove();
  if(act==="custom-return")openCustomReturn(oid);
  else if(act==="hold-settle")openHoldSettle(oid);
  else if(act==="hold-return")openHoldReturn(oid);
  else if(act==="repayment")openRepayment(oid);
  else if(act==="edit")openModal(b.dataset.odKind,oid);
 });
}
const outCard=(l,v,s)=>`<div class="card out-card"><div class="card-label">${l}</div><div class="card-value out-text">▼ ${money(v)}</div><div class="card-sub">${esc(s)}</div></div>`;

/** Source ledger: show the original collection and every linked use/return below it. */
function sourceLedger(){
 const cols=active(state.collections).filter(c=>c.status!=="Void");
 const linkedRows=(collection)=>{
  const id=collection.id, fund=collection.category==="Fines"?FINE:REG;
  const expenses=active(state.expenses).filter(x=>x.sourceCollectionId===id);
  const handovers=active(state.handovers).filter(x=>x.sourceCollectionId===id);
  const loans=customList().filter(x=>x.sourceCollectionId===id&&x.direction==="Someone owes me");
  const lines=[];
  expenses.forEach(x=>lines.push(`<div class="src-child"><span><b class="out-text">Expense</b> · ${esc(x.date||"—")} · ${esc(x.description||x.category||"Expense")}</span><strong class="out-text">−${money(x.amount)}</strong></div>`));
  handovers.forEach(x=>lines.push(`<div class="src-child"><span><b>Given to principal</b> · ${esc(x.date||"—")}${x.recipient?" · "+esc(x.recipient):""}</span><strong>${money(x.amount)}</strong></div>`));
  loans.forEach(x=>{const back=customRet(x),out=customOutstanding(x);lines.push(`<div class="src-child"><span><b>Loan to ${esc(x.party||x.label||"someone")}</b> · ${esc(x.date||"—")} · Returned ${money(back)}</span><strong class="out-text">Still owed ${money(out)}</strong></div>`);});
  const total=num(collection.amount),used=expenses.filter(x=>x.actualPayer==="You"||!x.actualPayer).reduce((n,x)=>n+num(x.amount),0),hand=handovers.reduce((n,x)=>n+num(x.amount),0);
  const extra=Math.max(0,hand-(total-used));
  if(extra>0)lines.push(`<div class="src-child src-amber"><span><b>Principal owes you (extra handover)</b> · derived from this collection</span><strong>${money(extra)}</strong></div>`);
  return `<div class="src-group"><div class="src-head"><span><b>${esc(fund===FINE?"Fine income":"Main income")}</b> · ${esc(collection.collectionDate||"—")} · ${esc(collection.person||collection.description||"Collection")}</span><strong class="in-text">+${money(total)}</strong></div>${lines.length?lines.join(""):`<div class="src-child src-muted">No linked spending, handovers or loans yet.</div>`}<div class="src-foot">Linked records: expenses ${money(used)} · handovers ${money(hand)} · ${extra?`principal owes you ${money(extra)}`:`no calculated extra handover`}</div></div>`;
 };
 return `<div class="card source-ledger"><h3>Income and its movements</h3><p class="card-sub">Each collection is the parent. Linked expenses, handovers, loans, and repayments appear underneath it.</p>${cols.length?cols.map(linkedRows).join(""):`<div class="empty">No collections yet.</div>`}<div class="src-legend"><b>Outstanding balances:</b> people owe you ${money(owedTotal())} · you owe others ${money(obligations().totals.iOwe)}</div></div>`;
}

const BLOCKS=[
 ["received","Total received, Income, Fine",()=>{const g=glanceData(),pr=fundFlow(PRIN).inn;
  return `<div class="grid cards-4">${card("Total received",money(g.recv),"All money in, all funds")}${card("Income",money(fundFlow(REG).inn),"Regular fund")}${card("Fine",money(fundFlow(FINE).inn),"Fine fund")}${pr?card("Principal's money",money(pr),"Principal fund"):""}</div>`;}],
 ["owed","People who owe me",owedBlock],
 ["source-ledger","Income and its movements",sourceLedger],
 ["moneyout","Spent and given out",()=>`<div class="grid cards-2">${outCard("Spent from funds",glanceData().spentX,"Expenses only. Money given to people is not counted here")}${outCard("Given to people (they owe me)",owedTotal(),"Taken from a fund, still to come back or get a voucher")}</div>`],
 ["boards","Main and Fine boards",()=>boardsSection()],
 ["quick","Quick actions",()=>`<div class="actions quick"><button class="btn primary" data-modal="collection">+ Add collection</button><button class="btn primary" data-modal="expense">+ Add expense</button><button class="btn" data-modal="hold">Give money (waiting for voucher)</button><button class="btn" data-modal="handover">Give money to principal</button></div>`],
 ["glance","Where is every taka",()=>glance()],
 ["principal","Collected → Principal",()=>principalPanel()],
 ["funds","Where is the money (each fund)",()=>fundTable()],
 ["spending","Where the money was spent",()=>`${expenseSourceTable()}<br><div class="grid cards-2"><div class="card"><div class="card-label">Spending by category</div>${categoryBars()}</div><div class="card"><div class="card-label">Collections by category</div>${collectionBars()}</div></div>`],
 ["people","People: who owes what",()=>personTable()],
 ["months","Last 6 months",()=>`<div class="card">${monthlyChart()}</div>`],
 ["vouchers","Vouchers",()=>voucherStatusCards()]
];
export const blockOrder=()=>{const d=cfg(),ids=BLOCKS.map(b=>b[0]);return [...d.order.filter(i=>ids.includes(i)),...ids.filter(i=>!d.order.includes(i))];};

const blockById=id=>BLOCKS.find(x=>x[0]===id);
const plain=(id,extra="")=>{const b=blockById(id);return b?`<section class="dz" id="blk-${id}" data-block="${id}"${extra}>${b[2]()}</section>`:"";};
const plainAll=ids=>ids.map(id=>plain(id)).join("");
const ALL=()=>BLOCKS.map(b=>b[0]);
const TABS=[["overview","Overview",["received","moneyout","quick"]],["boards","Boards",["boards"]],["owed","Who owes me",["owed"]],["money","Money",["glance","principal","funds"]],["reports","Reports",["spending","people","months","vouchers"]]];


const shortFund=f=>f===FINE?"Fine":f===REG?"Main":esc(f);
function focusHtml(){
 const d=cfg(),m=month(),together=d.fineTogether,g=glanceData();
 const bm=BOARDS.map(b=>({b,o:boardMonth(b,m)})),T=k=>Math.round(bm.reduce((n,x)=>n+x.o[k],0)*100)/100;
 const sumO={still:T("still"),had:T("had"),spent:T("spent"),givenAll:T("givenAll"),cash:T("cash")};
 const rows=o=>`<div class="fx-rows"><div><span>Received this month</span><strong>${money(o.had)}</strong></div><div><span>Spent this month</span><strong class="out-text">${money(o.spent)}</strong></div><div><span>Given to principal so far</span><strong>${money(o.givenAll)}</strong></div><div><span>Cash on hand</span><strong>${money(o.cash)}</strong></div></div>`;
 const card=(title,chip,o,sub,fund)=>`<div class="fx-card"><div class="fx-title"><span>${title}</span><span class="fx-chip">${chip}</span></div><div class="fx-lab">Still to give</div><div class="fx-big">${money(o.still)}</div><div class="fx-sub">${sub}</div>${rows(o)}<div class="actions" style="margin-top:14px"><button class="btn primary" data-modal="handover"${fund?` data-preset-fund="${esc(fund)}"`:""}>Give to principal</button></div></div>`;
 const cards=together
  ?card("Main + Fine together","Shown as one",sumO,`Main ${money(bm[0].o.still)} · Fine ${money(bm[1].o.still)}. Only the display is combined; the records stay separate.`,"")
  :card("Main income","Priority",bm[0].o,"Primary operating funds.",bm[0].b.fund)+card("Fine","Fine money only",bm[1].o,"Kept separate. Usually handed to the principal at month end.",bm[1].b.fund);
 const ow=owedRows(),ob=obligations().totals;
 const people=ow.length?ow.map(x=>`<button class="fx-person" data-owed="${esc(x.key)}"><span class="fx-name"><strong>${esc(x.name)}</strong><span class="fx-sub">${esc(x.who)}${x.date?" · "+esc(x.date):""}</span></span><span class="fx-chip">from ${shortFund(x.fund)}</span><strong class="out-text">${money(x.amount)}</strong><span class="fx-go" aria-hidden="true">›</span></button>`).join(""):`<div class="empty">Nobody owes you money.</div>`;
 const quick=(label,p)=>`<button class="btn" data-modal="custom" ${Object.entries(p).map(([k,v])=>`data-preset-${k}="${esc(v)}"`).join(" ")}>${label}</button>`;
 return `<div class="fx">
 <div class="fx-top"><div class="fx-month"><button class="btn small" data-bd-month="-1" aria-label="Previous month">‹</button><strong>${esc(monthName(m))}</strong><button class="btn small" data-bd-month="1" aria-label="Next month">›</button></div>
  <div class="fx-seg" role="group" aria-label="Fine money"><button class="${together?"":"on"}" data-fine-mode="separate">Fine separate</button><button class="${together?"on":""}" data-fine-mode="together">Fine together</button></div></div>
 <div class="fx-boards">${cards}</div>
 <div class="fx-card"><div class="fx-title"><span>People who owe me</span><strong class="out-text fx-total">${money(owedTotal())}</strong></div><div class="fx-sub">Tap a name to see what was given, from which fund, and what came back.</div><div class="fx-list">${people}</div>
  ${ob.iOwe||ob.personal?`<div class="fx-sub fx-foot">I owe others ${money(ob.iOwe)} · Personal withdrawals ${money(ob.personal)}</div>`:""}</div>
 <div class="fx-card"><div class="fx-title"><span>Add</span></div><div class="actions fx-quick"><button class="btn primary" data-modal="collection">+ Collection</button><button class="btn primary" data-modal="expense">+ Expense</button>${quick("Someone took money",{direction:"Someone owes me",fund:REG,party:"Other"})}<button class="btn" data-modal="hold">Money on hold (no voucher)</button></div></div>
 <div class="fx-cash"><span>Cash with me (expected) <strong>${money(g.cash)}</strong>${g.last?` · counted ${money(g.last.counted)} on ${esc(g.last.at.slice(0,10))}`:" · never counted"}</span><button class="btn small" data-cash-count>Count cash</button></div>
 <details class="fx-more"><summary>Day-by-day details (Main and Fine boards)</summary>${boardsSection()}</details>
 </div>`;
}

const fineSeg=t=>`<div class="fx-seg" role="group" aria-label="Fine money"><button class="${t?"":"on"}" data-fine-mode="separate">Fine separate</button><button class="${t?"on":""}" data-fine-mode="together">Fine together</button></div>`;
function addCard(cls=""){
 const sel=(id,opts)=>`<select id="${id}">${opts.map(o=>`<option value="${o[0]}">${esc(o[1])}</option>`).join("")}</select>`;
 return `<div class="card mk-add ${cls}" id="blk-add"><h3>Add anything, on any day</h3><div class="card-sub">Pick any date, even an old one. Every balance after that date updates.</div>
  <div class="mk-form">${sel("mk-board",[["main","Main board"],["fine","Fine board"]])}<input type="date" id="mk-date" value="${today()}" aria-label="Date">${sel("mk-type",ENTRY_TYPES)}<input id="mk-who" placeholder="Who, e.g. Karim sir" aria-label="Who"><input id="mk-amt" type="number" min="1" step="1" placeholder="Amount" aria-label="Amount"><input id="mk-note" placeholder="Note" aria-label="Note"></div>
  <div class="actions" style="margin-top:10px"><button class="btn primary" id="mk-add">Add entry</button><span id="mk-err" class="card-sub out-text" role="alert"></span></div></div>`;
}

function smartHtml(){
 const d=cfg(),m=month(),together=d.fineTogether,g=glanceData();
 const bm=BOARDS.map(b=>boardMonth(b,m)),open=BOARDS.some(b=>closeRec(m,b)?.status!=="Closed"),ob=obligations().totals;
 const still=Math.round(bm.reduce((n,x)=>n+x.still,0)*100)/100;
 const ow=owedRows();
 const people=ow.length?ow.map(x=>`<button class="fx-person" data-owed="${esc(x.key)}"><span class="fx-name"><strong>${esc(x.name)}</strong><span class="fx-sub">${esc(x.who)}${x.date?" · "+esc(x.date):""}</span></span><span class="fx-chip">from ${shortFund(x.fund)}</span><strong class="out-text">${money(x.amount)}</strong><span class="fx-go" aria-hidden="true">›</span></button>`).join(""):`<div class="empty">Nobody owes you money.</div>`;
 const bcard=(t,chip,o,fund)=>`<div class="sm-board"><div class="fx-title"><span>${t}</span><span class="fx-chip">${chip}</span></div><div class="fx-lab">Still to give</div><div class="sm-num">${money(o.still)}</div><div class="fx-sub">Received ${money(o.had)} · Spent ${money(o.spent)} · Given ${money(o.givenAll)}</div><div class="actions" style="margin-top:10px"><button class="btn small primary" data-modal="handover" data-preset-fund="${esc(fund)}">Give to principal</button></div></div>`;
 const kpi=(l,v,sub,cls="",key="")=>`<button type="button" class="sm-kpi"${key?` data-glance="${key}"`:""}><span class="card-label">${l}</span><strong class="${cls}">${v}</strong><span class="card-sub">${esc(sub)}</span></button>`;
 return `<div class="sm">
 <div class="card sm-top"><div class="mk-title"><button class="btn small" data-bd-month="-1" aria-label="Previous month">‹</button><strong>${esc(monthName(m))}</strong><button class="btn small" data-bd-month="1" aria-label="Next month">›</button><span class="badge ${open?"amber":"green"}">Round ${open?"open":"finished"}</span></div>
  <div class="actions">${fineSeg(together)}<button class="btn" data-jump="add">+ Add entry</button><button class="btn" data-print>Print / PDF</button><button class="btn" data-cash-count>Count cash</button></div></div>
 ${g.warn.length?`<div class="banner warn">${g.warn.map(w=>`<div>⚠ ${esc(w)}</div>`).join("")}</div>`:""}
 <div class="sm-hero"><div class="sm-main"><div class="fx-lab">Still to give the principal</div><div class="sm-big">${money(still)}</div>
   <div class="sm-split">${together?`<span>Main ${money(bm[0].still)} + Fine ${money(bm[1].still)} shown together</span>`:`<span>Main <strong>${money(bm[0].still)}</strong></span><span>Fine <strong>${money(bm[1].still)}</strong></span>`}</div></div>
  <div class="sm-kpis">${kpi("Total received",money(g.recv),"All boards","","received")}${kpi("Spent",money(g.spentX),"Expenses only","out-text","spent")}${kpi("Cash with me",money(g.cash),g.last?"Counted "+money(g.last.counted):"Never counted","","cash")}${kpi("Owed to me",money(owedTotal()),"People who owe me","out-text","owedme")}${kpi("I owe others",money(ob.iOwe),"Teachers, change","","iowe")}${kpi("Personal withdrawals",money(ob.personal),"Must be repaid","","pers")}</div></div>
 ${together?"":`<div class="sm-boards">${bcard("Main income","Priority",bm[0],BOARDS[0].fund)}${bcard("Fine","Fine money only",bm[1],BOARDS[1].fund)}</div>`}
 ${sourceLedger()}
 <div class="sm-cols"><div class="sm-left">
   ${sourceLedger()}
 <details class="fx-more sm-fold" open><summary>Day by day: Main and Fine boards</summary>${boardsCore()}</details>
   <details class="fx-more sm-fold"><summary>Where is every taka?</summary>${glance()}</details>
  </div><aside class="sm-right">
   ${addCard()}
   <div class="card"><div class="fx-title"><span>People who owe me</span><strong class="out-text fx-total">${money(owedTotal())}</strong></div><div class="fx-sub">Tap a name. Given from which fund, and what came back.</div><div class="fx-list">${people}</div></div>
  </aside></div>
 <div class="grid cards-2"><div class="card"><h3>Spending by category</h3>${categoryBars()}</div><div class="card"><h3>Collections by category</h3>${collectionBars()}</div></div>
 <div class="grid cards-2"><div class="card"><h3>Vouchers</h3>${voucherStatusCards()}</div><div class="card"><h3>Last 6 months</h3>${monthlyChart()}</div></div>
 </div>`;
}

/** "Where is every taka?" exactly as in the design: banners first, then the bar, legend and nine figure cards. */
function mockGlance(){
 const board=view.dashboardBoard||"main",fund=board==="fine"?FINE:REG,b=BOARDS.find(x=>x.id===board),bt=boardTotals(b),m=money;
 const title=board==="fine"?"Fine":"Main";
 // Use one consistent source (board events) so income, expenses, cash, given and over-given always agree.
 const received=bt.received||0,spent=bt.spent||0,cash=bt.cash,given=bt.given||0,still=bt.still,over=bt.overGiven,should=bt.should;
 const owed=owedRows().filter(r=>r.fund===fund&&!r.key.startsWith("p:")).reduce((n,r)=>n+r.amount,0);
 const parts=[["Cash in this board",cash,"c1"],["Spent",spent,"c2"],["Given to principal",given,"c3"],["Owed back to me",owed,"c5"]];
 const tot=Math.max(1,parts.reduce((n,p)=>n+Math.max(0,p[1]),0));
 const c=(l,v,sub,cls="",calc="")=>`<button type="button" class="gl-card ${cls}"${calc?` data-calc="${calc}"`:""}><span class="card-label">${l}</span><strong>${m(v)}</strong><span class="card-sub">${esc(sub)}</span></button>`;
 const toggle=`<div class="mk-board-switch" role="tablist" aria-label="Choose board"><button class="btn ${board==="main"?"primary":""}" data-board-overview="main" role="tab" aria-selected="${board==="main"}">Main</button><button class="btn ${board==="fine"?"primary":""}" data-board-overview="fine" role="tab" aria-selected="${board==="fine"}">Fine</button></div>`;
 const remaining=over>0
  ?c("Principal owes me (over-given)",over,`You handed over ${m(given)} but only ${m(Math.max(0,should))} was due · difference ${m(over)}`,"amber",`${b.id}:still`)
  :c("Still to give principal",still,`Should give ${m(should)} · Already given ${m(given)}`,"",`${b.id}:still`);
 return `${toggle}<div class="card mkg"><h3>Where is every taka? · ${title}</h3>
  <div class="gl-bar" role="img" aria-label="${title} money distribution">${parts.map(p=>`<span class="seg mkg-${p[2]}" style="width:${(Math.max(0,p[1])/tot*100).toFixed(2)}%" title="${esc(p[0])} ${m(p[1])}"></span>`).join("")}</div>
  <div class="gl-legend">${parts.map(p=>`<span><i class="dot mkg-${p[2]}"></i>${esc(p[0])}: <strong>${m(p[1])}</strong></span>`).join("")}</div>
  <div class="mkg-grid">${c(`${title} income`,received,`Collected into ${title} only`,"",`${b.id}:had`)}${c(`${title} expenses`,spent,"Expenses from this board only (you / teacher / voucher)","",`${b.id}:spent`)}${c(`${title} cash`,cash,"Cash belonging to this board only","",`${b.id}:cash`)}${c("Given to principal",given,`${title} board only`,"",`${b.id}:given`)}${remaining}${c("People owe me",owed,`${title} money lent / held by others`)}</div>
  <p class="card-sub" style="margin-top:10px">Tap any figure for the line-by-line breakdown. Expenses only count when the payer is You, Teacher, or a settled voucher — not money given on hold or personal withdrawals.</p>
 </div>`;
}

function mockHtml(){
 const d=cfg(),m=month(),together=d.fineTogether,g=glanceData();
 const bms=BOARDS.map(b=>boardMonth(b,m)),open=BOARDS.some(b=>closeRec(m,b)?.status!=="Closed");
 const sumStill=Math.round(bms.reduce((n,x)=>n+x.still,0)*100)/100;
 const combined=together?`<div class="card mk-comb"><strong>Main + Fine together</strong><div class="fx-big">${money(sumStill)}</div><div class="card-sub">Still to give. Main ${money(bms[0].still)} · Fine ${money(bms[1].still)}. Display only — the records stay separate.</div></div>`:"";
 return `<div class="mk">
 <div class="card mk-head"><div><div class="mk-title"><strong>${esc(monthName(m))}</strong></div><div class="card-sub">Round ${open?"open":"finished"}. All amounts in ৳. Click any card, row or person for full details.</div></div>
  <div class="actions">${fineSeg(together)}<button class="btn" data-print>Print / PDF report</button><button class="btn" data-cash-count>Count cash now</button></div></div>
 ${addCard()}
 ${combined}${mockGlance()}
 ${sourceLedger()}
 ${boardsCore()}
 <div class="grid cards-2"><div class="card"><h3>Spending by category</h3>${categoryBars()}</div><div class="card"><h3>Collections by category</h3>${collectionBars()}</div></div>
 <div class="grid cards-2"><div class="card"><h3>Vouchers</h3>${voucherStatusCards()}</div><div class="card"><h3>Bank, bKash, Nagad</h3><div class="card-sub">Not tracked yet. No figure shown rather than a made-up one.</div></div></div>
 <div class="card"><h3>Last 6 months</h3>${monthlyChart()}</div>
 </div>`;
}

/** One function per layout. Each reuses the same blocks, so every figure agrees in every style. */
const LAYOUTS={
 mock:mockHtml,
 smart:smartHtml,
 focus:focusHtml,
 essentials:()=>plainAll(["received","moneyout","owed","quick"]),
 tabs:()=>{const cur=TABS.some(t=>t[0]===view.dashTab)?view.dashTab:"overview",t=TABS.find(x=>x[0]===cur);
  return `<div class="dash-tabs" role="tablist">${TABS.map(x=>`<button class="btn${x[0]===cur?" primary":""}" role="tab" aria-selected="${x[0]===cur}" data-dtab="${x[0]}">${x[1]}</button>`).join("")}</div>${plainAll(t[2])}`;},
 accordion:()=>ALL().map((id,i)=>`<details class="dz acc" id="blk-${id}"${i<3?" open":""}><summary>${esc(blockById(id)[1])}</summary>${blockById(id)[2]()}</details>`).join(""),
 twocol:()=>`<div class="dash-two"><div>${plainAll(["received","moneyout","boards","funds","principal"])}</div><div>${plainAll(["owed","quick","people"])}</div></div>${plainAll(["glance","spending","months","vouchers"])}`,
 compact:()=>plainAll(ALL()),
 large:()=>plainAll(["received","moneyout","owed","quick","boards","funds"]),
 hero:()=>{const g=glanceData();
  return `<div class="dash-hero"><div class="card-label">Total received</div><div class="big">${money(g.recv)}</div><div class="card-sub">Income ${money(fundFlow(REG).inn)} · Fine ${money(fundFlow(FINE).inn)}${fundFlow(PRIN).inn?` · Principal's money ${money(fundFlow(PRIN).inn)}`:""}</div></div>${plainAll(ALL().filter(x=>x!=="received"))}`;},
 columns:()=>`<div class="dash-cols">${plainAll(ALL())}</div>`,
 jump:()=>`<nav class="dash-jump" aria-label="Jump to a block">${ALL().map(id=>`<button class="btn small" data-jump="${id}">${esc(blockById(id)[1])}</button>`).join("")}</nav>${plainAll(ALL())}`,
 story:()=>{const g=glanceData();
  return `<div class="card story"><p>You received <strong>${money(g.recv)}</strong> in total.</p><p>You spent <strong class="out-text">${money(g.spentX)}</strong> on real expenses.</p><p><strong class="out-text">${money(owedTotal())}</strong> was given to people and should come back.</p><p>You should be holding <strong>${money(g.cash)}</strong> in cash.</p></div><br>${plainAll(ALL())}`;}
};

function galleryPanel(cur){
 return `<div class="style-gallery">${STYLES.map(x=>`<div class="card style-card${x[0]===cur?" current":""}"><strong>${esc(x[1])}</strong>${x[0]===cur?` <span class="badge green">Your default</span>`:""}<div class="card-sub">${esc(x[2])}</div><button class="btn small${x[0]===cur?"":" primary"}" data-pick-style="${x[0]}"${x[0]===cur?" disabled":""}>${x[0]===cur?"In use":"Use this style"}</button></div>`).join("")}</div>`;
}

/** The dashboard page: a small settings bar, then the chosen style. The style you pick is your saved default. */
export function dashboardShell(classicHtml){
 const d=cfg(),movable=d.style==="new"&&!classicHtml,edit=!!view.editLayout&&movable,opt=(v,l,cur)=>`<option value="${v}"${v===cur?" selected":""}>${l}</option>`;
 const bar=`<div class="dash-bar"><label>Dashboard style <select id="dash-style">${STYLES.map(x=>opt(x[0],esc(x[1]),d.style)).join("")}</select></label><button class="btn" id="dash-gallery">${view.dashGallery?"Hide styles":"Browse styles"}</button>${d.style==="mock"?fineSeg(d.fineTogether):""}${classicHtml?"":`<label>Colors <select id="dash-skin">${SKINS.map(s=>opt(s[0],s[1],d.skin)).join("")}</select></label>`}${movable?`<button class="btn" id="dash-edit">${edit?"Done":"Edit layout"}</button>${edit?`<button class="btn" id="dash-reset">Reset layout</button>`:""}`:""}</div>${view.dashGallery?galleryPanel(d.style):""}`;
 if(classicHtml)return bar+classicHtml;
 let body;
 if(movable){
  body=blockOrder().map(id=>{const b=blockById(id),hid=d.hidden.includes(id);if(hid&&!edit)return "";
   return `<section class="dz${hid?" is-hidden":""}" data-block="${id}">${edit?`<div class="dz-bar"><span class="dz-grip" title="Drag to move">⠿ ${esc(b[1])}</span><span class="actions"><button class="btn small" data-move="-1" data-block="${id}" aria-label="Move up">▲</button><button class="btn small" data-move="1" data-block="${id}" aria-label="Move down">▼</button><button class="btn small" data-hide="${id}">${hid?"Show":"Hide"}</button></span></div>`:""}${b[2]()}</section>`;}).join("");
  if(edit)body=`<div class="banner">Drag a block by its title, or use ▲ ▼ on a phone. Hide what you do not need. Every change is saved automatically.</div><br>${body}`;
 }else body=(LAYOUTS[d.style]||LAYOUTS.compact)();
 const page=`<div class="dash${edit?" editing":""}" data-skin="${d.skin}" data-layout="${d.style}">${body}</div>`;
 /* The design style opens exactly like the design: no bar on top. Style, colours and Fine switch sit in a fold-away panel at the very end. */
 if(d.style==="mock")return page+`<details class="fx-more mk-styles"><summary>Change month or dashboard style</summary><div class="dash-bar"><button class="btn" data-bd-month="-1">‹ Previous month</button><button class="btn" data-bd-month="1">Next month ›</button></div>${bar}</details>`;
 return `${bar}${page}`;
}

/** Wires the settings bar, style gallery, tabs, quick jump, owed-to-me details and drag-and-drop. */
export function bindDashboard(){
 const d=cfg(),save=()=>{persist();render();};
 const setStyle=v=>{d.style=v;view.editLayout=false;save();};
 $("#dash-style")?.addEventListener("change",e=>setStyle(e.target.value));
 $("#dash-gallery")?.addEventListener("click",()=>{view.dashGallery=!view.dashGallery;render();});
 $$("[data-pick-style]").forEach(b=>b.onclick=()=>{view.dashGallery=false;setStyle(b.dataset.pickStyle);});
 $("#dash-skin")?.addEventListener("change",e=>{d.skin=e.target.value;save();});
 $("#dash-edit")?.addEventListener("click",()=>{view.editLayout=!view.editLayout;render();});
 $("#dash-reset")?.addEventListener("click",()=>{if(!confirm("Put every block back in its original place and show all of them?"))return;d.order=[];d.hidden=[];save();});
 $$("[data-fine-mode]").forEach(b=>b.onclick=()=>{d.fineTogether=b.dataset.fineMode==="together";save();});
 $$("[data-board-overview]").forEach(b=>b.onclick=()=>{view.dashboardBoard=b.dataset.boardOverview;render();});
 $("#mk-add")?.addEventListener("click",()=>{const v=id=>$("#"+id)?.value;const err=addEntry({board:v("mk-board"),date:v("mk-date"),type:v("mk-type"),who:v("mk-who"),amount:v("mk-amt"),note:v("mk-note")});if(err&&$("#mk-err"))$("#mk-err").textContent=err;});
 $$("[data-dtab]").forEach(b=>b.onclick=()=>{view.dashTab=b.dataset.dtab;render();});
 $$("[data-jump]").forEach(b=>b.onclick=()=>document.getElementById("blk-"+b.dataset.jump)?.scrollIntoView({behavior:"smooth",block:"start"}));
 $$("[data-owed]").forEach(b=>b.onclick=()=>owedDetail(b.dataset.owed));
 bindBoards();
 if(!view.editLayout||d.style!=="new")return;
 const place=(id,to)=>{const o=blockOrder().filter(x=>x!==id);o.splice(Math.max(0,Math.min(o.length,to)),0,id);d.order=o;save();};
 $$("[data-move]").forEach(b=>b.onclick=()=>{const o=blockOrder(),i=o.indexOf(b.dataset.block),j=i+Number(b.dataset.move);if(i>=0&&j>=0&&j<o.length)place(b.dataset.block,j);});
 $$("[data-hide]").forEach(b=>b.onclick=()=>{const id=b.dataset.hide;d.hidden=d.hidden.includes(id)?d.hidden.filter(x=>x!==id):[...d.hidden,id];save();});
 let drag=null;
 $$(".dz").forEach(el=>{
  el.draggable=true;
  el.addEventListener("dragstart",e=>{drag=el.dataset.block;el.classList.add("dragging");if(e.dataTransfer){e.dataTransfer.effectAllowed="move";e.dataTransfer.setData("text/plain",drag);}});
  el.addEventListener("dragend",()=>el.classList.remove("dragging"));
  el.addEventListener("dragover",e=>e.preventDefault());
  el.addEventListener("drop",e=>{e.preventDefault();const to=el.dataset.block;if(!drag||drag===to)return;place(drag,blockOrder().filter(x=>x!==drag).indexOf(to));});
 });
}
