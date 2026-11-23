// Checks the Main/Fine board maths with a realistic month. Run: node tests/boards-test.mjs
import assert from "node:assert/strict";
globalThis.localStorage={getItem:()=>null,setItem(){},removeItem(){}};
globalThis.window=globalThis;globalThis.document={querySelector:()=>null,querySelectorAll:()=>[],addEventListener(){},body:{}};
globalThis.addEventListener=()=>{};
const {state}=await import("../js/core/store.js");
const B=await import("../js/finance/boards.js");
const C=await import("../js/finance/calculations.js");

const rec=(o)=>({status:"Recorded",timestamp:"2026-11-01T00:00:00Z",...o});
const day=n=>`2026-11-${String(n).padStart(2,"0")}`;
state.collections.push(rec({id:"c1",collectionDate:day(2),category:"Monthly fees",amount:12000,description:"Admission fee"}),
 rec({id:"c2",collectionDate:day(2),category:"Examination fees",amount:8000,description:"Exam form"}),
 rec({id:"c3",collectionDate:day(3),category:"Fines",amount:1200,description:"Late fees"}));
state.expenses.push(rec({id:"e1",date:day(2),amount:800,category:"Printing",actualPayer:"You",fundedBy:"Regular fund"}),
 rec({id:"e2",date:day(2),amount:1000,category:"Wi-Fi & Internet",actualPayer:"You",fundedBy:"Regular fund"}),
 rec({id:"e3",date:day(5),amount:1200,category:"Maintenance",actualPayer:"You",fundedBy:"Regular fund"}),
 rec({id:"e4",date:day(8),amount:300,category:"Miscellaneous",actualPayer:"You",fundedBy:"Fine fund"}),
 rec({id:"e5",date:day(12),amount:400,category:"Maintenance",actualPayer:"Teacher",fundedBy:"Regular fund",reimbursedAmount:0,reimbursementStatus:"Awaiting reimbursement"}));
state.handovers.push(rec({id:"h1",date:day(6),amount:5000,recipient:"Principal",fund:"Regular fund",status:"Pending"}));
state.holds.push(rec({id:"hold1",date:day(8),amount:700,recipient:"Rahim",fund:"Regular fund",purpose:"Lab cable",returns:[]}));
state.custom.push(
 rec({id:"u1",date:day(9),amount:1000,label:"Karim sir took money",direction:"Someone owes me",fund:"Regular fund",party:"Other",returns:[{id:"r1",amount:400,date:day(12)}]}),
 rec({id:"u2",date:day(14),amount:500,label:"Personal",direction:"I took personal money",fund:"Regular fund",party:"Other",returns:[]}),
 rec({id:"u3",date:day(15),amount:40,label:"Extra change to Sabbir",direction:"Someone owes me",fund:"Regular fund",party:"Student",returns:[]}),
 rec({id:"u4",date:day(15),amount:150,label:"Change owed to Mitu",direction:"I owe someone",fund:"Regular fund",party:"Student",returns:[]}));

const [main,fine]=B.BOARDS;
const m=B.boardMonth(main,"2026-11"),f=B.boardMonth(fine,"2026-11");
assert.equal(m.cash,10310);assert.equal(m.should,16600);assert.equal(m.still,11600);
assert.equal(m.had,20000);assert.equal(m.given,5000);
assert.equal(f.cash,900);assert.equal(f.still,900);
assert.equal(B.mustGivePrincipal(),12500);

// identity: still = cash + owed to me + personal - I owe - netted
const ob=B.obligations();
for(const b of B.BOARDS){
 const t=B.boardTotals(b),pick=l=>l.filter(x=>x.fund===b.fund&&!x.netted).reduce((n,x)=>n+x.amount,0),net=ob.owedMe.filter(x=>x.fund===b.fund&&x.netted).reduce((n,x)=>n+x.amount,0);
 assert.equal(Math.round((t.cash+pick(ob.owedMe)+pick(ob.personal)-pick(ob.iOwe)-net)*100)/100,t.still,b.id+" identity");
}
// a back-dated entry changes balances after its date and the next month opens with the leftover
state.custom.push(rec({id:"u5",date:day(3),amount:100,label:"Money out",direction:"Money out",fund:"Regular fund",countsExpense:"No",returns:[]}));
const m2=B.boardMonth(main,"2026-11");assert.equal(m2.cash,10210);
const dec=B.boardMonth(main,"2026-12");assert.equal(dec.open.cash,10210);assert.equal(dec.open.still,11500);
// cash must match the app's own fund maths for the Regular and Fine funds
const fundSum=C.fundFlow("Regular fund").left+C.fundFlow("Fine fund").left;
const boardSum=B.BOARDS.reduce((n,b)=>n+B.boardTotals(b).cash,0);
assert.equal(Math.round((boardSum)*100)/100,Math.round((fundSum-C.handoverTotal()-C.advanceNetOut())*100)/100);
console.log("boards tests OK");
