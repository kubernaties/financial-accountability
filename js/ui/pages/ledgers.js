/**
 * Money-in and money-out ledgers: transactions, collections, expenses, vouchers.
 */
import {state} from "../../core/store.js";
import {$, DEAD, active, badge, esc, money, sum} from "../../core/utils.js";
import {ledger} from "../../finance/reporting.js";
import {actionButtons, card, table, toolbar} from "../components.js";
import {view} from "../view-state.js";
import {collectionSummary, expenseSummary, voucherSummary} from "../widgets.js";

export const ledgerPages={
 transactions(){
  const all=ledger(),types=[...new Set(all.map(r=>r.type))].sort();
  const rows=all.filter(r=>(!view.txf.type||r.type===view.txf.type)&&(!view.txf.from||r.date>=view.txf.from)&&(!view.txf.to||r.date<=view.txf.to)).sort((a,b)=>b.date.localeCompare(a.date));
  const live=rows.filter(r=>!DEAD.includes(r.status));
  const sub=[...new Set(live.map(r=>r.type))].sort().map(t=>{const l=live.filter(r=>r.type===t);return [esc(t),l.length,money(sum(l))];});
  const filters=`<div class="card"><div class="toolbar"><strong>Filters</strong><div class="actions"><select id="tx-type" aria-label="Type"><option value="">All types</option>${types.map(t=>`<option ${view.txf.type===t?"selected":""}>${esc(t)}</option>`).join("")}</select><input type="date" id="tx-from" value="${esc(view.txf.from)}" aria-label="From date"><input type="date" id="tx-to" value="${esc(view.txf.to)}" aria-label="To date"><button class="btn" id="tx-clear">Clear</button></div></div>
   <div class="card-sub">Subtotals count active records only (void and reversed are excluded).</div></div><br>`;
  const body=rows.map(x=>[x.date||"—",badge(x.type,{"Collection":"green","Fine collection":"green","Expense":"red","Money on hold":"amber"}[x.type]||"blue"),esc(x.desc),money(x.amount),badge(x.status,x.status==="Void"?"red":x.status==="Reversed"?"amber":"blue"),actionButtons(x.kind,x.id,x.status)]);
  return toolbar("All transactions",`<button class="btn" data-modal="collection">Add collection</button><button class="btn" data-modal="expense">Add expense</button><button class="btn" data-modal="hold">Give money (pending voucher)</button><button class="btn" data-modal="transfer">Transfer</button><button class="btn" data-export-csv>Export CSV</button><button class="btn" data-export-json>Export JSON</button><button class="btn" data-import-json>Import JSON</button><button class="btn" data-print>Print / PDF</button>`)+filters+
   table(["Type","Records","Subtotal"],sub.concat([[`<strong>Shown</strong>`,live.length,`<strong>${money(sum(live))}</strong>`]]))+"<br>"+
   table(["Date","Type","Description","Amount","Status","Actions"],body);
 },
 collections(){
  return collectionSummary()+toolbar("Collections",`<button class="btn primary" data-modal="collection">Add collection</button><button class="btn" data-export-csv>Export CSV</button>`)+
   table(["ID","Date","Paid by","Category","Method","Amount","Status","Actions"],state.collections.map(x=>[x.id,x.collectionDate,esc(x.person),esc(x.category),esc(x.paymentMethod),money(x.amount),badge(x.status||"Recorded",x.status==="Void"?"red":"blue"),actionButtons("collection",x.id,x.status)]));
 },
 expenses(){
  return expenseSummary()+toolbar("Expenses",`<button class="btn primary" data-modal="expense">Add expense</button><button class="btn" data-export-csv>Export CSV</button>`)+
   table(["ID","Date","Category","Description","Payer","Fund","Amount","Reimbursement","Actions"],state.expenses.map(x=>[x.id,x.date,esc(x.category),esc(x.description),esc(x.actualPayer),esc(x.fundedBy),money(x.amount),badge(x.reimbursementStatus||"N/A",x.reimbursementStatus==="Paid"?"green":"amber"),actionButtons("expense",x.id,x.status)]));
 },
 vouchers(){
  return voucherSummary()+toolbar("Vouchers",`<button class="btn primary" data-modal="voucher">Add voucher</button><button class="btn" data-print>Print / PDF</button>`)+
   table(["Voucher","Date","Category","Amount","Payer","File","Verification","Reimbursement","Actions"],state.vouchers.map(x=>[x.id,x.date,esc(x.category),money(x.amount),esc(x.payer),x.file?.name?`<button class="btn small" data-voucher-file="${esc(x.id)}">${esc(x.file.name)}</button>`:"—",badge(x.verification,x.verification==="Verified"?"green":x.verification==="Rejected"?"red":"amber"),badge(x.reimbursement,x.reimbursement==="Fully reimbursed"?"green":"amber"),actionButtons("voucher",x.id,x.status)]));
 }
};
