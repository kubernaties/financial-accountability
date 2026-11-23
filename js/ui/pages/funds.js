/**
 * Fund and balance screens: money on hold, transfers, fines, handovers, advances, custom entries, adjustments.
 */
import {state} from "../../core/store.js";
import {$, DEAD, active, badge, esc, money, num, sum} from "../../core/utils.js";
import {FINE, PRIN, REG, customList, customOutstanding, customRet, fineCollected, fineRestored, fineUsed, fundFlow, holdList, holdOutstanding, holdReturned, holdSettled, holdStatus, holdTotal, isOwed, transferList} from "../../finance/calculations.js";
import {actionButtons, card, table, toolbar} from "../components.js";
import {handoverSummary} from "../widgets.js";

export const fundPages={
 holds(){
  const list=state.holds||[],live=holdList();
  const byFund=[REG,FINE,PRIN].map(f=>card(f+" on hold",money(fundFlow(f).hold),"Reduces this fund only"));
  const body=list.map(h=>{
   const st=holdStatus(h),o=holdOutstanding(h),dead=DEAD.includes(h.status);
   const act=!dead&&o>0?`<button class="btn small" data-hold-settle="${esc(h.id)}">Voucher received</button><button class="btn small" data-hold-return="${esc(h.id)}">Money returned</button>`:"";
   return [h.id,h.date,esc(h.recipient),esc(h.fund),esc(h.purpose),money(h.amount),money(holdSettled(h)),money(holdReturned(h)),`<strong>${money(dead?0:o)}</strong>`,badge(st,st==="Settled"||st==="Returned"?"green":dead?"red":"amber"),act+actionButtons("hold",h.id,h.status)];
  });
  return `<div class="grid cards-4">${card("Money on hold now",money(holdTotal()),"Not an expense yet")}${card("Total given out",money(sum(live)),"All hold records")}${card("Settled by voucher",money(sum(live.map(h=>({amount:holdSettled(h)})))),"Became real expenses")}${card("Returned",money(sum(live.map(h=>({amount:holdReturned(h)})))),"Credited back to original fund")}</div><br><div class="grid cards-3">${byFund.join("")}</div><br>`+
   toolbar("Money on hold / pending vouchers",`<button class="btn primary" data-modal="hold">Give money</button><button class="btn" data-export-csv>Export CSV</button>`)+
   table(["ID","Date","Recipient","Original fund","Purpose","Given","Voucher settled","Returned","Still on hold","Status","Actions"],body);
 },
 transfers(){
  const list=state.transfers||[];
  return `<div class="grid cards-4">${[REG,FINE,PRIN].map(f=>{const x=fundFlow(f);return card(f,money(x.tin-x.tout),`${money(x.tin)} in · ${money(x.tout)} out`);}).join("")}${card("Total moved",money(sum(transferList())),"Not counted as income or expense")}</div><br>`+
   toolbar("Transfers between funds",`<button class="btn primary" data-modal="transfer">New transfer</button><button class="btn" data-export-csv>Export CSV</button>`)+
   table(["ID","Date","From","To","Amount","Note","Status","Actions"],list.map(t=>[t.id,t.date,esc(t.from),esc(t.to),money(t.amount),esc(t.note||"—"),badge(t.status||"Recorded",DEAD.includes(t.status)?"red":"blue"),actionButtons("transfer",t.id,t.status)]));
 },
 fines(){
  const fineCols=active(state.collections).filter(x=>x.category==="Fines").map(x=>[x.id,x.collectionDate,"Collection (Fines)",money(x.amount),badge("Collected","green"),esc(x.description||x.person||""),"—"]);
  return `<div class="grid cards-4">${card("Fines collected",money(fineCollected()),"Automatic sum")}${card("Fine money used",money(fineUsed()),"Paid by you from the fine fund")}${card("Fine money restored",money(fineRestored()))}${card("Fine fund available",money(fundFlow(FINE).left),"Separate fine balance")}</div><br>`+
   toolbar("Fine transactions",`<button class="btn primary" data-modal="collection" data-preset-category="Fines">Add fine collection</button><button class="btn" data-modal="fine">Record restoration / fine activity</button>`)+
   table(["ID","Date","Source","Amount","Status","Reason","Actions"],[...fineCols,...state.fines.map(x=>[x.id,x.date,esc(x.source),money(x.amount),badge(x.status,x.status==="Restored"?"green":"amber"),esc(x.reason),actionButtons("fine",x.id,x.status)])]);
 },
 handovers(){
  return handoverSummary()+toolbar("Handovers",`<button class="btn primary" data-modal="handover">Record handover</button>`)+
   table(["Handover","Date","Recipient","Amount","Allocation","Accountability","Actions"],state.handovers.map(x=>[x.id,x.date,esc(x.recipient),money(x.amount),badge(x.allocated?"Allocated":"Unallocated",x.allocated?"green":"amber"),badge(x.status||"Pending",x.status==="Accounted"?"green":"blue"),actionButtons("handover",x.id,x.status)]));
 },
 advances(){
  return toolbar("Advances & repayments",`<button class="btn primary" data-modal="advance">Create advance</button>`)+
   table(["ID","Recipient","Date","Purpose","Given","Returned","Spent","Outstanding","Status","Actions"],state.advances.map(a=>{
    const repaid=sum(a.repayments||[],"amount"),out=Math.max(0,num(a.amount)-num(a.returned)-num(a.spent)-repaid);
    return [a.id,esc(a.recipient),a.date,esc(a.purpose),money(a.amount),money(num(a.returned)+repaid),money(a.spent),money(out),badge(out<=0?"Settled":a.status,out<=0?"green":"amber"),`<button class="btn small" data-repayment="${esc(a.id)}">Repay</button>${actionButtons("advance",a.id,a.status)}`];
   }));
 },
 custom(){
  const list=state.custom||[];
  const owedMe=sum(customList().filter(c=>c.direction==="Someone owes me").map(c=>({amount:customOutstanding(c)})));
  const iOwe=sum(customList().filter(c=>c.direction==="I owe someone").map(c=>({amount:customOutstanding(c)})));
  return `<div class="grid cards-3">${card("Someone owes you",money(owedMe),"Still to get back")}${card("You owe",money(iOwe),"Still to pay back")}${card("Entries",list.length,"All custom entries")}</div><br>`+
   toolbar("Custom entries - anything you want",`<button class="btn primary" data-modal="custom">Add custom entry</button><button class="btn" data-export-csv>Export CSV</button>`)+
   table(["ID","Date","Name","Type","Fund","Who","Amount","Returned","Waiting","Status","Actions"],list.map(c=>{
    const out=customOutstanding(c),owed=isOwed(c);
    const st=["Void","Reversed"].includes(c.status)?c.status:owed?(out<=0?"Settled":"Waiting"):"Recorded";
    const ret=st==="Waiting"?`<button class="btn small" data-custom-return="${esc(c.id)}">${c.direction==="Someone owes me"?"Money came back":c.direction==="I took personal money"?"I put it back":"I paid back"}</button>`:"";
    return [c.id,c.date,esc(c.label),esc(c.direction),esc(c.fund),esc(c.party||"—"),money(c.amount),owed?money(customRet(c)):"—",owed?money(out):"—",badge(st,st==="Waiting"?"amber":(st==="Settled"||st==="Recorded")?"green":"red"),ret+actionButtons("custom",c.id,c.status)];
   }));
 },
 adjustments(){
  return toolbar("Account adjustments",`<button class="btn primary" data-modal="adjustment">Create adjustment</button>`)+
   table(["ID","Date","Debit","Credit","Amount","Reason","Status","Actions"],state.adjustments.map(a=>[a.id,a.date,esc(a.debit),esc(a.credit),money(a.amount),esc(a.reason),badge(a.status,a.status==="Verified"?"green":"amber"),actionButtons("adjustment",a.id,a.status)]));
 }
};
