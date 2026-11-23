/**
 * Reports, accountability periods, monthly reports and the audit history.
 */
import {state} from "../../core/store.js";
import {$, badge, esc, money} from "../../core/utils.js";
import {bucketKey, flowItems} from "../../finance/reporting.js";
import {card, table, toolbar} from "../components.js";
import {view} from "../view-state.js";
import {calcExplain, categoryBars, expenseSourceTable, fundTable, personTable, voucherStatusCards} from "../widgets.js";

export const reportPages={
 reports(){
  const modes=[["daily","Daily"],["weekly","Weekly"],["monthly","Monthly"],["yearly","Yearly"]],map=new Map();
  flowItems().forEach(i=>{const k=bucketKey(i.date,view.reportMode);if(!map.has(k))map.set(k,{reg:0,fine:0,exp:0,hov:0,hold:0});const b=map.get(k);
   if(i.kind==="in"){if(i.fine)b.fine+=i.amount;else b.reg+=i.amount;}else if(i.kind==="exp")b.exp+=i.amount;else if(i.kind==="hov")b.hov+=i.amount;else b.hold+=i.amount;});
  const keys=[...map.keys()].sort().reverse(),T={reg:0,fine:0,exp:0,hov:0,hold:0};
  const line=(l,b,s)=>{const t=b.reg+b.fine;return [s?`<strong>${l}</strong>`:l,money(b.reg),money(b.fine),`<strong>${money(t)}</strong>`,money(b.exp),money(b.hov),money(b.hold),`<strong>${money(t-b.exp)}</strong>`];};
  const rows=keys.map(k=>{const b=map.get(k);for(const x in T)T[x]+=b[x];return line(view.reportMode==="weekly"?"Week of "+k:k,b);});
  rows.push(line("Total",T,true));
  const sec=t=>`<h3 class="section-title">${t}</h3>`;
  return toolbar("Reports",`<div class="seg">${modes.map(([k,l])=>`<button class="btn small ${view.reportMode===k?"primary":""}" data-report-mode="${k}">${l}</button>`).join("")}</div><button class="btn" data-print>Print / PDF</button>`)+
   table(["Period","Regular collection","Fine collection","Total collected","Expenses","Handed over","Given on hold","Collected − expenses"],rows)+
   `<br>${sec("How every number is calculated")}${calcExplain()}<br>${sec("Fund-wise summary")}${fundTable()}<br>${sec("Category-wise expenses")}<div class="card">${categoryBars()}</div><br>${sec("Expenses by source")}${expenseSourceTable()}<br>${sec("Person-wise outstanding balances")}${personTable()}<br>${sec("Voucher status")}${voucherStatusCards()}`;
 },
 accountability(){
  return toolbar("Accountability periods",`<button class="btn primary" data-modal="period">Create period</button>`)+
   table(["ID","Dates","Status","Result","Carry forward","Closed","Actions"],state.periods.map(p=>[p.id,esc(p.dates?.join(", ")||"Flexible"),badge(p.status,p.status==="Closed"?"green":"amber"),money(p.result||0),money(p.carryForward||0),p.closedAt||"—",
    `<button class="btn small" data-edit="period" data-id="${esc(p.id)}">Edit</button>${p.status==="Closed"?`<button class="btn small" data-reopen="${esc(p.id)}">Reopen</button>`:`<button class="btn small" data-close-period="${esc(p.id)}">Close</button>`}`]));
 },
 monthly(){
  const monthRows=state.monthly.map(m=>[m.month,badge(m.status,m.status==="Closed"?"green":"amber"),m.closedAt||"—",money(m.regular),money(m.fines),money(m.expenses),money(m.handovers||0),m.status==="Closed"?`<button class="btn small" data-reopen-month="${esc(m.id)}">Reopen</button>`:`<button class="btn small" data-close-month="${esc(m.id)}">Close</button>`]);
  return toolbar("Monthly reports (independent of accountability periods)",`<button class="btn primary" data-modal="month">Generate month</button><button class="btn" data-print>Print / PDF</button>`)+
   table(["Month","Status","Closed at","Regular","Fines","Expenses","Handovers","Actions"],monthRows);
 },
 audit(){
  return toolbar("Audit history",`<button class="btn" data-export-json>Export JSON</button><button class="btn" data-print>Print / PDF</button>`)+
   table(["Timestamp","Action","Related","Reason","User"],state.audit.map(a=>[new Date(a.timestamp).toLocaleString(),esc(a.action),esc(a.related||"—"),esc(a.reason||"—"),esc(a.user)]));
 }
};
