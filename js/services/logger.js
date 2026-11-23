/**
 * Activity, bug and security logger. Kept completely SEPARATE from financial data:
 * stored under its own browser key and its own GitHub folder (logs/), never in state.json,
 * so it can never affect any calculation. Records visits (with IP), page views, JavaScript
 * errors, sync problems and security events (e.g. wrong passphrase).
 */
import {toast} from "../core/feedback.js";
import * as Sync from "./github-sync.js";
const KEY="fa-logs",DEV="fa-device",MAX=3000;
const rd=(k,f)=>{try{return JSON.parse(localStorage.getItem(k))??f;}catch{return f;}};
const rid=()=>Date.now().toString(36)+Math.random().toString(36).slice(2,8);
let lastToast=0;const notify=m=>{const n=Date.now();if(n-lastToast>3000){lastToast=n;try{toast("Something went wrong: "+m+" (saved in the Activity and Bug Log)");}catch{}}};
const session=rid();let ipCache=null,lastPage="";const entries=rd(KEY,[]);
const persist=()=>{try{localStorage.setItem(KEY,JSON.stringify(entries));}catch{}};
export function deviceId(){let d=null;try{d=localStorage.getItem(DEV);}catch{}if(!d){d="DEV-"+rid().toUpperCase();try{localStorage.setItem(DEV,d);}catch{}}return d;}
function agent(){const u=(typeof navigator!=="undefined"&&navigator.userAgent)||"";
 const b=(u.match(/(Edg|OPR|Chrome|Firefox|Safari)\/[\d.]+/)||[])[0]||"Unknown browser";
 const o=/Android/.test(u)?"Android":/iPhone|iPad/.test(u)?"iOS":/Windows/.test(u)?"Windows":/Mac/.test(u)?"macOS":/Linux/.test(u)?"Linux":"Unknown OS";return `${b} on ${o}`;}
async function lookupIp(){if(ipCache)return ipCache;
 try{const c=new AbortController();setTimeout(()=>c.abort(),4000);const r=await fetch("https://api.ipify.org?format=json",{signal:c.signal,cache:"no-store"});ipCache=(await r.json()).ip||"unavailable";}
 catch{ipCache="unavailable";}return ipCache;}
export function log(kind,msg,detail={}){
 const e={id:rid(),t:new Date().toISOString(),device:deviceId(),session,kind,level:detail.level||"info",msg:String(msg).slice(0,500),detail,ip:ipCache||"pending",agent:agent(),
  screen:typeof screen!=="undefined"?`${screen.width}x${screen.height}`:"",tz:Intl.DateTimeFormat().resolvedOptions().timeZone,online:typeof navigator!=="undefined"?navigator.onLine:true,page:(location.hash||"").slice(1)||"dashboard"};
 entries.push(e);if(entries.length>MAX)entries.splice(0,entries.length-MAX);persist();return e;}
export const pageView=route=>{if(route!==lastPage){lastPage=route;log("page","Opened "+route);}};
export const getLogs=()=>entries;
export function clearLogs(){entries.length=0;persist();}
export const upload=()=>Sync.pushLogs(deviceId(),entries);
export function initLogger(){
 log("visit","App opened");
 lookupIp().then(ip=>{entries.forEach(e=>{if(e.session===session&&e.ip==="pending")e.ip=ip;});persist();});
 window.addEventListener("error",ev=>{log("bug",ev.message||"Script error",{level:"error",file:ev.filename,line:ev.lineno,col:ev.colno,stack:String(ev.error?.stack||"").slice(0,1500)});notify(ev.message||"Script error");});
 window.addEventListener("unhandledrejection",ev=>{const m=ev.reason?.message||String(ev.reason);log("bug","Unhandled promise error: "+m,{level:"error",stack:String(ev.reason?.stack||"").slice(0,1500)});notify(m);});
}
