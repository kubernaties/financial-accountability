/**
 * Data protection. Merges two copies of the data WITHOUT deleting or replacing records (used by sync and JSON import).
 */
import {state} from "./store.js";

// ---- Data-protection: merge instead of replace. Records are never deleted; voids/reversals are status changes. ----
export const MERGE_ARRAYS=["transactions","collections","expenses","vouchers","fines","advances","handovers","custom","reimbursements","holds","transfers","cashCounts","adjustments","periods","monthly","boardClose","audit"];
export const DEADS=["Void","Voided","Reversed"];
export function unionById(a,b){const m=new Map();[...(a||[]),...(b||[])].forEach(x=>{const k=x&&x.id!==undefined?x.id:JSON.stringify(x);if(!m.has(k))m.set(k,x);});return [...m.values()];}
export function mergeRecord(l,r){
 const win=String(r.updatedAt||"")>String(l.updatedAt||"")?r:l,lose=win===l?r:l,out={...lose,...win};
 ["returns","repayments"].forEach(k=>{if(l[k]||r[k])out[k]=unionById(l[k],r[k]);});
 if(DEADS.includes(lose.status)&&!DEADS.includes(win.status))Object.assign(out,lose);
 return out;
}
export function mergeState(local,remote){
 const out={...remote,...local};let localOnly=false;
 MERGE_ARRAYS.forEach(k=>{
  const ok=v=>Array.isArray(v)?v.filter(x=>x&&typeof x==="object"):[],kf=x=>x.id!==undefined?x.id:"~"+JSON.stringify(x);
  const L=ok(local[k]),R=ok(remote[k]),rm=new Map(R.map(x=>[kf(x),x])),lm=new Map(L.map(x=>[kf(x),x]));
  if(L.some(x=>!rm.has(kf(x))))localOnly=true;
  const res=[];
  L.forEach(x=>res.push(rm.has(kf(x))?mergeRecord(x,rm.get(kf(x))):x));
  R.forEach(x=>{if(!lm.has(kf(x)))res.push(x);});
  out[k]=k==="audit"?res.sort((a,b)=>String(b.timestamp).localeCompare(String(a.timestamp))):res;
 });
 ["categories","reconfirmedDates"].forEach(k=>{out[k]=[...new Set([...(local[k]||[]),...(remote[k]||[])])];});
 out.users=unionById(local.users,remote.users);
 return {state:out,localOnly};
}
