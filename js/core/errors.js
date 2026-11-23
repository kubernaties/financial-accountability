/**
 * Central error handling. report() records a problem in the Activity and Bug Log and tells the user once;
 * guard() wraps any function (sync or async) so a failure is reported instead of breaking the app.
 */
import {log} from "../services/logger.js";
import {toast} from "./feedback.js";
let lastToast=0;
export function report(err,where=""){
 const msg=err?.message||String(err);
 try{log("bug",(where?where+": ":"")+msg,{level:"error",stack:String(err?.stack||"").slice(0,1500)});}catch{}
 const n=Date.now();if(n-lastToast>3000){lastToast=n;try{toast(`Something went wrong${where?" ("+where+")":""}: ${msg}. Saved in the Activity and Bug Log.`);}catch{}}
}
export function guard(fn,where=""){
 return function(...a){try{const r=fn.apply(this,a);return r&&typeof r.then==="function"?r.catch(e=>report(e,where)):r;}catch(e){report(e,where);}};
}
