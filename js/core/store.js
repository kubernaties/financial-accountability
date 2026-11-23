/**
 * The single source of truth. Holds the app state, loads/saves it to the browser, writes audit entries and tells the cloud sync that something changed.
 */
import {toast} from "./feedback.js";
import {uid} from "./utils.js";
import * as Sync from "../services/github-sync.js";

export function defaultState(){
 return {
  version:2,currency:"BDT",theme:"dark",users:[{id:"USR-OWNER",name:"Owner",role:"Owner",github:""}],currentUser:"USR-OWNER",
  transactions:[],collections:[],expenses:[],vouchers:[],fines:[],advances:[],handovers:[],custom:[],
  reimbursements:[],holds:[],transfers:[],cashCounts:[],adjustments:[],periods:[],monthly:[],audit:[],reconfirmedDates:[],boardClose:[],
  categories:["Electricity","Electricity Meter 1","Electricity Meter 2","Wi-Fi & Internet","Water","Gas","Hospitality","Photocopy","Printing","Stationery","Transportation","Maintenance","Cleaning","Communication","Miscellaneous"],
  dash:{v:4,style:"mock",skin:"comfort",fineTogether:false,order:[],hidden:[]},
  settings:{repo:"",branch:"main",demo:false,lastSync:null,remoteSha:null,backupFile:"backups/financial-data.json"}
 };
}
export function load(){
 try{
  const raw=JSON.parse(localStorage.getItem("fa-state")||"null");
  const d=defaultState();
  if(!raw) return d;
  return {...d,...raw,settings:{...d.settings,...(raw.settings||{})},
   users:raw.users?.length?raw.users:d.users,
   transactions:raw.transactions||[],collections:raw.collections||[],expenses:raw.expenses||[],vouchers:raw.vouchers||[],
   fines:raw.fines||[],advances:raw.advances||[],handovers:raw.handovers||[],reimbursements:raw.reimbursements||[],
   custom:raw.custom||[],adjustments:raw.adjustments||[],periods:raw.periods||[],monthly:raw.monthly||[],audit:raw.audit||[],reconfirmedDates:raw.reconfirmedDates||[],holds:raw.holds||[],transfers:raw.transfers||[],cashCounts:raw.cashCounts||[],boardClose:raw.boardClose||[]};
 }catch(e){try{const bad=localStorage.getItem("fa-state");if(bad)localStorage.setItem("fa-state-corrupt-"+Date.now(),bad);}catch{}return defaultState();}
}
function sanitize(s){
 if(!s||typeof s!=="object"||Array.isArray(s))s=defaultState();
 const d=defaultState();
 for(const k of Object.keys(d)){if(Array.isArray(d[k])&&!Array.isArray(s[k]))s[k]=d[k];}
 for(const k of Object.keys(d)){if(Array.isArray(s[k])&&k!=="categories"&&k!=="reconfirmedDates")s[k]=s[k].filter(x=>x&&typeof x==="object");}
 if(!s.settings||typeof s.settings!=="object")s.settings=d.settings;
 return s;
}
export const state=sanitize(load());
export function persist(auditAction="",related="",before=null,after=null,reason=""){
 if(auditAction) addAudit(auditAction,related,before,after,reason);
 saveLocal();Sync.changed();
}
export function saveLocal(){
 try{localStorage.setItem("fa-state",JSON.stringify(state));}
 catch{try{localStorage.setItem("fa-state",JSON.stringify({...state,vouchers:state.vouchers.map(v=>v.file?.remotePath?{...v,file:{...v.file,dataUrl:undefined}}:v)}));}
 catch{toast("Browser storage is full - connect GitHub sync and remove very large voucher files");}}
}
export function addAudit(action,related="",before=null,after=null,reason=""){
 state.audit.unshift({id:uid("AUD"),timestamp:new Date().toISOString(),action,related,before,after,reason,user:state.currentUser});
}
export function replaceState(next){Object.keys(state).forEach(k=>delete state[k]);Object.assign(state,next);}
