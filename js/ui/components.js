/**
 * Reusable HTML pieces: cards, tables, toolbars, bar charts, row action buttons.
 */
import {$, esc, money} from "../core/utils.js";

export function bars(items,fmt=money){
 const max=Math.max(1,...items.map(i=>Math.abs(i.value)));
 return `<div class="bars">${items.map(i=>`<div class="bar-row"><span class="bar-label">${esc(i.label)}</span><div class="bar-track"><div class="bar-fill ${i.kind||""}" style="width:${(Math.abs(i.value)/max*100).toFixed(1)}%"></div></div><span class="bar-val">${fmt(i.value)}</span></div>`).join("")||`<div class="empty">No data yet</div>`}</div>`;
}
export function toolbar(title,actions=""){return `<div class="toolbar"><strong>${title}</strong><div class="actions">${actions}</div></div>`;}
export function card(label,value,sub=""){return `<div class="card"><div class="card-label">${label}</div><div class="card-value">${value}</div><div class="card-sub">${esc(sub)}</div></div>`;}
export function table(headers,rows){
 return `<div class="table-wrap"><table><thead><tr>${headers.map(h=>`<th>${h}</th>`).join("")}</tr></thead><tbody>${rows.length?rows.map(r=>`<tr>${r.map(c=>`<td>${c}</td>`).join("")}</tr>`).join(""):`<tr><td colspan="${headers.length}" class="empty">No records yet</td></tr>`}</tbody></table></div>`;
}
export function actionButtons(kind,id,status){
 if(kind==="period") return "";
 const extra=kind==="expense"?`<button class="btn small" data-reimburse="${esc(id)}">Reimbursement</button>`:"";
 return `<button class="btn small" data-edit="${kind}" data-id="${esc(id)}">Edit</button>${extra}
 ${status==="Void"?"":`<button class="btn small danger" data-void="${kind}" data-id="${esc(id)}">Void</button>`}
 <button class="btn small" data-reverse="${kind}" data-id="${esc(id)}">Reverse</button>`;
}
