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
export function logsPage(){
 const L=all(),day=Date.now()-864e5,tab=TABS[view.logTab]?view.logTab:"traffic";
 const visits=L.filter(e=>e.kind==="visit"),bugs=L.filter(e=>e.kind==="bug"),sec=L.filter(e=>e.kind==="security"),rows=L.filter(TABS[tab][1]);
 const ips=new Set(visits.map(e=>e.ip)),lastBug=bugs[0];
 const body=rows.map(e=>[when(e.t),lvl(e.level),esc(e.kind),esc(e.msg)+(e.detail?.file?`<div class="card-sub">${esc(e.detail.file)}:${esc(e.detail.line||"")}</div>`:"")+(e.detail?.stack?`<details><summary>Stack trace</summary><pre class="log-pre">${esc(e.detail.stack)}</pre></details>`:""),esc(e.page),`<strong>${esc(e.ip)}</strong>`,`${esc(e.device)}<div class="card-sub">${esc(e.agent)} · ${esc(e.screen)}</div>`]);
 return `<div class="grid cards-4">${card("Visits (24 h)",visits.filter(e=>Date.parse(e.t)>day).length,`${visits.length} in total`)}${card("Unique IP addresses",ips.size,`${new Set(L.map(e=>e.device)).size} device(s)`)}${card("Bugs / errors",bugs.length,`${bugs.filter(e=>Date.parse(e.t)>day).length} in the last 24 h`)}${card("Security events",sec.length,lastBug?"Last bug: "+when(lastBug.t):"No bugs recorded")}</div>
 <p class="card-sub">This log records every device that opens this app (this device: ${esc(deviceId())}). A static GitHub Pages site has no server, so it cannot see people who never open the app. Upload each device's log to see all devices together. Logs are separate from your financial data.</p>
 <div class="toolbar"><div class="actions">${Object.entries(TABS).map(([k,[l]])=>`<button class="btn small ${tab===k?"primary":""}" data-log-tab="${k}">${l}</button>`).join("")}</div>
 <div class="actions"><button class="btn small" data-log-upload>Upload this device's log</button><button class="btn small" data-log-load>Load all devices' logs</button><button class="btn small" data-log-csv>Export CSV</button><button class="btn small danger" data-log-clear>Clear this device's log</button></div></div>
 ${tab==="traffic"?`<div class="card-label" style="margin:8px 0">Traffic by IP address</div>${table(["IP address","Events","Devices","Browsers","Pages","First seen","Last seen"],ipSummary(L.filter(e=>e.kind==="visit"||e.kind==="page")))}<br>`:""}
 <div class="card-label" style="margin:8px 0">${esc(TABS[tab][0])} (${rows.length})</div>${table(["Time","Level","Type","What happened","Page","IP address","Device"],body)}`;
}
export function bindLogs(){
 $$("[data-log-tab]").forEach(b=>b.onclick=()=>{view.logTab=b.dataset.logTab;render();});
 $("[data-log-upload]")?.addEventListener("click",async()=>{try{await upload();toast("This device's log was uploaded to GitHub (logs/ folder)");}catch(e){toast(e.message);}});
 $("[data-log-load]")?.addEventListener("click",async()=>{try{remote=await Sync.pullLogs();render();toast(`Loaded ${remote.length} entries from GitHub`);}catch(e){toast(e.message);}});
 $("[data-log-csv]")?.addEventListener("click",()=>{const q=v=>{let s=String(v??"");if(/^[=+\-@]/.test(s))s="'"+s;return `"${s.replace(/"/g,'""')}"`;};
  download("activity-log.csv",["time,level,type,message,page,ip,device,browser"].concat(all().map(e=>[e.t,e.level,e.kind,e.msg,e.page,e.ip,e.device,e.agent].map(q).join(","))).join("\n"),"text/csv");});
 $("[data-log-clear]")?.addEventListener("click",async()=>{
  if(!await Sync.confirmPassphrase("Type your passphrase to clear THIS device's log. A copy is downloaded first."))return toast("Not cleared: passphrase was not confirmed");
  download("activity-log-before-clear.json",JSON.stringify(getLogs(),null,2),"application/json");clearLogs();render();});
}
