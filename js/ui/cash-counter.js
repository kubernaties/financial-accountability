/**
 * Cash Counter screen: count physical notes/coins, compare with the expected cash and save the count.
 * A difference is recorded as-is. It is never auto-adjusted.
 */
import {money, esc, uid, $, $$} from "../core/utils.js";
import {state, persist} from "../core/store.js";
import {toast} from "../core/feedback.js";
import {glanceData} from "../finance/overview.js";
import {table} from "./components.js";
import {render} from "./shell.js";
const DEN=[1000,500,200,100,50,20,10,5,2,1];
const read=()=>Object.fromEntries($$("[data-denom]").map(i=>[i.dataset.denom,Math.max(0,Math.floor(Number(i.value)||0))]));
const total=d=>Object.entries(d).reduce((n,[k,v])=>n+Number(k)*v,0);
export function counterPage(){
 const g=glanceData(),hist=[...(state.cashCounts||[])].sort((a,b)=>String(b.at).localeCompare(String(a.at)));
 return `<div class="card"><p>Expected cash with you: <strong>${money(g.cash)}</strong>. Enter how many notes or coins of each value you physically have.</p>
 <div class="form-grid">${DEN.map(d=>`<div class="field"><label>৳${d} × count</label><input type="number" min="0" step="1" value="0" data-denom="${d}"></div>`).join("")}</div>
 <div id="cc-result" class="banner ok" style="margin-top:14px"></div>
 <div class="field full"><label>Note</label><input id="cc-note"></div>
 <div class="actions" style="margin-top:12px"><button class="btn primary" data-cc-save>Save this count</button></div></div><br>
 <div class="card-label" style="margin:8px 0">Count history</div>${table(["When","Counted","Expected","Difference","Note"],hist.map(c=>[new Date(c.at).toLocaleString(),money(c.counted),money(c.expected),`<strong>${money(c.diff)}</strong>`,esc(c.note||"—")]))}`;
}
export function bindCounter(){
 const g=glanceData(),calc=()=>{const t=total(read()),diff=Math.round((t-g.cash)*100)/100,out=$("#cc-result");if(!out)return;
  out.className="banner "+(Math.abs(diff)<0.005?"ok":"warn");
  out.textContent=`Counted ${money(t)}. `+(Math.abs(diff)<0.005?"Matches the expected cash.":diff<0?`Short by ${money(-diff)}. Investigate; nothing is adjusted automatically.`:`Over by ${money(diff)}. Investigate; nothing is adjusted automatically.`);};
 $$("[data-denom]").forEach(i=>i.oninput=calc);calc();
 $("[data-cc-save]")?.addEventListener("click",()=>{const d=read(),t=total(d);
  const rec={id:uid("CNT"),at:new Date().toISOString(),counted:t,expected:g.cash,diff:Math.round((t-g.cash)*100)/100,note:$("#cc-note").value||"",denominations:d};
  state.cashCounts.push(rec);persist("Cash counted",rec.id,null,JSON.stringify(rec),rec.diff?`Difference ${rec.diff} left unadjusted`:"Matched");toast("Count saved");render();});
}
