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
import {bindBoards, boardsSection} from "./boards.js";

/** Dashboard styles (layouts). "new" = movable blocks (kept id for saved settings), "classic" = the original page. */
export const STYLES=[
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

export const SKINS=[["default","Current theme"],["paper","Paper (light)"],["ledger","Ledger (dark, warm)"],["soft","Soft pastel"],["bold","Bold (black and yellow)"],["calm","Calm (green and cream)"]];

/** Saved dashboard settings, always in a safe shape. */
export function cfg(){
 const d=state.dash&&typeof state.dash==="object"?state.dash:(state.dash={});
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
  if(o>0)r.push({key:"a:"+a.id,name:a.recipient||"Someone",who:"Advance",amount:o,given:num(a.amount),returned:num(a.returned),fund:"Not recorded",date:a.date||"",status:a.status||"Open",note:a.purpose||""});});
 const p=sum(active(state.adjustments).filter(a=>a.credit==="Principal payable"));
 if(p>0)r.push({key:"p:adj",name:"Principal",who:"Account adjustment",amount:p,given:p,returned:0,fund:"Not recorded",date:"",status:"Principal owes me",note:""});
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
 document.body.insertAdjacentHTML("beforeend",`<div class="modal-backdrop"><div class="modal"><div class="modal-head"><h2>${esc(x.name)}</h2><button class="btn small" data-close>×</button></div><div class="modal-body"><div class="banner warn">Still owed to you: <strong>${money(x.amount)}</strong> · taken from <strong>${esc(x.fund)}</strong></div><div class="receipt">${row("Type",esc(x.who))}${row("Date given",esc(x.date||"—"))}${row("Amount given",money(x.given))}${row("Returned so far",money(x.returned))}${row("Status",esc(x.status))}${x.note?row("Note",esc(x.note)):""}</div><p class="card-sub">This money is not counted as an expense until a voucher turns it into one.</p></div></div></div>`);
 $$("[data-close]").forEach(b=>b.onclick=()=>$(".modal-backdrop")?.remove());
}
const outCard=(l,v,s)=>`<div class="card out-card"><div class="card-label">${l}</div><div class="card-value out-text">▼ ${money(v)}</div><div class="card-sub">${esc(s)}</div></div>`;

const BLOCKS=[
 ["received","Total received, Income, Fine",()=>{const g=glanceData(),pr=fundFlow(PRIN).inn;
  return `<div class="grid cards-4">${card("Total received",money(g.recv),"All money in, all funds")}${card("Income",money(fundFlow(REG).inn),"Regular fund")}${card("Fine",money(fundFlow(FINE).inn),"Fine fund")}${pr?card("Principal's money",money(pr),"Principal fund"):""}</div>`;}],
 ["owed","People who owe me",owedBlock],
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

/** One function per layout. Each reuses the same blocks, so every figure agrees in every style. */
const LAYOUTS={
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
 const bar=`<div class="dash-bar"><label>Dashboard style <select id="dash-style">${STYLES.map(x=>opt(x[0],esc(x[1]),d.style)).join("")}</select></label><button class="btn" id="dash-gallery">${view.dashGallery?"Hide styles":"Browse styles"}</button>${classicHtml?"":`<label>Colors <select id="dash-skin">${SKINS.map(s=>opt(s[0],s[1],d.skin)).join("")}</select></label>`}${movable?`<button class="btn" id="dash-edit">${edit?"Done":"Edit layout"}</button>${edit?`<button class="btn" id="dash-reset">Reset layout</button>`:""}`:""}</div>${view.dashGallery?galleryPanel(d.style):""}`;
 if(classicHtml)return bar+classicHtml;
 let body;
 if(movable){
  body=blockOrder().map(id=>{const b=blockById(id),hid=d.hidden.includes(id);if(hid&&!edit)return "";
   return `<section class="dz${hid?" is-hidden":""}" data-block="${id}">${edit?`<div class="dz-bar"><span class="dz-grip" title="Drag to move">⠿ ${esc(b[1])}</span><span class="actions"><button class="btn small" data-move="-1" data-block="${id}" aria-label="Move up">▲</button><button class="btn small" data-move="1" data-block="${id}" aria-label="Move down">▼</button><button class="btn small" data-hide="${id}">${hid?"Show":"Hide"}</button></span></div>`:""}${b[2]()}</section>`;}).join("");
  if(edit)body=`<div class="banner">Drag a block by its title, or use ▲ ▼ on a phone. Hide what you do not need. Every change is saved automatically.</div><br>${body}`;
 }else body=(LAYOUTS[d.style]||LAYOUTS.compact)();
 return `${bar}<div class="dash${edit?" editing":""}" data-skin="${d.skin}" data-layout="${d.style}">${body}</div>`;
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
