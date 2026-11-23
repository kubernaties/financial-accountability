/**
 * New Features & Demo screen. The demo area uses SAMPLE numbers typed on this page only.
 * Nothing here reads or writes your real records and nothing is saved.
 */
import {money, $, $$} from "../core/utils.js";
import {badge} from "../core/utils.js";
const F=[["Live","One-Glance dashboard","Top of the Dashboard: Where Is Every Taka, clickable cards, reconciliation warnings."],
["Live","Cash Counter","Count notes and coins, compare with expected cash, save the result with its difference."],
["Live","Activity & Bug Log","Visits with IP, page views, errors with stack traces, security events and sync problems, in separate tabs."],
["Live","Data protection","Merge-only sync and import, no demo loader, passphrase needed to clear local data."],
["Coming","Daily cashbook, difference investigation log","Next stage."],["Coming","Money-trail diagram","Clickable flow from source to destination."],
["Coming","Frozen accountability reports, PDF/Excel export","Historical snapshots that cannot change later."],
["Coming","Students and fees, global search, notes, tasks, import preview, multiple accounts","Later stages."]];
export function demoPage(){
 const rows=F.map(([s,n,d])=>`<div class="demo-row">${badge(s,s==="Live"?"green":"amber")}<div><strong>${n}</strong><div class="card-sub">${d}</div></div></div>`).join("");
 return `<div class="card"><h3>Feature status</h3>${rows}</div><br>
 <div class="banner warn"><strong>SAMPLE AREA.</strong> Numbers below are examples you can type over. They are not your data and are never saved.</div><br>
 <div class="card"><h3>Demo: how a cash difference is shown <span class="sample-tag">SAMPLE</span></h3>
 <div class="form-grid"><div class="field"><label>Expected cash (sample ৳)</label><input type="number" id="demo-exp" value="10000"></div><div class="field"><label>Counted cash (sample ৳)</label><input type="number" id="demo-cnt" value="9850"></div></div>
 <div id="demo-out" class="banner warn" style="margin-top:12px"></div>
 <div class="gl-title">Sample distribution of ৳20,000 received <span class="sample-tag">SAMPLE</span></div>
 <div class="gl-bar"><span class="seg s-cash" style="width:50%"></span><span class="seg s-spent" style="width:20%"></span><span class="seg s-hand" style="width:25%"></span><span class="seg s-hold" style="width:5%"></span></div>
 <div class="gl-legend"><span><i class="dot s-cash"></i>Cash ৳10,000</span><span><i class="dot s-spent"></i>Spent ৳4,000</span><span><i class="dot s-hand"></i>Given to principal ৳5,000</span><span><i class="dot s-hold"></i>Held by others ৳1,000</span></div></div>`;
}
export function bindDemo(){
 const calc=()=>{const e=Number($("#demo-exp")?.value||0),c=Number($("#demo-cnt")?.value||0),d=Math.round((c-e)*100)/100,o=$("#demo-out");if(!o)return;
  o.className="banner "+(d===0?"ok":"warn");o.textContent=d===0?"Sample: counted cash matches.":`Sample: ${d<0?"short":"over"} by ${money(Math.abs(d))}. The system shows the difference and asks you to investigate. It never adjusts the balance by itself.`;};
 $$("#demo-exp,#demo-cnt").forEach(i=>i.oninput=calc);calc();
}
