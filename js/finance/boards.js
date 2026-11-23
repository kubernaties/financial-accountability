/**
 * The two money boards: Main income (Regular fund) and Fine (Fine fund).
 * Every saved record is turned into dated events. Each event says what it does to
 *   cash      : money physically with you,
 *   should    : money you must hand to the principal (collected minus real expenses),
 *   given     : money already handed to the principal.
 * Still need to give = should - given.  Cash carries over from month to month, so the leftover
 * of one month is automatically the opening balance of the next. No screen code here.
 */
import {state} from "../core/store.js";
import {active, num} from "../core/utils.js";
import {FINE, PERS, REG, customList, customOutstanding, fundOf, holdList, holdOutstanding, restoreRecs, transferList} from "./calculations.js";

export const BOARDS=[{id:"main",fund:REG,title:"Main income board"},{id:"fine",fund:FINE,title:"Fine board"}];
export const boardById=id=>BOARDS.find(b=>b.id===id)||BOARDS[0];

/** kind -> [label, colour name]. */
export const KINDS={
 in:["Collection","green"],fin:["Fine collected","green"],mi:["Money in","green"],
 ex:["Expense","red"],mo:["Money out","red"],tp:["Teacher paid","grey"],rb:["Teacher paid back","red"],rp:["Principal paid the teacher","grey"],
 pp:["Paid by principal","grey"],vr:["Voucher received","grey"],hd:["Money on hold","amber"],hr:["Held money returned","green"],
 lt:["Someone took money","teal"],lr:["Money came back","green"],ow:["Money I owe","grey"],op:["I paid it back","red"],
 per:["I took personal money","pink"],pr:["Personal money put back","green"],gp:["Given to principal","blue"],
 tr:["Moved between funds","grey"],fr:["Fine restored (adjustment)","grey"],adv:["Advance given","amber"],ar:["Advance returned","green"],adj:["Principal owes me","grey"]
};
export const EXPENSE_KINDS=["ex","tp","vr"];
const INCOME_KINDS=["in","fin","mi"];
const R2=n=>Math.round(n*100)/100;
const sumBy=(l,f)=>R2(l.reduce((n,e)=>n+f(e),0));
const dOf=(x,...keys)=>{for(const k of keys){if(x&&x[k])return String(x[k]).slice(0,10);}return String(x?.timestamp||x?.createdAt||"").slice(0,10)||"0000-00-00";};

/** Every dated event of one fund, oldest first. */
export function events(fund){
 const out=[],tag=fund===FINE?"fine":"main";
 const add=(k,d,v,o)=>out.push({k,d,v:num(v),cash:0,should:0,given:0,who:"",desc:"",cat:"",sk:"",src:null,ts:"",...o});

 active(state.collections).forEach(c=>{
  const fine=c.category==="Fines";if(fine!==(fund===FINE))return;const a=num(c.amount);
  add(fine?"fin":"in",dOf(c,"collectionDate"),a,{cash:a,should:a,who:c.person||"",desc:c.description||c.category||"Collection",cat:c.category||"Other",src:c,sk:"collection",sourceCollectionId:c.id,ts:c.timestamp});
 });
 if(fund===FINE)active(state.fines).filter(f=>f.source==="Fine collection").forEach(f=>{
  const a=num(f.amount);add("fin",dOf(f,"date"),a,{cash:a,should:a,desc:f.reason||"Fine collection",cat:"Fines",src:f,sk:"fine",ts:f.timestamp});
 });
 restoreRecs().forEach(f=>{
  const a=num(f.amount),d=dOf(f,"date"),viaAdj=f.source==="Account adjustment"||f.status==="Settled through adjustment";
  if(fund===FINE){
   if(viaAdj)add("fr",d,a,{desc:f.reason||"Fine money settled through an adjustment",cat:"Fines",src:f,sk:"fine",ts:f.timestamp});
   else add("tr",d,a,{cash:a,should:a,desc:"Fine money put back"+(f.reason?": "+f.reason:""),cat:"Fines",src:f,sk:"fine",ts:f.timestamp});
  }
  if(fund===REG&&f.source==="Other income")add("tr",d,a,{cash:-a,should:-a,desc:"Put back into the fine fund",src:f,sk:"fine",ts:f.timestamp});
 });

 active(state.expenses).forEach(x=>{
  if(fundOf(x)!==fund)return;const a=num(x.amount);
  const base={who:x.actualPayer||"",desc:x.description||x.category||"Expense",cat:x.category||"Uncategorised",src:x,sk:"expense",sourceCollectionId:x.sourceCollectionId||"",ts:x.timestamp};
  if(x.holdId)add("vr",dOf(x,"date"),a,{...base,who:"",should:-a});
  else if(x.actualPayer==="Teacher")add("tp",dOf(x,"date"),a,{...base,should:-a});
  else if(x.actualPayer==="Principal")add("pp",dOf(x,"date"),a,base);
  else add("ex",dOf(x,"date"),a,{...base,cash:-a,should:-a});
 });
 const liveExp=new Map(active(state.expenses).map(x=>[x.id,x]));
 (state.reimbursements||[]).forEach(r=>{
  const x=liveExp.get(r.expenseId);if(!x)return;const a=num(r.amount),d=dOf(r,"date");
  const base={who:"Teacher",desc:"Paid back: "+(x.description||x.category||"expense"),cat:x.category||"Uncategorised",src:x,sk:"expense",ts:r.createdAt};
  if(r.fund===fund)add("rb",d,a,{...base,cash:-a});
  else if(r.fund==="Principal paid directly"&&fundOf(x)===fund)add("rp",d,a,{...base,who:"Principal",should:a});
 });

 holdList().filter(h=>h.fund===fund).forEach(h=>{
  const a=num(h.amount);
  add("hd",dOf(h,"date"),a,{cash:-a,who:h.recipient||"",desc:h.purpose||"Money given, waiting for voucher",src:h,sk:"hold",ts:h.timestamp});
  (h.returns||[]).forEach(r=>add("hr",dOf(r,"date"),r.amount,{cash:num(r.amount),who:h.recipient||"",desc:"Held money returned"+(r.note?": "+r.note:""),src:h,sk:"hold",ts:r.createdAt}));
 });

 active(state.handovers).forEach(h=>{
  if((h.fund===FINE?FINE:REG)!==fund)return;const a=num(h.amount);
  add("gp",dOf(h,"date"),a,{cash:-a,given:a,who:h.recipient||"Principal",desc:"Given to principal"+(h.status==="Accounted"?" (accounted)":""),src:h,sk:"handover",sourceCollectionId:h.sourceCollectionId||"",ts:h.timestamp});
 });

 customList().filter(c=>c.fund===fund).forEach(c=>{
  const a=num(c.amount),d=dOf(c,"date"),name=c.label||c.note||"Custom entry";
  const base={who:c.party||"",desc:name,cat:"Custom entries",src:c,sk:"custom",ts:c.timestamp};
  const rets=(c.returns||[]).map(r=>({...r,d:dOf(r,"date"),a:num(r.amount)}));
  if(c.direction==="Money in")add("mi",d,a,{...base,cash:a,should:a});
  else if(c.direction==="Money out")add(c.countsExpense==="Yes"?"ex":"mo",d,a,{...base,cash:-a,should:-a});
  else if(c.direction==="Someone owes me"){add("lt",d,a,{...base,cash:-a});rets.forEach(r=>add("lr",r.d,r.a,{...base,cash:r.a,desc:name+" (came back)",ts:r.createdAt}));}
  else if(c.direction==="I owe someone"){const p=c.party==="Principal";add("ow",d,a,{...base,cash:a,should:p?a:0});rets.forEach(r=>add("op",r.d,r.a,{...base,cash:-r.a,should:p?-r.a:0,desc:name+" (paid back)",ts:r.createdAt}));}
  else if(c.direction===PERS){add("per",d,a,{...base,cash:-a});rets.forEach(r=>add("pr",r.d,r.a,{...base,cash:r.a,desc:name+" (put back)",ts:r.createdAt}));}
 });

 transferList().forEach(t=>{
  const a=num(t.amount),d=dOf(t,"date");
  if(t.from===fund)add("tr",d,a,{cash:-a,should:-a,desc:"Moved to "+t.to+(t.note?": "+t.note:""),src:t,sk:"transfer",ts:t.timestamp});
  if(t.to===fund)add("tr",d,a,{cash:a,should:a,desc:"Moved from "+t.from+(t.note?": "+t.note:""),src:t,sk:"transfer",ts:t.timestamp});
 });

 if(fund===REG){
  active(state.advances).forEach(x=>{
   const a=num(x.amount),d=dOf(x,"date"),base={who:x.recipient||"",desc:x.purpose||"Advance",src:x,sk:"advance",ts:x.timestamp};
   add("adv",d,a,{...base,cash:-a});
   if(num(x.returned)>0)add("ar",d,x.returned,{...base,cash:num(x.returned),desc:(x.purpose||"Advance")+" (returned)"});
   (x.repayments||[]).forEach(r=>add("ar",dOf(r,"date"),r.amount,{...base,cash:num(r.amount),desc:(x.purpose||"Advance")+" (repaid)",ts:r.createdAt}));
  });
  active(state.adjustments).filter(x=>x.credit==="Principal payable").forEach(x=>{
   const a=num(x.amount);add("adj",dOf(x,"date"),a,{should:-a,desc:x.reason||"Principal owes me",who:"Principal",src:x,sk:"adjustment",ts:x.timestamp});
  });
 }

 out.sort((x,y)=>x.d<y.d?-1:x.d>y.d?1:0);
 out.forEach((e,i)=>{e.key=tag+":"+i;});
 return out;
}
export const eventByKey=key=>{const [t,i]=String(key).split(":");return events(t==="fine"?FINE:REG)[Number(i)]||null;};
const totalOf=l=>({cash:sumBy(l,e=>e.cash),should:sumBy(l,e=>e.should),given:sumBy(l,e=>e.given)});

/** One board for one month: opening balance carried in, day-by-day rows, month figures, closing figures. */
export function boardMonth(board,month){
 const ev=events(board.fund),start=month+"-01",stop=month+"-99";
 const before=ev.filter(e=>e.d<start),inM=ev.filter(e=>e.d.slice(0,7)===month),upto=ev.filter(e=>e.d<=stop);
 const open=totalOf(before),all=totalOf(upto);
 let run=open.cash;
 const days=[...new Set(inM.map(e=>e.d))].sort().map(d=>{
  const rows=inM.filter(e=>e.d===d);run=R2(run+sumBy(rows,e=>e.cash));
  return {d,rows,spent:sumBy(rows.filter(e=>EXPENSE_KINDS.includes(e.k)),e=>e.v),left:run};
 });
 const still=Math.max(0,R2(all.should-all.given)),overGiven=Math.max(0,R2(all.given-all.should));
 const cashRaw=all.cash, cash=Math.max(0,R2(cashRaw)),shortfall=Math.max(0,R2(-cashRaw));
 const takenOut=customOutstandingTotal(board.fund);
 return {board,month,open:{cash:Math.max(0,open.cash),cashRaw:open.cash,shortfall:Math.max(0,-open.cash),still:Math.max(0,R2(open.should-open.given)),overGiven:Math.max(0,R2(open.given-open.should))},
  had:sumBy(inM.filter(e=>INCOME_KINDS.includes(e.k)),e=>e.v),
  spent:sumBy(inM.filter(e=>EXPENSE_KINDS.includes(e.k)),e=>e.v),
  given:sumBy(inM,e=>e.given),cash,cashRaw,shortfall,should:all.should,givenAll:all.given,still,overGiven,takenOut,unexplained:0,
  days,neg:days.filter(x=>x.left<-0.005).map(x=>x.d),upto};
}
/** Everything, all dates, both boards. */
function customOutstandingTotal(fund){return customList().filter(c=>c.fund===fund&&c.direction==="Someone owes me").reduce((n,c)=>n+customOutstanding(c),0)+holdList().filter(h=>h.fund===fund).reduce((n,h)=>n+holdOutstanding(h),0)+(fund===REG?active(state.advances).reduce((n,a)=>n+Math.max(0,num(a.amount)-num(a.returned)-sumBy(a.repayments||[],r=>num(r.amount))),0):0);}
export function boardTotals(board){const t=totalOf(events(board.fund));return {...t,cashRaw:t.cash,cash:Math.max(0,t.cash),shortfall:Math.max(0,R2(-t.cash)),still:Math.max(0,R2(t.should-t.given)),overGiven:Math.max(0,R2(t.given-t.should)),takenOut:customOutstandingTotal(board.fund),unexplained:0};}
export function mustGivePrincipal(){return R2(BOARDS.reduce((n,b)=>n+Math.max(0,R2(boardTotals(b).should-boardTotals(b).given)),0));}

/** Group the effect of events by type, for the "how is this calculated" window. */
export function breakdown(events_,field){
 const m=new Map();events_.forEach(e=>{const v=e[field];if(!v)return;m.set(e.k,R2((m.get(e.k)||0)+v));});
 return [...m.entries()].filter(x=>Math.abs(x[1])>0.004).map(([k,v])=>({k,label:KINDS[k][0],value:v}));
}

/** Who owes whom right now, from the saved records. */
export function obligations(){
 const owedMe=[],iOwe=[],personal=[];
 const add=(l,x)=>l.push({date:"",sub:"",fund:"",netted:false,...x});
 customList().forEach(c=>{
  const o=customOutstanding(c);if(o<=0)return;
  const x={name:c.label||c.party||"Someone",sub:c.party||"",amount:o,fund:c.fund||"No fund",date:c.date||"",sk:"custom",src:c};
  if(c.direction==="Someone owes me")add(owedMe,{...x,kind:"Took money"});
  else if(c.direction==="I owe someone"&&c.party!=="Principal")add(iOwe,{...x,kind:"Money I owe"});
  else if(c.direction===PERS)add(personal,{...x,name:c.label||"Personal money",kind:"Personal take"});
 });
 holdList().forEach(h=>{const o=holdOutstanding(h);if(o>0)add(owedMe,{name:h.recipient||"Someone",sub:"Waiting for voucher",amount:o,fund:h.fund,date:h.date||"",kind:"Waiting for voucher",sk:"hold",src:h});});
 active(state.advances).forEach(a=>{
  const o=Math.max(0,num(a.amount)-num(a.returned)-(a.repayments||[]).reduce((n,r)=>n+num(r.amount),0));
  if(o>0)add(owedMe,{name:a.recipient||"Someone",sub:"Advance",amount:o,fund:REG,date:a.date||"",kind:"Advance",sk:"advance",src:a});
 });
 active(state.adjustments).filter(a=>a.credit==="Principal payable"&&num(a.amount)>0).forEach(a=>add(owedMe,{name:"Principal",sub:"Adjustment",amount:num(a.amount),fund:REG,date:a.date||"",kind:"Principal owes me",netted:true,sk:"adjustment",src:a}));
 active(state.expenses).filter(x=>x.actualPayer==="Teacher").forEach(x=>{
  const o=Math.max(0,num(x.amount)-num(x.reimbursedAmount));
  if(o>0)add(iOwe,{name:"Teacher",sub:x.description||x.category||"Expense",amount:o,fund:fundOf(x),date:x.date||"",kind:"Teacher paid",sk:"expense",src:x});
 });
 const t=l=>R2(l.filter(x=>!x.netted).reduce((n,x)=>n+x.amount,0));
 return {owedMe,iOwe,personal,totals:{owedMe:t(owedMe),iOwe:t(iOwe),personal:t(personal)}};
}

/** Accountability records: one per month and board, kept in state.boardClose (merged additively when syncing). */
export const closeId=(month,board)=>`BC-${month}-${board.id}`;
export const closeRec=(month,board)=>(state.boardClose||[]).find(r=>r.id===closeId(month,board))||null;
export const isClosed=(month,board)=>closeRec(month,board)?.status==="Closed";
