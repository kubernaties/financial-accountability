/**
 * Numbers behind the One-Glance dashboard: where every taka is, reconciliation difference and warnings.
 */
import {state} from "../core/store.js";
import {$, money, num, sum} from "../core/utils.js";
import {BOARDS, boardTotals} from "./boards.js";
import {PERS, advanceNetOut, customList, customOutstanding, fineRestoredByAdjustment, fundFlow, fundList, handoverTotal, moneyInHand, owedToOthers} from "./calculations.js";

export function glanceData(){
 const fl=fundList().map(f=>fundFlow(f)),T=k=>fl.reduce((n,x)=>n+x[k],0);
 const recv=T("inn"),spent=T("out"),hold=T("hold"),hand=handoverTotal(),adv=advanceNetOut(),fra=fineRestoredByAdjustment(),cash=moneyInHand();
 const placed=spent+hold+hand+adv+fra+cash,diff=Math.round((recv-placed)*100)/100;
 const counts=[...(state.cashCounts||[])].sort((a,b)=>String(b.at).localeCompare(String(a.at))),last=counts[0];
 const given=Math.round(sum(customList().filter(c=>c.direction==="Someone owes me"&&fundList().includes(c.fund)).map(c=>({amount:num(c.amount)})))*100)/100,pers=Math.round(sum(customList().filter(c=>c.direction===PERS&&fundList().includes(c.fund)).map(c=>({amount:num(c.amount)})))*100)/100,persOut=Math.round(sum(customList().filter(c=>c.direction===PERS).map(c=>({amount:customOutstanding(c)})))*100)/100,spentX=Math.round((spent-given-pers)*100)/100;
 const iOweOthers=owedToOthers()+sum(customList().filter(c=>c.direction==="I owe someone"&&c.party!=="Principal").map(c=>({amount:customOutstanding(c)})));
 const warn=[];
 if(Math.abs(diff)>0.005)warn.push(`Where-is-every-taka does not reconcile: ${money(diff)} unexplained.`);
 if(cash<-0.005)warn.push(`Cash with you is negative (${money(cash)}). Something was spent or given that is not backed by recorded money.`);
 fundList().forEach(f=>{const l=fundFlow(f).left;if(l<-0.005)warn.push(`${f} is overspent by ${money(-l)}.`);});
 if(last&&Math.abs(last.diff)>0.005)warn.push(`Last cash count (${last.at.slice(0,10)}) was ${last.diff<0?"short":"over"} by ${money(Math.abs(last.diff))}. Investigate; nothing was adjusted.`);
 if(!last)warn.push("Cash has never been physically counted. Count it to compare with the expected amount.");
 const cashMain=boardTotals(BOARDS[0]).cash,cashFine=boardTotals(BOARDS[1]).cash;
 return {recv,spent,spentX,given,pers,persOut,hold,hand,adv,fra,cash,cashMain,cashFine,placed,diff,last,iOweOthers,warn,
  parts:[["Cash with me",cash,"cash"],["Spent (expenses only)",spentX,"spent"],["Given to people (they owe me)",given,"given"],["My personal take",pers,"pers"],["Given to principal",hand,"hand"],["Held by others (waiting for voucher)",hold,"hold"],["Advances with others",adv,"adv"],["Fine restored by adjustment",fra,"adj"]]};
}
