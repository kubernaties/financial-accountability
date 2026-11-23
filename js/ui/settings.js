/**
 * Settings screen behaviour: GitHub connection buttons and the passphrase-protected 'clear local data'.
 */
import {log} from "../services/logger.js";
import {download, toast} from "../core/feedback.js";
import {defaultState, persist, replaceState, state} from "../core/store.js";
import {$} from "../core/utils.js";
import {render} from "./shell.js";
import * as Sync from "../services/github-sync.js";

export function hasDemoData(){return ["collections","expenses","vouchers","fines","handovers","advances","custom"].some(k=>(state[k]||[]).some(x=>String(x.id).includes("-DEMO-")));}
export function bindSettings(){
 $("#connect-cloud").onclick=async()=>{try{await Sync.connect({repo:$("#sync-repo").value.trim(),branch:$("#sync-branch").value.trim(),token:$("#sync-token").value.trim(),passphrase:$("#sync-pass").value,encrypt:$("#sync-encrypt").checked,remember:$("#sync-remember").checked});render();}catch(e){toast(e.message);}};
 $("#sync-now").onclick=()=>Sync.syncNow();
 $("#export-connection").onclick=()=>{try{download("connection.json",Sync.exportConnection(),"application/json");toast("Upload connection.json to the main folder of your website repo");}catch(e){toast(e.message);}};
 $("#disconnect-cloud").onclick=()=>{if(confirm("Disconnect GitHub on this device? Your cloud data stays in GitHub; the saved token is removed from this browser.")){Sync.disconnect();render();}};
 $("#export-all").onclick=()=>download("financial-backup.json",JSON.stringify(state,null,2),"application/json");
 $("#clear-data").onclick=async()=>{
  if(!await Sync.confirmPassphrase("Type your passphrase to clear THIS DEVICE's local data. Cloud data on GitHub is not deleted."))return toast("Not cleared: passphrase was not confirmed");
  download("financial-backup-before-clear.json",JSON.stringify(state,null,2),"application/json");
  log("security","Local financial data cleared on this device (passphrase confirmed)",{level:"warn"});Sync.disconnect();replaceState(defaultState());localStorage.removeItem("fa-state");persist("Local data cleared (passphrase confirmed)");render();toast("Local data cleared");
 };
}
