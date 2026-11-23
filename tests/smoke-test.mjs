// Regression/smoke test (Node only, never loaded by the website).
// Renders every screen with SYNTHETIC test records and prints the HTML so two versions can be compared.
// Usage: node tests/smoke-test.mjs [path-to-module-exporting-pages]
const store={};
globalThis.localStorage={getItem:k=>store[k]??null,setItem:(k,v)=>{store[k]=String(v)},removeItem:k=>{delete store[k]}};
const el=()=>({innerHTML:"",classList:{toggle(){},remove(){}},addEventListener(){},querySelector:()=>null,querySelectorAll:()=>[],dataset:{},before(){},remove(){}});
globalThis.document={documentElement:{dataset:{}},querySelector:()=>el(),querySelectorAll:()=>[],addEventListener(){},body:{insertAdjacentHTML(){},append(){}},createElement:()=>el(),hidden:false};
globalThis.window={addEventListener(){},print(){}};globalThis.location={hash:""};
const d="2026-11-01",ok={status:"Recorded"};
store["fa-state"]=JSON.stringify({collections:[{id:"C1",collectionDate:d,person:"S1",category:"Monthly fees",amount:5000,...ok},{id:"C2",collectionDate:d,person:"S2",category:"Fines",amount:700,...ok}],
 expenses:[{id:"E1",date:d,category:"Photocopy",actualPayer:"You",fundedBy:"Regular fund",amount:300,...ok},{id:"E2",date:d,category:"Water",actualPayer:"Teacher",fundedBy:"Regular fund",amount:200,reimbursementStatus:"Pending",...ok}],
 handovers:[{id:"H1",date:d,recipient:"Principal",amount:1000,...ok}],holds:[{id:"HD1",date:d,recipient:"X",fund:"Regular fund",amount:400,returns:[],...ok}],
 advances:[{id:"A1",recipient:"Y",date:d,amount:500,returned:0,spent:100,repayments:[],status:"Open"}],
 custom:[{id:"U1",date:d,label:"Student change",amount:150,direction:"I owe someone",fund:"Regular fund",party:"Other",countsExpense:"No",returns:[],...ok},{id:"U2",date:d,label:"Loan",amount:90,direction:"Someone owes me",fund:"Regular fund",party:"Principal",countsExpense:"No",returns:[],...ok}],
 transfers:[{id:"T1",date:d,from:"Regular fund",to:"Fine fund",amount:100,...ok}],adjustments:[],periods:[],monthly:[],vouchers:[{id:"V1",date:d,category:"Water",amount:200,payer:"Teacher",verification:"Pending",...ok}],
 fines:[],audit:[{id:"AUD1",timestamp:"2026-11-01T00:00:00.000Z",action:"test",user:"USR-OWNER"}],cashCounts:[{id:"N1",at:"2026-11-02T00:00:00.000Z",counted:3000,expected:3100,diff:-100}]});
store["fa-logs"]=JSON.stringify([{id:"L1",t:"2026-11-02T10:00:00.000Z",device:"DEV-T",session:"s",kind:"bug",level:"error",msg:"<script>alert(1)</script>",detail:{file:"a.js",line:3,stack:"<img src=x onerror=alert(1)>"},ip:"203.0.113.9",agent:"Chrome/1 on Android",screen:"1x1",page:"dashboard"},{id:"L2",t:"2026-11-02T10:01:00.000Z",device:"DEV-T",session:"s",kind:"visit",level:"info",msg:"App opened",detail:{},ip:"203.0.113.9",agent:"Chrome/1 on Android",screen:"1x1",page:"dashboard"},{id:"L3",t:"2026-11-02T10:02:00.000Z",device:"DEV-T",session:"s",kind:"security",level:"warn",msg:"Wrong passphrase",detail:{},ip:"198.51.100.4",agent:"Firefox/1 on Windows",screen:"1x1",page:"settings"}]);
const mod=await import(process.argv[2]||"../js/ui/pages/index.js");
for(const k of Object.keys(mod.pages))console.log("=== "+k+"\n"+mod.pages[k]());
if(!process.argv[2]){ // new screens (only exist in the modular version)
 console.log("=== EXTRA");
 const {view}=await import("../js/ui/view-state.js"),lp=await import("../js/ui/logs-page.js");
 for(const t of ["traffic","bugs","security","sync","all"]){view.logTab=t;console.log(lp.logsPage());}
 console.log((await import("../js/ui/cash-counter.js")).counterPage());console.log((await import("../js/ui/demo-page.js")).demoPage());
}
