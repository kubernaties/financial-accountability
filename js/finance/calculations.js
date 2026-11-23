/**
 * ALL money formulas: collected, spent, cash in hand, fund balances, holds, advances, owed to/by me. Pure functions over the saved records; no screen code.
 */
import {state} from "../core/store.js";
import {active, money, num, sum} from "../core/utils.js";

export function regularCollections(){return sum(active(state.collections).filter(x=>x.category!=="Fines")); }
export function fineCollections(){return sum(active(state.collections).filter(x=>x.category==="Fines")); }
export function expenseTotal(){return sum(active(state.expenses))+sum(customList().filter(c=>c.direction==="Money out"&&c.countsExpense==="Yes"));}
export function cashPaidExpenses(){return sum(active(state.expenses).filter(x=>x.actualPayer==="You")); }
export function handoverTotal(){return sum(active(state.handovers));}
export function advanceOutstanding(){return sum(active(state.advances).map(a=>({amount:Math.max(0,num(a.amount)-num(a.returned)-num(a.spent)-sum(a.repayments||[], "amount"))})));}
export function owedToOthers(){return sum(active(state.expenses).filter(x=>x.actualPayer==="Teacher"&&!["Paid","N/A"].includes(x.reimbursementStatus||"")).map(x=>({amount:Math.max(0,num(x.amount)-num(x.reimbursedAmount))})));}
export function owedToPrincipal(){return Math.max(0,regularCollections()+fineCollected()-handoverTotal()-cashPaidExpenses()-sum(active(state.adjustments).filter(a=>a.credit==="Principal payable")))+sum(customList().filter(c=>c.direction==="I owe someone"&&c.party==="Principal").map(c=>({amount:customOutstanding(c)})));}

export const FINE="Fine fund",REG="Regular fund",PRIN="Principal's money",PERS="I took personal money";
export const customList=()=>active(state.custom||[]);
export const fundOf=x=>["Regular fund","Fine fund","Principal's money","Other fund"].includes(x.fundedBy)?x.fundedBy:"Regular fund";
export const reimbPaid=f=>{const ids=new Set(active(state.expenses).map(x=>x.id));return sum((state.reimbursements||[]).filter(r=>r.fund===f&&ids.has(r.expenseId)));};
export const customRet=c=>sum(c.returns||[],"amount");
export const isOwed=c=>["Someone owes me","I owe someone",PERS].includes(c.direction);
export const customOutstanding=c=>isOwed(c)?Math.max(0,num(c.amount)-customRet(c)):0;
export function customNet(c){const a=num(c.amount),r=customRet(c);
 if(c.direction==="Money in")return {inn:a,out:0};
 if(c.direction==="Money out")return {inn:0,out:a};
 if(c.direction==="Someone owes me")return {inn:r,out:a};
 if(c.direction==="I owe someone")return {inn:a,out:r};
 if(c.direction===PERS)return {inn:r,out:a};
 return {inn:0,out:0};}
export const restoreRecs=()=>active(state.fines).filter(f=>f.source!=="Fine collection"&&["Restored","Settled through adjustment"].includes(f.status));
export const fineRestored=()=>sum(restoreRecs());
export const fineRestoredFromRegular=()=>sum(restoreRecs().filter(f=>f.source==="Other income"));
export const fineRestoredByAdjustment=()=>sum(restoreRecs().filter(f=>f.source==="Account adjustment"||f.status==="Settled through adjustment"));
export const fineCollected=()=>fineCollections()+sum(active(state.fines).filter(f=>f.source==="Fine collection"));
export const fineUsed=()=>sum(active(state.expenses).filter(x=>fundOf(x)===FINE&&x.actualPayer==="You"))+reimbPaid(FINE);
export const finePending=()=>Math.max(0,fineUsed()-fineRestored());
export const advanceNetOut=()=>sum(active(state.advances).map(a=>({amount:Math.max(0,num(a.amount)-num(a.returned)-sum(a.repayments||[],"amount"))})));
export function fundList(){const l=[REG,FINE,PRIN];if(active(state.expenses).some(x=>fundOf(x)==="Other fund"&&x.actualPayer==="You"))l.push("Other fund");return l;}
export function fundFlow(f){let inn=0,out=0,back=0,hold=0,tin=0,tout=0;
 if(f===REG)inn+=regularCollections();
 if(f===FINE)inn+=fineCollected()+fineRestored();
 active(state.expenses).filter(x=>fundOf(x)===f&&x.actualPayer==="You").forEach(x=>{out+=num(x.amount);});
 out+=reimbPaid(f);
 customList().filter(c=>c.fund===f).forEach(c=>{const n=customNet(c);inn+=n.inn;out+=n.out;if(c.direction==="Someone owes me")back+=customOutstanding(c);});
 if(f===REG)out+=fineRestoredFromRegular();
 holdList().filter(h=>h.fund===f).forEach(h=>{hold+=holdOutstanding(h);});
 transferList().forEach(t=>{if(t.to===f)tin+=num(t.amount);if(t.from===f)tout+=num(t.amount);});
 return {inn,out,hold,tin,tout,left:inn-out-hold+tin-tout,back};}
export function moneyInHand(){return fundList().reduce((n,f)=>n+fundFlow(f).left,0)-handoverTotal()-advanceNetOut()-fineRestoredByAdjustment();}
export const holdList=()=>active(state.holds||[]);
export const holdSettled=h=>sum(active(state.expenses).filter(x=>x.holdId===h.id));
export const holdReturned=h=>sum(h.returns||[],"amount");
export const holdOutstanding=h=>Math.max(0,num(h.amount)-holdSettled(h)-holdReturned(h));
export const holdTotal=()=>sum(holdList().map(h=>({amount:holdOutstanding(h)})));
export const holdStatus=h=>{if(["Void","Voided","Reversed"].includes(h.status))return h.status;const o=holdOutstanding(h);
 if(o>0)return holdSettled(h)||holdReturned(h)?"Partly settled":"Pending voucher";
 return holdSettled(h)?"Settled":"Returned";};
export const transferList=()=>active(state.transfers||[]);
export function principalOwesYou(){return sum(active(state.adjustments).filter(a=>a.credit==="Principal payable"))+sum(customList().filter(c=>c.direction==="Someone owes me"&&c.party==="Principal").map(c=>({amount:customOutstanding(c)})));}
export function othersOweYou(){return sum(customList().filter(c=>c.direction==="Someone owes me"&&c.party!=="Principal").map(c=>({amount:customOutstanding(c)})))+advanceOutstanding();}

export function stillToGetBack(){return principalOwesYou()+othersOweYou()+holdTotal();}
