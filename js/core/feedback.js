/**
 * User feedback helpers: toast messages and file downloads.
 */
import {$, esc} from "./utils.js";

export function download(name,text,type){
 const blob=new Blob([text],{type}),a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);
}
export function toast(message){
 document.body.insertAdjacentHTML("beforeend",`<div class="toast">${esc(message)}</div>`);setTimeout(()=>$(".toast")?.remove(),2400);
}
