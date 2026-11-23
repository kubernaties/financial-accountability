/**
 * Calendar screen (full-month confirmation).
 */
import {state} from "../../core/store.js";
import {$, money, sum} from "../../core/utils.js";
import {card, toolbar} from "../components.js";
import {view} from "../view-state.js";

export const calendarPages={
 calendar(){
  const y=view.calendarCursor.getFullYear(),m=view.calendarCursor.getMonth();
  const first=new Date(y,m,1).getDay(),days=new Date(y,m+1,0).getDate();
  let cells="";
  for(let i=0;i<first;i++)cells+=`<div class="day muted"></div>`;
  for(let d=1;d<=days;d++){
   const date=`${y}-${String(m+1).padStart(2,"0")}-${String(d).padStart(2,"0")}`;
   const tx=[...state.collections,...state.expenses].filter(x=>(x.collectionDate||x.date)===date&&!["Void","Reversed"].includes(x.status));
   const period=state.periods.find(p=>p.dates?.includes(date));
   const status=period?.status==="Closed"?"closed":period?"pending":state.reconfirmedDates.includes(date)?tx.length?"activity":"noactivity":tx.length?"activity":"pending";
   const total=sum(tx);
   cells+=`<div class="day ${status}" data-date="${date}"><span class="day-number">${d}</span>${total?`<div class="day-total">${money(total)}</div>`:""}${tx.length?`<div class="card-sub">${tx.length} entry(s)</div>`:""}</div>`;
  }
  const title=view.calendarCursor.toLocaleString("en-BD",{month:"long",year:"numeric"});
  return toolbar(title,`<button class="btn small" data-month="-1">‹</button><button class="btn small" data-month="0">Today</button><button class="btn small" data-month="1">›</button><button class="btn" data-confirm-nothing>Confirm no activity</button><button class="btn" data-print>Print / PDF</button>`)+
   `<div class="calendar">${["Sun","Mon","Tue","Wed","Thu","Fri","Sat"].map(x=>`<div class="cal-head">${x}</div>`).join("")}${cells}</div>`;
 }
};
