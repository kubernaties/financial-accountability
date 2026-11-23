import {state,persist} from "./core/store.js";
import {DEFAULT_INCOME_FEES,normalizeFeeNames,feeNameForCollection} from "./finance/income-fees.js";
import {esc} from "./core/utils.js";

const root=document.documentElement;
const style=document.createElement("style");
style.textContent=`
  :root{--fa-accent:#2563eb}.modal .field select,.modal .field input{min-height:44px}.modal-backdrop{backdrop-filter:blur(6px)}
  .modal{border-radius:16px;box-shadow:0 24px 70px rgba(0,0,0,.34)}.modal-head{padding-bottom:14px;border-bottom:1px solid var(--line)}
  .fee-manager{display:grid;gap:12px}.fee-row{display:grid;grid-template-columns:1fr auto;gap:8px}.fee-row input{min-height:42px}
  .fee-list{display:flex;flex-wrap:wrap;gap:8px}.fee-chip{display:inline-flex;align-items:center;gap:8px;border:1px solid var(--line);border-radius:999px;padding:7px 10px}
  .fee-chip button{border:0;background:transparent;color:var(--muted);cursor:pointer;padding:0 2px}.custom-fee-input{margin-top:8px}
`;
document.head.appendChild(style);

function fees(){
  state.incomeFees=normalizeFeeNames(state.incomeFees,DEFAULT_INCOME_FEES);
  return state.incomeFees;
}
function saveFees(next,message="Income fee names saved"){
  state.incomeFees=normalizeFeeNames(next);
  persist("Income fee definitions updated", "incomeFees", null, JSON.stringify(state.incomeFees), message);
  refreshCollectionSelects();
}
function refreshCollectionSelects(){
  document.querySelectorAll('select[name="category"]').forEach(select=>{
    const name=String(select.closest(".modal")?.querySelector("h2")?.textContent||"");
    if(!/collection/i.test(name)&&!document.querySelector('[data-preset-category="Fines"]'))return;
    const current=select.value||"";const names=fees();
    select.innerHTML=["",...names].map(name=>`<option value="${esc(name)}"${name===current||(!current&&name==="Monthly fees")?" selected":""}>${name?esc(name):"Select a fee"}</option>`).join("");
    if(current&&!names.includes(current))select.insertAdjacentHTML("afterbegin",`<option value="${esc(current)}" selected>${esc(current)}</option>`);
  });
}
function bindCustomFeeBox(){
  document.queryAll?.;
}
function addManager(){
  const settings=document.querySelector("#appearance")?.parentElement;
  if(!settings||document.querySelector("#income-fee-manager"))return;
  const card=document.createElement("div");card.className="card";card.id="income-fee-manager";
  card.innerHTML=`<h3>Income fee definitions</h3><p class="card-sub">Create fee names used in collection records, such as “IC Card Fee”.</p>
    <div class="fee-manager"><div class="fee-row"><input id="income-fee-new" maxlength="50" placeholder="Fee name, for example IC Card Fee" aria-label="New fee name"><button class="btn primary" id="income-fee-add" type="button">Add fee</button></div>
    <div class="fee-list" id="income-fee-list"></div></div>`;
  settings.insertBefore(card,document.querySelector("#appearance")?.nextSibling||null);
  const render=()=>{const list=document.querySelector("#income-fee-list");if(!list)return;list.innerHTML=fees().map((name,i)=>`<span class="fee-chip"><span>${esc(name)}</span><button type="button" data-remove-fee="${esc(name)}" aria-label="Remove ${esc(name)}">×</button></span>`).join("");
    list.querySelectorAll("[data-remove-fee]").forEach(button=>button.onclick=()=>{const name=button.dataset.removeFee;if(["Fines","Other income"].includes(name))return alert(`${name} is a reserved fee type.`);saveFees(fees().filter(x=>x!==name));render();});};
  document.querySelector("#income-fee-add").onclick=()=>{const input=document.querySelector("#income-fee-new");const name=String(input.value||"").trim();if(name.length<2)return alert("Enter a fee name of at least 2 characters.");if(fees().some(x=>x.toLowerCase()===name.toLowerCase()))return alert("That fee name already exists.");saveFees([...fees(),name]);input.value="";render();};
  render();
}

const observer=new MutationObserver(()=>{
  addManager();
  refreshCollectionSelects();
  document.querySelectorAll('select[name="category"]').forEach(select=>{
    if(select.dataset.faFeeEnhanced)return;select.dataset.faFeeEnhanced="1";
    if(!fees().includes(select.value)&&select.value)select.insertAdjacentHTML("beforeend",`<option value="${esc(select.value)}">${esc(select.value)}</option>`);
  });
});
observer.observe(document.body,{childList:true,subtree:true});
window.addEventListener("load",()=>{addManager();refreshCollectionSelects();});

export {fees,saveFees,feeNameForCollection};
