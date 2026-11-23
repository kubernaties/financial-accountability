/**
 * Screen registry: maps each route name to the function that draws it.
 */
import {logsPage} from "../logs-page.js";
import {counterPage} from "../cash-counter.js";
import {demoPage} from "../demo-page.js";
import {dashboardPages} from "./dashboard.js";
import {calendarPages} from "./calendar.js";
import {ledgerPages} from "./ledgers.js";
import {fundPages} from "./funds.js";
import {reportPages} from "./reports.js";
import {settingsPages} from "./settings-page.js";

export function getPage(r){
 switch(r){
  case "calendar":return pages.calendar;
  case "transactions":return pages.transactions;
  case "collections":return pages.collections;
  case "expenses":return pages.expenses;
  case "vouchers":return pages.vouchers;
  case "holds":return pages.holds;
  case "transfers":return pages.transfers;
  case "reports":return pages.reports;
  case "fines":return pages.fines;
  case "handovers":return pages.handovers;
  case "advances":return pages.advances;
  case "custom":return pages.custom;
  case "adjustments":return pages.adjustments;
  case "accountability":return pages.accountability;
  case "monthly":return pages.monthly;
  case "audit":return pages.audit;
  case "logs":return logsPage;
  case "cashcounter":return counterPage;
  case "demo":return demoPage;
  case "settings":return pages.settings;
  default:return pages.dashboard;
 }
}

/** All screens, keyed by route name. */
export const pages={
 ...dashboardPages,
 ...calendarPages,
 ...ledgerPages,
 ...fundPages,
 ...reportPages,
 ...settingsPages
};
