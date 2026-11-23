/**
 * GitHub cloud database: private repo, SHA conflict checks, optional AES-GCM encryption,
 * additive merge on conflicts and passphrase confirmation for destructive actions.
 */
import {getPassphrase,open,rnd,seal,setPassphrase} from "./crypto.js";
import {configure,fail,getFile,gh,putFile} from "./github-api.js";
import {modal} from "./dialog.js";
import {esc} from "../core/utils.js";

const KEY="fa-sync",PASS="fa-pass",FILE="data/state.json";
const readCfg=()=>{try{return JSON.parse(localStorage.getItem(KEY)||"null")||{};}catch{return {};}};
let cfg=readCfg(),api={},token=null,status="off",timer=null,rev=0,busy=false,retries=0;
const save=()=>{try{localStorage.setItem(KEY,JSON.stringify(cfg));}catch{}};
configure(()=>({repo:cfg.repo,branch:cfg.branch,token}));
export const DEFAULT_REPO="kubernaties/financial-data";
if(cfg.repo&&cfg.repo.toLowerCase()==="xubantu/financial-data"){cfg.repo=DEFAULT_REPO;save();}

async function pack(obj){const text=JSON.stringify(obj),env={fa:2,savedAt:new Date().toISOString()};
 if(cfg.encrypt)Object.assign(env,{enc:true},await seal(text,cfg.dataSalt));else env.state=obj;return JSON.stringify(env);}
async function unpack(text){let e;try{e=JSON.parse(text);}catch{throw new Error("The data file on GitHub is not valid JSON. Nothing was changed.");}return e.enc?JSON.parse(await open(e)):e.state;}

const snapshot=()=>{const s=api.get();return {...s,settings:{...s.settings,repo:"",remoteSha:null,lastSync:null},
 vouchers:s.vouchers.map(v=>v.file?.remotePath?{...v,file:{...v.file,dataUrl:undefined}}:v)};};
const hasData=()=>{const s=api.get();return ["collections","expenses","vouchers","fines","advances","handovers","adjustments","periods","monthly","reimbursements","custom","holds","transfers","transactions"].some(k=>s[k]?.length);};

export const label=()=>({off:"● Local only",locked:"🔒 Cloud locked",idle:`● Synced ${cfg.lastSync?new Date(cfg.lastSync).toLocaleTimeString():""}`,dirty:"● Unsaved changes",syncing:"● Syncing…",error:"● Sync error",conflict:"● Conflict"}[status]);
const setStatus=s=>{status=s;api.onStatus?.(label());};
export const info=()=>({repo:cfg.repo,branch:cfg.branch,encrypt:cfg.encrypt,lastSync:cfg.lastSync,label:label(),connected:!!token,remember:!!localStorage.getItem(PASS)});

async function pull(remote){
 const extra=api.apply(await unpack(remote.text));Object.assign(cfg,{remoteSha:remote.sha,dirty:!!extra,lastSync:new Date().toISOString()});
 save();api.saveLocal();setStatus(extra?"dirty":"idle");api.rerender();api.toast("Merged latest GitHub data (nothing was removed)");if(extra){clearTimeout(timer);timer=setTimeout(syncNow,1500);}
}
async function push(sha){
 const r0=rev;
 for(const v of api.get().vouchers){const f=v.file;
  if(f?.dataUrl&&!f.remotePath){const path=`vouchers/${v.id}-${Date.parse(f.uploadedAt)||Date.now()}.json`;
   await putFile(path,await pack({dataUrl:f.dataUrl}),null,"Add voucher file");f.remotePath=path;}}
 const body=await pack(snapshot()),res=await putFile(FILE,body,sha,"Update financial data");
 if(res.conflict){if(++retries>3){retries=0;throw new Error("GitHub keeps reporting a conflict. Your data is safe on this device; it will retry on the next change.");}busy=false;return syncNow();}
 retries=0;
 Object.assign(cfg,{remoteSha:res.sha,dirty:rev!==r0,lastSync:new Date().toISOString()});save();api.saveLocal();
 setStatus(cfg.dirty?"dirty":"idle");if(cfg.dirty)timer=setTimeout(syncNow,3000);
 const day=new Date().toISOString().slice(0,10); // one dated backup copy per day
 if(cfg.backupDay!==day){try{const bk=await putFile(`backups/${day}.json`,body,null,"Daily backup");if(bk.conflict||bk.sha){cfg.backupDay=day;save();}}catch{}} // "conflict" just means today's copy already exists
}
async function resolve(remote){
 const r=await modal("Cloud and this device differ",`<p>Both have records the other lacks. The app will <strong>merge</strong> them: every record from both sides is kept. Nothing is replaced or deleted.</p>`,
  [["dl","Download this device's data first"],["merge","Merge both","primary"],["cancel","Decide later"]]);
 if(r.k==="dl"){api.download();return resolve(remote);}
 if(r.k==="merge"){api.apply(await unpack(remote.text));api.saveLocal();api.rerender();return push(remote.sha);}
 api.toast("Sync paused until you resolve the conflict");
}
export async function syncNow(){
 if(!token||busy)return;busy=true;clearTimeout(timer);setStatus("syncing");
 try{
  const remote=await getFile(FILE);
  if(!remote)await push(null);
  else if(remote.sha===cfg.remoteSha){if(cfg.dirty&&!hasData())await pull(remote);else if(cfg.dirty)await push(remote.sha);else setStatus("idle");}
  else if((!cfg.dirty&&cfg.remoteSha)||!hasData())await pull(remote);
  else{setStatus("conflict");await resolve(remote);}
 }catch(e){retries=0;setStatus("error");const msg=e instanceof TypeError?"Cannot reach GitHub. Check your internet connection. Your data is safe on this device.":e.message;api.toast(msg);api.log?.("sync","Sync failed: "+msg,{level:"error"});}
 finally{busy=false;}
}
export function changed(){
 rev++;if(!cfg.repo)return;cfg.dirty=true;save();
 if(token){setStatus("dirty");clearTimeout(timer);timer=setTimeout(syncNow,3000);}else setStatus("locked");
}
export async function connect({repo,branch,token:t,passphrase,encrypt,remember}){
 if(!/^[\w.-]+\/[\w.-]+$/.test(repo))throw new Error("Repository must look like owner/name");
 if(!t)throw new Error("Paste your GitHub token");
 if(passphrase.length<8)throw new Error("Passphrase must be at least 8 characters");
 const old={cfg,token};cfg={...cfg,repo,branch:branch||"main"};token=t;
 try{const r=await gh("");if(!r.ok)throw await fail(r);const i=await r.json();
  if(!i.private)throw new Error("That repository is public. Create a PRIVATE repository for financial data.");
  if(i.permissions&&!i.permissions.push)throw new Error("Token cannot write to this repository");
 }catch(e){({cfg,token}=old);throw e;}
 setPassphrase(passphrase);try{if(remember)localStorage.setItem(PASS,passphrase);else localStorage.removeItem(PASS);}catch{}
 if(old.cfg.repo!==repo)cfg.remoteSha=null;
 Object.assign(cfg,{encrypt:!!encrypt,dataSalt:cfg.dataSalt||rnd(),dirty:true});cfg.vault=await seal(token,rnd());save();
 await syncNow();
}
export function disconnect(){localStorage.removeItem(KEY);localStorage.removeItem(PASS);cfg={};token=null;setPassphrase(null);clearTimeout(timer);setStatus("off");}
export function exportConnection(){
 if(!token||!cfg.vault||!getPassphrase())throw new Error("Connect and unlock the cloud database first");
 return JSON.stringify({fa:1,repo:cfg.repo,branch:cfg.branch||"main",encrypt:cfg.encrypt!==false,vault:cfg.vault},null,2);
}
export async function fetchFile(path){
 if(!token)throw new Error("Unlock cloud sync first");const f=await getFile(path);if(!f)throw new Error("File not found on GitHub");return (await unpack(f.text)).dataUrl;
}
async function unlock(){
 const saved=localStorage.getItem(PASS);
 if(saved){try{setPassphrase(saved);token=await open(cfg.vault);setStatus("idle");return syncNow();}catch{setPassphrase(null);token=null;localStorage.removeItem(PASS);}}
 for(;;){
  const r=await modal("Unlock cloud sync",`<div class="field"><label>Passphrase</label><input type="password" autocomplete="current-password"></div><p class="card-sub">Repository: ${esc(cfg.repo)}</p><label><input type="checkbox"> Remember on this device</label>`,[["skip","Work offline"],["ok","Unlock","primary"]]);
  if(r.k==="skip")return setStatus("locked");
  try{setPassphrase(r.val);token=await open(cfg.vault);try{if(r.checked)localStorage.setItem(PASS,r.val);}catch{}setStatus("idle");return syncNow();}catch{setPassphrase(null);token=null;api.toast("Wrong passphrase");api.log?.("security","Wrong passphrase entered when unlocking cloud sync",{level:"warn"});}
 }
}
export function init(a){
 api=a;setStatus(cfg.repo?"locked":"off");
 const again=()=>{if(token&&!cfg.dirty&&!document.hidden)syncNow();};
 document.addEventListener("visibilitychange",again);window.addEventListener("online",again);
 window.addEventListener("beforeunload",e=>{if(cfg.dirty&&token)e.preventDefault();});
}
export async function start(){
 if(!cfg.repo||!cfg.vault){ // new device: look for the connection file uploaded next to the website
  try{const r=await fetch("connection.json",{cache:"no-store"});
   if(r.ok){const j=await r.json();
    if(j?.fa===1&&/^[\w.-]+\/[\w.-]+$/.test(j.repo||"")&&j.vault?.salt&&j.vault?.iv&&j.vault?.data){
     cfg={...cfg,repo:j.repo,branch:j.branch||"main",encrypt:j.encrypt!==false,dataSalt:cfg.dataSalt||rnd(),vault:j.vault,remoteSha:null,dirty:false};save();setStatus("locked");}}}catch{}
 }
 return cfg.repo&&cfg.vault?unlock():0;
}

export async function confirmPassphrase(msg){
 if(!cfg.vault){api.toast("No passphrase is set on this device. Connect GitHub sync first.");return false;}
 const r=await modal("Confirm with passphrase",`<p>${esc(msg)}</p><div class="field"><label>Passphrase</label><input type="password" autocomplete="off"></div>`,[["cancel","Cancel"],["ok","Confirm","primary"]]);
 if(r.k!=="ok"||!r.val)return false;
 if(!cfg.vault)return false; // no passphrase exists on this device: destructive actions stay locked
 const keep=getPassphrase();try{setPassphrase(r.val);await open(cfg.vault);return true;}catch{api.log?.("security","Passphrase confirmation failed for a protected action",{level:"warn"});return false;}finally{setPassphrase(keep);}
}

// Device logs live in their own folder (logs/<device>.json), separate from financial data.
export async function pushLogs(deviceId,entries){
 if(!token)throw new Error("Unlock cloud sync first");
 const path=`logs/${deviceId}.json`,cur=await getFile(path),m=new Map();
 if(cur){try{((await unpack(cur.text)).entries||[]).forEach(e=>m.set(e.id,e));}catch{}}
 entries.forEach(e=>m.set(e.id,e));
 const res=await putFile(path,await pack({entries:[...m.values()]}),cur?.sha,"Update device log");
 if(res.conflict)throw new Error("Log upload conflicted, please try again");
}
export async function pullLogs(){
 if(!token)throw new Error("Unlock cloud sync first");
 const r=await gh(`/contents/logs?ref=${encodeURIComponent(cfg.branch)}`);
 if(r.status===404)return [];if(!r.ok)throw await fail(r);
 const out=[];for(const f of (await r.json()).filter(f=>f.name.endsWith(".json"))){const x=await getFile(f.path);if(x){try{out.push(...((await unpack(x.text)).entries||[]));}catch{}}}
 return out;
}
