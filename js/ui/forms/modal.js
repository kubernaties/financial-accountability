/**
 * The add/edit dialog (openModal) and a small generic dialog helper (simpleModal).
 */
import {guard} from "../../core/errors.js";
import {toast} from "../../core/feedback.js";
import {persist, state} from "../../core/store.js";
import {$, $$, OPTIONAL, esc, num, today, uid} from "../../core/utils.js";
import {render} from "../shell.js";
import {collectionKey, forms} from "./definitions.js";
import {readFile} from "./files.js";

export function openModal(kind,id,preset){
 const f=forms[kind];if(!f)return;
 const key=collectionKey(kind),existing=id?state[key].find(x=>x.id===id):null;
 const fields=f.fields.map(([name,label,type,options])=>{
  if(typeof options==="function")options=options(preset);
  const value=existing?.[name]??preset?.[name]??(type==="date"?(OPTIONAL.has(name)?"":today()):type==="month"?today().slice(0,7):type==="number"?0:"");
  let control;
  if(type==="select"){
   const opts=(typeof options==="string"?options.split(","):Array.isArray(options)?options:[]);
   control=`<select name="${name}"><option value="">No collection link</option>${opts.map(raw=>{const [v,l]=String(raw).split("::");return `<option value="${esc(v)}" ${String(value)===v?"selected":""}>${esc(l||v)}</option>`;}).join("")}</select>`;
  }else control=`<input name="${name}" type="${type}" value="${esc(value)}" ${type==="number"?'step="0.01" min="0"':""} ${OPTIONAL.has(name)?"":"required"}>`;
  return `<div class="field ${["description","reason","purpose","dates","note","label"].includes(name)?"full":""}"><label>${esc(label)}</label>${control}</div>`;
 }).join("");
 const fileField=f.file?`<div class="field full"><label>Voucher file (image/PDF, metadata + preview stored locally)</label><input name="voucherFile" id="voucher-file" type="file" accept="image/*,.pdf"></div>`:"";
 document.body.insertAdjacentHTML("beforeend",`<div class="modal-backdrop"><div class="modal"><div class="modal-head"><h2>${existing?"Edit":"Add"} ${esc(f.title)}</h2><button class="btn small" data-close>×</button></div><form id="modal-form"><div class="modal-body"><div class="form-grid">${fields}${fileField}</div></div><div class="modal-foot"><button type="button" class="btn" data-close>Cancel</button><button class="btn primary" type="submit">${existing?"Save changes":"Save"}</button></div></form></div></div>`);
 $$("[data-close]").forEach(b=>b.onclick=()=>$(".modal-backdrop")?.remove());
 $("#modal-form").onsubmit=guard(async e=>{
  e.preventDefault();const sb=e.submitter;if(sb){if(sb.disabled)return;sb.disabled=true;setTimeout(()=>{sb.disabled=false;},1500);}
  const d=Object.fromEntries(new FormData(e.target).entries());
  ["amount","returned","spent","result","carryForward"].forEach(k=>{if(d[k]!==undefined)d[k]=num(d[k]);});
  if(d.allocated!==undefined)d.allocated=d.allocated==="true";
  if(d.dates!==undefined)d.dates=d.dates.split(",").map(x=>x.trim()).filter(Boolean);
  if(d.collectionDates!==undefined)d.collectionDates=d.collectionDates.split(",").map(x=>x.trim()).filter(Boolean);
  if(f.file){
   const file=$("#voucher-file")?.files?.[0];
   if(file)d.file=await readFile(file);
   else if(existing)d.file=existing.file;
  }
  if(d.amount!==undefined&&!(Number.isFinite(d.amount)&&d.amount>0)){toast("Amount must be a number above zero");return;}
  if(f.validate){const msg=f.validate(d);if(msg){toast(msg);return;}}
  let record;
  if(existing){
   record={...existing,...d,updatedAt:new Date().toISOString()};
   const before=JSON.stringify(existing);const index=state[key].findIndex(x=>x.id===id);
   state[key][index]=record;
   if(["collection","expense"].includes(kind)){
    const tx=state.transactions.find(x=>x.sourceId===id);
    if(tx)Object.assign(tx,{date:record.collectionDate||record.date,description:record.description||record.category,amount:record.amount,status:record.status||"Recorded"});
   }
   persist(`${kind} edited`,id,before,JSON.stringify(record),"Updated record");
  }else{
   record=f.create(d);
   if(kind==="advance"){record.repayments=[];}
   state[key].push(record);
   if(!state.transactions)state.transactions=[];
   if(["collection","expense"].includes(kind))state.transactions.push({id:uid("TX"),type:kind==="collection"?"Collection":"Expense",date:record.collectionDate||record.date,description:record.description||record.category,amount:record.amount,status:"Recorded",sourceId:record.id});
   persist(`${kind} created`,record.id,null,JSON.stringify(record),"Created record");
  }
  $(".modal-backdrop")?.remove();toast("Record saved");render();
 },"Saving record");
}
export function simpleModal(title,formId,fieldsHtml,onSubmit){
 document.body.insertAdjacentHTML("beforeend",`<div class="modal-backdrop"><div class="modal"><div class="modal-head"><h2>${esc(title)}</h2><button class="btn small" data-close>×</button></div><form id="${formId}"><div class="modal-body"><div class="form-grid">${fieldsHtml}</div></div><div class="modal-foot"><button type="button" class="btn" data-close>Cancel</button><button class="btn primary" type="submit">Save</button></div></form></div></div>`);
 $$("[data-close]").forEach(b=>b.onclick=()=>$(".modal-backdrop")?.remove());
 $("#"+formId).onsubmit=e=>{e.preventDefault();onSubmit(Object.fromEntries(new FormData(e.target).entries()));};
}
