/**
 * Dashboard screen.
 */
import {state} from "../../core/store.js";
import {$, money, sum} from "../../core/utils.js";
import {FINE, PRIN, advanceOutstanding, cashPaidExpenses, expenseTotal, fineCollected, finePending, fineUsed, fundFlow, handoverTotal, holdTotal, moneyInHand, othersOweYou, owedToOthers, principalOwesYou, regularCollections, stillToGetBack, transferList} from "../../finance/calculations.js";
import {card} from "../components.js";
import {glance} from "../overview.js";
import {mustGivePrincipal} from "../../finance/boards.js";
import {view} from "../view-state.js";
import {dashboardShell} from "../dashboard-layout.js";
import {boardsSection} from "../boards.js";
import {calcExplain, categoryBars, collectionBars, expenseSourceTable, fundTable, monthlyChart, personTable, principalPanel, voucherStatusCards} from "../widgets.js";

const classicPages={
 dashboard(){
  const sec=t=>`<h3 class="section-title">${t}</h3>`;
  const coll=regularCollections()+fineCollected(),spent=expenseTotal(),hold=holdTotal();
  const fineLeft=fundFlow(FINE).left,prin=fundFlow(PRIN);
  const lines=[
   `You collected <strong>${money(coll)}</strong> (${money(regularCollections())} regular + ${money(fineCollected())} fines).`,
   `You spent <strong>${money(spent)}</strong>.`,
   `You have <strong>${money(moneyInHand())}</strong> with you now.`,
   `You still must give the principal <strong>${money(mustGivePrincipal())}</strong>.`,
   `You still have to get back <strong>${money(stillToGetBack())}</strong>.`,
   hold>0?`<strong>${money(hold)}</strong> was given to someone and is waiting for a voucher.`:""
  ].filter(Boolean);
  return `${boardsSection()}<br>${glance()}<div class="card summary-box">${lines.map(l=>`<div>${l}</div>`).join("")}</div><br>${principalPanel()}<br>
 <div class="actions quick"><button class="btn primary" data-modal="collection">+ Add collection</button><button class="btn primary" data-modal="expense">+ Add expense</button><button class="btn" data-modal="hold">Give money (waiting for voucher)</button><button class="btn" data-modal="handover">Give money to principal</button><button class="btn" data-toggle-calc>${view.showCalc?"Hide":"Show"} how everything is calculated</button></div><br>${view.showCalc?`<h3 class="section-title">How every number is calculated</h3>${calcExplain()}<br>`:""}
 <div class="grid cards-4">
 ${card("Money collected",money(coll),"All money received")}
 ${card("Money spent",money(spent),`${money(cashPaidExpenses())} paid by you`)}
 ${card("Money with me now",money(moneyInHand()),"What you should be holding")}
 ${card("I must give principal",money(mustGivePrincipal()),"Main + Fine boards")}
 </div><br><div class="card" style="border-left:4px solid var(--amber)"><div class="card-label">Still to get back (total)</div><div class="card-value">${money(stillToGetBack())}</div><div class="card-sub">Principal owes me ${money(principalOwesYou())} · Others owe me ${money(othersOweYou())} · Given, waiting for voucher ${money(holdTotal())}</div></div>
 ${sec("Where is the money? (each fund is separate)")}${fundTable()}
 ${sec("Fines")}<div class="grid cards-4">
 ${card("Fines collected",money(fineCollected()),"All fines added up")}
 ${card("Fine money left",money(fineLeft),"Fine fund available")}
 ${card("Fine money used",money(fineUsed()),"Taken from fine fund")}
 ${card("Fine money to put back",money(finePending()),"Used but not restored yet")}
 </div>
 ${sec("Giving money to the principal")}<div class="grid cards-4">
 ${card("Given to principal",money(handoverTotal()),"Handed over so far")}
 ${card("Not given yet",money(Math.max(0,coll-handoverTotal())),"Collected minus given")}
 ${card("Principal owes me",money(principalOwesYou()),"")}
 ${card("Others owe me",money(othersOweYou()),"Loans, custom entries and advances")}
 </div>
 ${sec("Other money")}<div class="grid cards-4">
 ${card("Given, waiting for voucher",money(hold),"Not an expense yet")}
 ${card("Advances not returned",money(advanceOutstanding()),"")}
 ${card("I must pay teachers back",money(owedToOthers()),"Teacher-paid expenses")}
 ${card("Moved between funds",money(sum(transferList())),"Not income, not expense")}
 </div>
 <div class="card-sub" style="margin-top:10px">Open periods: ${state.periods.filter(p=>p.status!=="Closed").length} · Open monthly reports: ${state.monthly.filter(m=>m.status!=="Closed").length}</div>
 ${sec("Where the money was spent")}${expenseSourceTable()}
 <br><div class="grid cards-2"><div class="card"><div class="card-label">Spending by category</div>${categoryBars()}</div><div class="card"><div class="card-label">Collections by category</div>${collectionBars()}</div></div>
 ${sec("People: who owes what")}${personTable()}
 ${sec("Last 6 months")}<div class="card">${monthlyChart()}</div>
 ${sec("Vouchers")}${voucherStatusCards()}`;
 }
};

/** Dashboard: Classic (as before) or the new movable-block layout, chosen in the dashboard bar. */
export const dashboardPages={
 dashboard(){return dashboardShell(state.dash?.style==="classic"?classicPages.dashboard():null);}
};
