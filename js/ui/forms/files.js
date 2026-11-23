/**
 * Voucher file helpers: read a chosen file in the browser and preview a stored voucher file.
 */
import {download, toast} from "../../core/feedback.js";
import {state} from "../../core/store.js";
import {$, $$, esc} from "../../core/utils.js";
import {card} from "../components.js";
import * as Sync from "../../services/github-sync.js";

export function readFile(file){
 return new Promise((resolve,reject)=>{
  const reader=new FileReader();
  reader.onload=()=>resolve({name:file.name,type:file.type,size:file.size,dataUrl:reader.result,uploadedAt:new Date().toISOString()});
  reader.onerror=()=>reject(reader.error);
  reader.readAsDataURL(file);
 });
}
export async function openVoucherFile(id){
 const v=state.vouchers.find(x=>x.id===id);if(!v?.file)return toast("No file attached");
 if(!v.file.dataUrl&&v.file.remotePath){try{toast("Downloading from GitHub...");v.file.dataUrl=await Sync.fetchFile(v.file.remotePath);}catch(e){return toast(e.message);}}
 if(!v.file.dataUrl)return toast("No file attached");
 document.body.insertAdjacentHTML("beforeend",`<div class="modal-backdrop"><div class="modal"><div class="modal-head"><h2>${esc(v.file.name)}</h2><button class="btn small" data-close>×</button></div><div class="modal-body">${v.file.type?.startsWith("image/")?`<img src="${v.file.dataUrl}" alt="Voucher">`:`<p><a class="btn" href="${v.file.dataUrl}" download="${esc(v.file.name)}">Download ${esc(v.file.name)}</a></p>`}<p class="card-sub">${esc(v.file.type)} · ${v.file.size} bytes · uploaded ${esc(v.file.uploadedAt||"")}</p></div></div></div>`);
 $$("[data-close]").forEach(b=>b.onclick=()=>$(".modal-backdrop")?.remove());
}
