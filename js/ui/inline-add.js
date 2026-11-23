/**
 * "Add anything, on any day": one row on the dashboard that saves any kind of entry with any date.
 * It builds the same records as the normal forms (same create functions), so every board and balance
 * updates the same way, including for old dates.
 */
import {toast} from "../core/feedback.js";
import {persist, state} from "../core/store.js";
import {num} from "../core/utils.js";
import {FINE, PERS, REG} from "../finance/calculations.js";
import {collectionKey, forms} from "./forms/definitions.js";
import {render} from "./shell.js";

export const ENTRY_TYPES=[["collection","Collection"],["expense","Expense"],["handover","Given to principal"],["hold","Money on hold (no voucher)"],["took","Someone took money"],["changeOwed","Change owed to me"],["changeIowe","Change I owe"],["personal","I took personal money"]];

/** Returns "" when saved, or a short message to show next to the button. */
export function addEntry({board,date,type,who,amount,note}){
 const amt=num(amount);
 if(!(Number.isFinite(amt)&&amt>0))return "Amount must be a number above zero.";
 if(!date)return "Pick a date.";
 const fund=board==="fine"?FINE:REG,name=String(who||"").trim(),text=String(note||"").trim();
 const custom=(direction,label,party)=>["custom",{label,amount:amt,date,direction,fund,party:party||"Other",countsExpense:"No",note:text}];
 let kind,d;
 if(type==="collection")[kind,d]=["collection",{amount:amt,collectionDate:date,person:name,category:board==="fine"?"Fines":"Other college fees",description:text,paymentMethod:"Cash",personName:name}];
 else if(type==="expense")[kind,d]=["expense",{amount:amt,date,category:state.categories.includes("Other")?"Other":(state.categories[0]||"Other"),description:text,actualPayer:"You",fundUsed:fund,fundedBy:fund,paymentMethod:"Cash"}];
 else if(type==="handover")[kind,d]=["handover",{amount:amt,date,recipient:name||"Principal",fund,paymentMethod:"Cash",collectionDates:[],allocated:false,status:"Pending"}];
 else if(type==="hold")[kind,d]=["hold",{recipient:name||"Someone",amount:amt,date,fund,purpose:text||"Money given, waiting for voucher"}];
 else if(type==="took")[kind,d]=custom("Someone owes me",text||"Took money, will return",name);
 else if(type==="changeOwed")[kind,d]=custom("Someone owes me",text||"Gave extra change, he owes me",name);
 else if(type==="changeIowe")[kind,d]=custom("I owe someone",text||"Change not given yet, I owe",name);
 else if(type==="personal")[kind,d]=custom(PERS,text||"I took for personal use, must put back",name||"Me");
 else return "Pick what you are adding.";
 const f=forms[kind],key=collectionKey(kind);
 if(!f||!Array.isArray(state[key]))return "That kind of entry is not available.";
 const rec=f.create(d);state[key].push(rec);
 if(!state.transactions)state.transactions=[];
 if(kind==="collection"||kind==="expense")state.transactions.push({id:"TX-"+rec.id,type:kind==="collection"?"Collection":"Expense",date:rec.collectionDate||rec.date,description:rec.description||rec.category,amount:rec.amount,status:"Recorded",sourceId:rec.id});
 persist(`${kind} created`,rec.id,null,JSON.stringify(rec),"Added from the dashboard");
 toast("Entry added. Every balance after that date is updated.");render();return "";
}
