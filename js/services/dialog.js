/**
 * Small modal dialog used by cloud sync (unlock, conflict, passphrase confirmation).
 * Resolves with {k: pressed button key, val: text typed in the first input, checked: first checkbox}.
 */
export function modal(title,body,buttons){return new Promise(res=>{
 const el=document.createElement("div");el.className="modal-backdrop";
 el.innerHTML=`<div class="modal"><div class="modal-head"><h2>${title}</h2></div><div class="modal-body">${body}</div><div class="modal-foot">${buttons.map(([k,t,c])=>`<button class="btn ${c||""}" data-k="${k}">${t}</button>`).join("")}</div></div>`;
 document.body.append(el);const input=el.querySelector("input");input?.focus();
 el.addEventListener("keydown",e=>{if(e.key==="Enter")el.querySelector(".primary")?.click();});
 el.onclick=e=>{const k=e.target.dataset?.k;if(k){const val=input?.value,checked=el.querySelector("input[type=checkbox]")?.checked;el.remove();res({k,val,checked});}};});}
