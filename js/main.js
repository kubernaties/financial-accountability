/**
 * Entry point. Registers the offline cache, connects cloud sync to the store, draws the app and starts sync.
 */
import {report} from "./core/errors.js";
import {initLogger, log, upload} from "./services/logger.js";
import {download, toast} from "./core/feedback.js";
import {mergeState} from "./core/merge.js";
import {defaultState, replaceState, saveLocal, state} from "./core/store.js";
import {$} from "./core/utils.js";
import {app, render} from "./ui/shell.js";
import * as Sync from "./services/github-sync.js";

if("serviceWorker" in navigator)navigator.serviceWorker.register("./service-worker.js").catch(()=>{});
Sync.init({get:()=>state,saveLocal,rerender:()=>render(),toast,log,
 download:()=>download("financial-backup-local.json",JSON.stringify(state,null,2),"application/json"),
 onStatus:l=>{const el=$("#sync-status");if(el)el.textContent=`${l} · ${state.users.find(u=>u.id===state.currentUser)?.name||"Owner"}`;},
 apply:r=>{const old=new Map(state.vouchers.map(v=>[v.id,v])),d=defaultState();
  const m=mergeState(state,{...d,...r});
  replaceState({...d,...m.state,settings:{...d.settings,...state.settings},theme:state.theme});
  state.vouchers=state.vouchers.map(v=>{const o=old.get(v.id);return v.file&&!v.file.dataUrl&&o?.file?.dataUrl&&o.file.remotePath===v.file.remotePath?{...v,file:{...v.file,dataUrl:o.file.dataUrl}}:v;});
  return m.localOnly;}});
try{initLogger();}catch(e){console.error("Logger failed to start",e);}
try{app();}catch(e){try{report(e,"Startup");}catch{}document.querySelector("#app").innerHTML='<div style="padding:24px;font-family:sans-serif"><h2>The app could not start</h2><p>'+String(e.message).replace(/</g,"&lt;")+"</p><p>Your saved data was not changed. Reload the page.</p></div>";}
try{Sync.start().catch(e=>report(e,"Cloud sync start"));}catch(e){report(e,"Cloud sync start");}
setInterval(()=>{if(Sync.info().connected&&!document.hidden)upload().catch(()=>{});},300000); // share this device's log every 5 min
