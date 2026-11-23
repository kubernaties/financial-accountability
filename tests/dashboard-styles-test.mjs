// Renders every dashboard style with synthetic data and checks the basics (Node only).
import fs from "node:fs";
const src=fs.readFileSync(new URL("./smoke-test.mjs",import.meta.url),"utf8").split("\n");
// Reuse the same fake browser + sample data as the smoke test (everything before the first import/render).
const setupEnd=src.findIndex(l=>l.startsWith("const {")||l.startsWith("import(")||l.includes("await import"));
eval(src.slice(3,setupEnd>0?setupEnd:16).join("\n"));
const {state}=await import("../js/core/store.js");
const {dashboardShell,STYLES,SKINS}=await import("../js/ui/dashboard-layout.js");
const {dashboardPages}=await import("../js/ui/pages/dashboard.js");
let bad=0;const t=(n,c)=>{if(!c){bad++;console.log("FAIL",n);}else console.log("PASS",n);};
t("at least 10 styles",STYLES.length>=10);
t("classic kept",STYLES.some(s=>s[0]==="classic"));
for(const [id] of STYLES){
 state.dash={v:4,style:id,skin:"default",order:[],hidden:[]};
 let h="";try{h=dashboardPages.dashboard();}catch(e){console.log(e);}
 t(`${id} renders`,h.length>500&&!h.includes("undefined"));
 if(!["classic","essentials","tabs","focus","mock"].includes(id)){
  t(`${id} owed list shows fund + person + details`,h.includes("People who owe me")&&h.includes("data-owed")&&h.includes("Given from"));
 }
 if(!["classic","tabs","hero","focus","mock"].includes(id)){
  const a=h.indexOf("Total received"),b=h.indexOf("People who owe me");
  t(`${id} received before owed`,a>=0&&b>=0&&a<b);
 }
}
state.dash={v:4,style:"new",skin:"default",order:[],hidden:[]};
const h=dashboardPages.dashboard();
t("Spent from funds is red",h.includes("out-card")&&h.includes("Spent from funds"));
t("Given to people is red",h.includes("Given to people (they owe me)"));
state.dash={v:4,style:"bogus",skin:"x"};
t("bad saved style falls back",dashboardPages.dashboard().includes("data-layout=\"new\""));
// Focus: the new default
state.dash={};
let f=dashboardPages.dashboard();
t("default is Day by day after one-time move",state.dash.style==="mock"&&state.dash.skin==="comfort"&&state.dash.fineTogether===false);
state.dash={v:4,style:"focus",skin:"comfort",fineTogether:false,order:[],hidden:[]};f=dashboardPages.dashboard();
t("Fine separate by default (two cards)",f.slice(f.indexOf("fx-boards"),f.indexOf("People who owe me")).includes("Fine money only")&&!f.includes("Main + Fine together"));
t("Focus shows owed people with fund and details",f.includes("People who owe me")&&f.includes("data-owed")&&f.includes("from Main"));
t("Focus money out is red",f.includes("out-text"));
t("Focus has the Fine toggle",f.includes('data-fine-mode="together"'));
state.dash.fineTogether=true;
f=dashboardPages.dashboard();
const top=x=>x.slice(x.indexOf("fx-boards"),x.indexOf("People who owe me"));
t("Fine together shows one combined card",top(f).includes("Main + Fine together")&&!top(f).includes("Fine money only"));
state.dash={v:4,style:"classic",skin:"default"};
t("an explicit later choice is kept",dashboardPages.dashboard()&&state.dash.style==="classic");
// Day by day (my design) + add anything on any day
state.dash={v:4,style:"mock",skin:"comfort",fineTogether:false,order:[],hidden:[]};
const mk=dashboardPages.dashboard();
const order=["November","Add anything, on any day","Where is every taka","Main income board","2. Fine board","Loans, change, money waiting for a voucher","Spending by category","Vouchers","Last 6 months"].map(x=>mk.indexOf(x));
t("mock has every part in the design order",order.every((x,i)=>x>=0&&(i===0||x>order[i-1])));
state.dash={v:4,style:"smart",skin:"comfort",fineTogether:false,order:[],hidden:[]};
const sm=dashboardPages.dashboard();
t("smart has hero, owed list, add form, boards",["Still to give the principal","People who owe me","Add anything, on any day","Day by day: Main and Fine boards","Spending by category","Last 6 months"].every(x=>sm.includes(x)));
t("smart Fine separate shows two board cards",sm.includes("sm-boards"));
state.dash.fineTogether=true;
t("smart Fine together hides separate cards",!dashboardPages.dashboard().includes("sm-boards"));
state.dash={v:3,style:"classic",skin:"default"};dashboardPages.dashboard();
t("old saved settings move to Day by day once",state.dash.v===4&&state.dash.style==="mock");
state.dash={v:4,style:"mock",skin:"comfort",fineTogether:false,order:[],hidden:[]};
const {addEntry}=await import("../js/ui/inline-add.js");
const {boardMonth,BOARDS}=await import("../js/finance/boards.js");
const base=BOARDS.map(b=>boardMonth(b,"2026-10"));
t("rejects a zero amount",addEntry({board:"main",date:"2026-10-05",type:"expense",amount:0})!=="");
t("adds an old-date expense to Main",addEntry({board:"main",date:"2026-10-05",type:"expense",who:"",amount:250,note:"Old bill"})===""&&boardMonth(BOARDS[0],"2026-10").spent===base[0].spent+250);
t("adds a fine collection to Fine only",addEntry({board:"fine",date:"2026-10-06",type:"collection",who:"S9",amount:100,note:"late"})===""&&boardMonth(BOARDS[1],"2026-10").had===base[1].had+100&&boardMonth(BOARDS[0],"2026-10").had===base[0].had);
t("someone took money shows under owed with fund",addEntry({board:"fine",date:"2026-10-07",type:"took",who:"Karim sir",amount:75})===""&&dashboardPages.dashboard().includes("Karim sir"));
process.exit(bad?1:0);
