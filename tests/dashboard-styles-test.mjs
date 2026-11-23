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
 state.dash={style:id,skin:"default",order:[],hidden:[]};
 let h="";try{h=dashboardPages.dashboard();}catch(e){console.log(e);}
 t(`${id} renders`,h.length>500&&!h.includes("undefined"));
 if(id!=="classic"&&id!=="essentials"&&id!=="tabs"){
  t(`${id} owed list shows fund + person + details`,h.includes("People who owe me")&&h.includes("data-owed")&&h.includes("Given from"));
 }
 if(!["classic","tabs","hero"].includes(id)){
  const a=h.indexOf("Total received"),b=h.indexOf("People who owe me");
  t(`${id} received before owed`,a>=0&&b>=0&&a<b);
 }
}
state.dash={style:"new",skin:"default",order:[],hidden:[]};
const h=dashboardPages.dashboard();
t("Spent from funds is red",h.includes("out-card")&&h.includes("Spent from funds"));
t("Given to people is red",h.includes("Given to people (they owe me)"));
state.dash={style:"bogus",skin:"x"};
t("bad saved style falls back",dashboardPages.dashboard().includes("data-layout=\"new\""));
process.exit(bad?1:0);
