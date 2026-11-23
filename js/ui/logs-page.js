/**
 * Activity & Bug Log screen: traffic (with IP summary), bugs, security events and sync problems,
 * each in its own tab. Shows this device plus any device logs loaded from GitHub.
 */
import {esc, badge, $, $$} from "../core/utils.js";
import {download, toast} from "../core/feedback.js";
import {table, card} from "./components.js";
import {view} from "./view-state.js";
import {getLogs, clearLogs, upload, deviceId} from "../services/logger.js";
import * as Sync from "../services/github-sync.js";
import {render} from "./shell.js";
let remote=[];
const TABS={traffic:["Traffic",e=>e.kind==="visit"||e.kind==="page"],bugs:["Bugs & errors",e=>e.kind==="bug"],security:["Security",e=>e.kind==="security"],sync:["Sync problems",e=>e.kind==="sync"],all:["Everything",()=>true]};
const all=()=>{const m=new Map();[...remote,...getLogs()].forEach(e=>m.set(e.id,e));return [...m.values()].sort((a,b)=>b.t.localeCompare(a.t));};
const when=t=>new Date(t).toLocaleString();
const lvl=l=>badge(l,l==="error"?"red":l==="warn"?"amber":"blue");
function ipSummary(list){const m=new Map();
 list.forEach(e=>{const r=m.get(e.ip)||{n:0,dev:new Set(),ag:new Set(),pg:new Set(),first:e.t,last:e.t};r.n++;r.dev.add(e.device);r.ag.add(e.agent);r.pg.add(e.page);if(e.t<r.first)r.first=e.t;if(e.t>r.last)r.last=e.t;m.set(e.ip,r);});
 return [...m.entries()].sort((a,b)=>b[1].last.localeCompare(a[1].last)).map(([ip,r])=>[`<strong>${esc(ip)}</strong>`,r.n,r.dev.size,esc([...r.ag].join("; ")),esc([...r.pg].join(", ")),when(r.first),when(r.last)]);}
const RANGES=[["1","Last 24 hours",864e5],["7","Last 7 days",6048e5],["30","Last 30 days",2592e6],["all","All time",0]];
const LEVELS=[["all","All levels"],["error","Errors only"],["warn","Warnings"],["info","Info"]];
const PAGE=50;
function filtered(L,tab){
 const r=RANGES.find(x=>x[0]===view.logRange)||RANGES[3],lv=view.logLevel||"all",now=Date.now();
 return L.filter(TABS[tab][1]).filter(e=>(!r[2]||now-Date.parse(e.t)<=r[2])&&(lv==="all"||e.level===lv));
}
export function logsPage(){
 const L=all(),day=Date.now()-864e5,tab=TABS[view.logTab]?view.logTab:"traffic";
 const visits=L.filter(e=>e.kind==="visit"),bugs=L.filter(e=>e.kind==="bug"),sec=L.filter(e=>e.kind==="security"),sync=L.filter(e=>e.kind==="sync");
 const rows=filtered(L,tab),limit=view.logLimit||PAGE,shown=rows.slice(0,limit);
 const ips=new Set(visits.map(e=>e.ip)),lastBug=bugs[0];
 const body=shown.map(e=>[when(e.t),lvl(e.level),esc(e.kind),esc(e.msg)+(e.detail?.file?`<div class="card-sub">${esc(e.detail.file)}:${esc(e.detail.line||"")}</div>`:"")+(e.detail?.stack?`<details><summary>Stack trace</summary><pre class="log-pre">${esc(e.detail.stack)}</pre></details>`:""),esc(e.page),`<strong>${esc(e.ip)}</strong>`,`${esc(e.device)}<div class="card-sub">${esc(e.agent)} · ${esc(e.screen)}</div>`]);
 const count=k=>L.filter(TABS[k][1]).length;
 const sel=(id,opts,cur)=>`<select id="${id}" aria-label="${id}">${opts.map(o=>`<option value="${o[0]}"${o[0]===cur?" selected":""}>${esc(o[1])}</option>`).join("")}</select>`;
 const ipRows=ipSummary(L.filter(e=>e.kind==="visit"||e.kind==="page"));
 return `<div class="grid cards-4">${card("Visits (24 h)",visits.filter(e=>Date.parse(e.t)>day).length,`${visits.length} in total`)}${card("Unique IP addresses",ips.size,`${new Set(L.map(e=>e.device)).size} device(s)`)}${card("Bugs / errors",bugs.length,`${bugs.filter(e=>Date.parse(e.t)>day).length} in the last 24 h`)}${card("Security events",sec.length,lastBug?"Last bug: "+when(lastBug.t):"No bugs recorded")}</div>
 ${bugs.length||sync.length?`<div class="banner warn lg-alert">${bugs.length?`${bugs.length} bug(s) recorded. `:""}${sync.length?`${sync.length} sync problem(s). `:""}Open the matching tab below. Your financial data is not affected.</div>`:`<div class="banner ok lg-alert">No bugs or sync problems recorded.</div>`}
 <details class="fx-more lg-fold"><summary>How this log works</summary><div class="lg-note">This log records every device that opens this app (this device: ${esc(deviceId())}). A static GitHub Pages site has no server, so it cannot see people who never open the app. Upload each device's log to see all devices together. Logs are separate from your financial data and never change any figure.</div></details>
 <div class="lg-tabs" role="tablist">${Object.entries(TABS).map(([k,[l]])=>`<button class="btn small ${tab===k?"primary":""}" role="tab" aria-selected="${tab===k}" data-log-tab="${k}">${l} <span class="lg-count">${count(k)}</span></button>`).join("")}</div>
 <div class="card lg-bar"><div class="lg-filters"><label>Time ${sel("log-range",RANGES,view.logRange||"all")}</label><label>Level ${sel("log-level",LEVELS,view.logLevel||"all")}</label><span class="card-sub">${rows.length} match${rows.length===1?"":"es"}</span></div>
  <div class="actions"><button class="btn small" data-log-upload>Upload this device's log</button><button class="btn small" data-log-load>Load all devices' logs</button><button class="btn small" data-log-csv>Export CSV</button><button class="btn small" data-log-json>Export JSON</button><button class="btn small danger" data-log-clear>Clear this device's log</button></div></div>
 ${tab==="traffic"?`<details class="fx-more lg-fold" open><summary>Traffic by IP address (${ipRows.length})</summary>${table(["IP address","Events","Devices","Browsers","Pages","First seen","Last seen"],ipRows)}</details>`:""}
 <div class="card-label" style="margin:8px 0">${esc(TABS[tab][0])} (${rows.length})</div>${rows.length?table(["Time","Level","Type","What happened","Page","IP address","Device"],body):`<div class="empty">Nothing here for this filter.</div>`}
 ${rows.length>limit?`<div class="actions" style="margin-top:12px"><button class="btn" data-log-more>Show ${Math.min(PAGE,rows.length-limit)} more (${rows.length-limit} left)</button></div>`:""}`;
}
export function bindLogs(){
 $$("[data-log-tab]").forEach(b=>b.onclick=()=>{view.logTab=b.dataset.logTab;view.logLimit=PAGE;render();});
 $("#log-range")?.addEventListener("change",e=>{view.logRange=e.target.value;view.logLimit=PAGE;render();});
 $("#log-level")?.addEventListener("change",e=>{view.logLevel=e.target.value;view.logLimit=PAGE;render();});
 $("[data-log-more]")?.addEventListener("click",()=>{view.logLimit=(view.logLimit||PAGE)+PAGE;render();});
 $("[data-log-json]")?.addEventListener("click",()=>download("activity-log.json",JSON.stringify(all(),null,2),"application/json"));
 $("[data-log-upload]")?.addEventListener("click",async()=>{try{await upload();toast("This device's log was uploaded to GitHub (logs/ folder)");}catch(e){toast(e.message);}});
 $("[data-log-load]")?.addEventListener("click",async()=>{try{remote=await Sync.pullLogs();render();toast(`Loaded ${remote.length} entries from GitHub`);}catch(e){toast(e.message);}});
 $("[data-log-csv]")?.addEventListener("click",()=>{const q=v=>{let s=String(v??"");if(/^[=+\-@]/.test(s))s="'"+s;return `"${s.replace(/"/g,'""')}"`;};
  download("activity-log.csv",["time,level,type,message,page,ip,device,browser"].concat(all().map(e=>[e.t,e.level,e.kind,e.msg,e.page,e.ip,e.device,e.agent].map(q).join(","))).join("\n"),"text/csv");});
 $("[data-log-clear]")?.addEventListener("click",async()=>{
  if(!await Sync.confirmPassphrase("Type your passphrase to clear THIS device's log. A copy is downloaded first."))return toast("Not cleared: passphrase was not confirmed");
  download("activity-log-before-clear.json",JSON.stringify(getLogs(),null,2),"application/json");clearLogs();render();});
}
