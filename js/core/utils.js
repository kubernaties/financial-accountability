/**
 * Small shared helpers: DOM selectors, money formatting, IDs, dates, escaping and list sums. No business logic.
 */


export const $ = (s, root=document) => root.querySelector(s);
export const $$ = (s, root=document) => [...root.querySelectorAll(s)];
export const money = n => `৳${Number(n||0).toLocaleString("en-BD",{minimumFractionDigits:2,maximumFractionDigits:2})}`;
export const uid = p => `${p}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2,7)}`.toUpperCase();
export const today = () => {const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;};
export const esc = v => String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
export const num = v => Number(v||0);
export const OPTIONAL = new Set(["dates","personName","fundUsed","voucherNumber","relatedTransaction","collectionDates","expectedDate","account","note","result","carryForward"]);

export function badge(text,kind=""){return `<span class="badge ${kind}">${esc(text)}</span>`;}
export function sum(list,field="amount"){return list.reduce((n,x)=>n+num(x[field]),0);}
export function active(list){return list.filter(x=>!["Void","Voided","Reversed"].includes(x.status));}
export const DEAD=["Void","Voided","Reversed"];
