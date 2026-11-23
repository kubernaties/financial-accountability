// Failure-mode tests (Node only). Each scenario runs in its own process: node tests/robustness-test.mjs
import {spawnSync} from "node:child_process";
const sc=process.argv[2];
if(!sc){let bad=0;for(const s of ["corrupt","merge","date","boundary","guard","badcfg"]){const r=spawnSync(process.execPath,[new URL(import.meta.url).pathname,s],{encoding:"utf8",timeout:30000});
 const ok=r.status===0;if(!ok)bad++;console.log((ok?"PASS ":"FAIL ")+s+(ok?"":"\n"+r.stdout+r.stderr));}process.exit(bad?1:0);}
const store={},els={};
globalThis.localStorage={getItem:k=>store[k]??null,setItem:(k,v)=>{store[k]=String(v)},removeItem:k=>{delete store[k]},get length(){return Object.keys(store).length}};
const el=()=>({innerHTML:"",textContent:"",classList:{toggle(){},remove(){}},addEventListener(){},querySelector:()=>null,querySelectorAll:()=>[],dataset:{},before(){},remove(){}});
globalThis.document={documentElement:{dataset:{}},querySelector:s=>els[s]||(els[s]=el()),querySelectorAll:()=>[],addEventListener(){},body:{insertAdjacentHTML(){},append(){}},createElement:()=>el(),hidden:false};
globalThis.window={addEventListener(){},print(){}};globalThis.location={hash:""};
const must=(c,m)=>{if(!c){console.error("ASSERT: "+m);process.exit(1);}};
if(sc==="corrupt"){store["fa-state"]="{this is not json";
 const {state}=await import("../js/core/store.js");const {pages}=await import("../js/ui/pages/index.js");
 must(Array.isArray(state.collections),"state repaired");must(Object.keys(store).some(k=>k.startsWith("fa-state-corrupt-")),"corrupt copy kept");pages.dashboard();}
if(sc==="badcfg"){store["fa-sync"]="{{{";store["fa-state"]=JSON.stringify({collections:"oops",expenses:[null,5,{id:"E1",amount:10,status:"Recorded"}],settings:7});
 const {state}=await import("../js/core/store.js");await import("../js/services/github-sync.js");const {pages}=await import("../js/ui/pages/index.js");
 must(state.collections.length===0&&state.expenses.length===1,"malformed fields repaired");for(const k of Object.keys(pages))pages[k]();}
if(sc==="merge"){const {mergeState}=await import("../js/core/merge.js");
 const r=mergeState({collections:[{amount:1}],expenses:[{id:"A",amount:2}]},{collections:[{amount:2}],expenses:"bad",holds:null});
 must(r.state.collections.length===2,"records without id both kept");must(r.state.expenses.length===1,"local kept when remote malformed");must(r.localOnly,"local-only flagged");
 const v=mergeState({holds:[{id:"H",status:"Recorded",returns:[{id:"r1"}]}]},{holds:[{id:"H",status:"Void",updatedAt:"2030",returns:[{id:"r2"}]}]}).state.holds[0];
 must(v.returns.length===2&&v.status==="Void","nested returns kept and void preserved");}
if(sc==="date"){const {today}=await import("../js/core/utils.js"),d=new Date(),l=`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;must(today()===l,"today() is the local date");}
if(sc==="boundary"){const {pages}=await import("../js/ui/pages/index.js"),sh=await import("../js/ui/shell.js");
 pages.dashboard=()=>{throw new Error("boom")};sh.render();
 must(String(els["#content"].innerHTML).includes("could not be shown"),"error panel shown instead of blank page");}
if(sc==="guard"){const {guard}=await import("../js/core/errors.js");
 guard(()=>{throw new Error("x")},"t")();await guard(async()=>{throw new Error("y")},"t")();
 const {getLogs}=await import("../js/services/logger.js");must(getLogs().filter(e=>e.kind==="bug").length===2,"both sync and async failures logged");}
