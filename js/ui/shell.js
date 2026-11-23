/**
 * App frame: sidebar navigation, page rendering, routing and wiring buttons on each page to their actions.
 */
import {report} from "../core/errors.js";
import {bindLogs} from "./logs-page.js";
import {bindCounter} from "./cash-counter.js";
import {bindDemo} from "./demo-page.js";
import {pageView} from "../services/logger.js";
import {download, toast} from "../core/feedback.js";
import {persist, state} from "../core/store.js";
import {$, $$, active, esc, today} from "../core/utils.js";
import {closeMonth, closePeriod, exportCSV, importJSON, openCustomReturn, openDay, openHoldReturn, openHoldSettle, openModal, openReimbursement, openRepayment, openVoucherFile, reopenMonth, reopenPeriod, reverseRecord, voidRecord} from "./forms/index.js";
import {glance, glanceDetail, openCashCount} from "./overview.js";
import {bindDashboard} from "./dashboard-layout.js";
import {getPage} from "./pages/index.js";
import {bindSettings} from "./settings.js";
import {view} from "./view-state.js";
import * as Sync from "../services/github-sync.js";

export const nav=[
 ["dashboard","Dashboard"],["calendar","Calendar"],["transactions","Transactions"],
 ["collections","Collections"],["expenses","Expenses"],["vouchers","Vouchers"],
 ["holds","Money on Hold"],["fines","Fine Management"],["handovers","Handovers"],["transfers","Move Money"],["advances","Advances"],["custom","Custom Entries"],
 ["adjustments","Adjustments"],["accountability","Accountability"],
 ["reports","Reports"],["monthly","Monthly Reports"],["audit","Audit History"],["cashcounter","Cash Counter"],["logs","Activity and Bug Log"],["demo","New Features and Demo"],["settings","Settings"]
];

export function app(){
 document.documentElement.dataset.theme=state.theme||"dark";
 document.querySelector("#app").innerHTML=`
 <div class="app-shell"><aside class="sidebar" id="sidebar">
 <div class="brand"><span class="brand-mark">FA</span><span>Financial Manager</span></div>
 <nav class="nav">${nav.map(([key,label])=>`<button class="nav-button ${view.route===key?"active":""}" data-route="${key}">${label}</button>`).join("")}</nav>
 </aside><main class="main"><header class="topbar"><div class="topbar-left"><button class="btn small menu-toggle" id="menu">☰</button><h1 id="page-title"></h1></div>
 <div class="topbar-right"><button class="theme-switch" id="theme-switch" title="Switch theme">${state.theme==="dark"?"☀ Light":"☾ Dark"}</button><span class="sync-status" id="sync-status">${esc(Sync.label())} · ${esc(state.users.find(u=>u.id===state.currentUser)?.name||"Owner")}</span></div></header>
 <section class="content" id="content"></section></main></div>`;
 $$(".nav-button").forEach(b=>b.onclick=()=>navigate(b.dataset.route));
 $("#menu").onclick=()=>$("#sidebar").classList.toggle("open");
 $("#theme-switch").onclick=()=>{state.theme=state.theme==="dark"?"light":"dark";persist("Theme changed","","",state.theme);render();};
 render();
}
export function navigate(r){view.route=r;location.hash=r;render();}
window.addEventListener("hashchange",()=>{view.route=location.hash.slice(1)||"dashboard";render();});

export function render(){
 const item=nav.find(x=>x[0]===view.route);$("#page-title").textContent=item?item[1]: "Dashboard";
 try{$("#content").innerHTML=getPage(view.route)();bindPage();addSearch();}
 catch(e){report(e,"Page "+view.route);
  $("#content").innerHTML=`<div class="card"><h3>This page could not be shown</h3><p>${esc(e.message)}</p><p class="card-sub">Your data is safe. The problem was saved in the Activity and Bug Log.</p><div class="actions"><button class="btn primary" id="err-backup">Download a backup</button><button class="btn" data-route="dashboard">Dashboard</button><button class="btn" data-route="logs">Open bug log</button></div></div>`;
  $("#err-backup")?.addEventListener("click",()=>download("financial-backup-error.json",JSON.stringify(state,null,2),"application/json"));
  $$("[data-route]").forEach(b=>b.onclick=()=>navigate(b.dataset.route));}
 pageView(view.route);
 $("#sidebar")?.classList.remove("open");
}
export function addSearch(){
 $$("#content .table-wrap").forEach(w=>{
  if(!w.querySelector("tbody tr:nth-child(6)"))return;
  const box=document.createElement("input");box.type="search";box.placeholder="Search this list...";box.className="list-search";box.setAttribute("aria-label","Search this list");
  w.before(box);
  box.oninput=()=>{const q=box.value.trim().toLowerCase();$$("tbody tr",w).forEach(r=>{r.hidden=!!q&&!r.textContent.toLowerCase().includes(q);});};
 });
}
export function bindPage(){
 $$("[data-route]").forEach(b=>b.onclick=()=>navigate(b.dataset.route));
 $$("[data-modal]").forEach(b=>b.onclick=()=>{const p={},ds=b.dataset;
  if(ds.presetCategory)p.category=ds.presetCategory;if(ds.presetFund)p.fund=ds.presetFund;if(ds.presetDirection)p.direction=ds.presetDirection;if(ds.presetParty)p.party=ds.presetParty;
  openModal(ds.modal,undefined,Object.keys(p).length?p:null);});
 $$("[data-export-csv]").forEach(b=>b.onclick=()=>exportCSV(view.route));
 $$("[data-export-json],#export-all").forEach(b=>b.onclick=()=>download("financial-backup.json",JSON.stringify(state,null,2),"application/json"));
 $$("[data-import-json]").forEach(b=>b.onclick=()=>importJSON());
 $$("[data-print]").forEach(b=>b.onclick=()=>window.print());
 $$("[data-voucher-file]").forEach(b=>b.onclick=()=>openVoucherFile(b.dataset.voucherFile));

 $$("[data-edit]").forEach(b=>b.onclick=()=>openModal(b.dataset.edit,b.dataset.id));
 $$("[data-void]").forEach(b=>b.onclick=()=>voidRecord(b.dataset.void,b.dataset.id));
 $$("[data-reverse]").forEach(b=>b.onclick=()=>reverseRecord(b.dataset.reverse,b.dataset.id));
 $$("[data-repayment]").forEach(b=>b.onclick=()=>openRepayment(b.dataset.repayment));
 $$("[data-custom-return]").forEach(b=>b.onclick=()=>openCustomReturn(b.dataset.customReturn));
 $$("[data-hold-settle]").forEach(b=>b.onclick=()=>openHoldSettle(b.dataset.holdSettle));
 $$("[data-hold-return]").forEach(b=>b.onclick=()=>openHoldReturn(b.dataset.holdReturn));
 $$("[data-toggle-calc]").forEach(b=>b.onclick=()=>{view.showCalc=!view.showCalc;render();});
 $$("[data-report-mode]").forEach(b=>b.onclick=()=>{view.reportMode=b.dataset.reportMode;render();});
 $("#tx-type")?.addEventListener("change",e=>{view.txf.type=e.target.value;render();});
 $("#tx-from")?.addEventListener("change",e=>{view.txf.from=e.target.value;render();});
 $("#tx-to")?.addEventListener("change",e=>{view.txf.to=e.target.value;render();});
 $("#tx-clear")?.addEventListener("click",()=>{view.txf={type:"",from:"",to:""};render();});
 $$("[data-reimburse]").forEach(b=>b.onclick=()=>openReimbursement(b.dataset.reimburse));
 $$("[data-reopen]").forEach(b=>b.onclick=()=>reopenPeriod(b.dataset.reopen));
 $$("[data-close-period]").forEach(b=>b.onclick=()=>closePeriod(b.dataset.closePeriod));
 $$("[data-reopen-month]").forEach(b=>b.onclick=()=>reopenMonth(b.dataset.reopenMonth));
 $$("[data-close-month]").forEach(b=>b.onclick=()=>closeMonth(b.dataset.closeMonth));

 $$("[data-month]").forEach(b=>b.onclick=()=>{
  const delta=Number(b.dataset.month);
  if(delta===0)view.calendarCursor=new Date();
  else view.calendarCursor=new Date(view.calendarCursor.getFullYear(),view.calendarCursor.getMonth()+delta,1);
  render();
 });
 const confirm=$("[data-confirm-nothing]");
 if(confirm)confirm.onclick=()=>{
  const d=prompt("Confirm full day with no activity (YYYY-MM-DD)",today());
  if(d&&!state.reconfirmedDates.includes(d)){state.reconfirmedDates.push(d);persist("Nothing happened confirmed",d);render();toast("Day confirmed");}
 };
 $$(".day[data-date]").forEach(d=>d.onclick=()=>openDay(d.dataset.date));
 $("#voucher-date")?.addEventListener("change",e=>{view.voucherDate=e.target.value||today();render();});
 $$("[data-glance]").forEach(b=>b.onclick=()=>glanceDetail(b.dataset.glance));
 $$("[data-cash-count]").forEach(b=>b.onclick=openCashCount);
 $$("[data-glance]").forEach(b=>b.onclick=()=>glanceDetail(b.dataset.glance));
 $$("[data-cash-count]").forEach(b=>b.onclick=openCashCount);
 if(view.route==="dashboard")bindDashboard();
 if(view.route==="logs")bindLogs();
 if(view.route==="cashcounter")bindCounter();
 if(view.route==="demo")bindDemo();
 if(view.route==="settings")bindSettings();
}
