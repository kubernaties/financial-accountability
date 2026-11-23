/**
 * Screen state (current page, calendar month, filters, report mode). Kept separate from financial data and never saved or synced.
 */
import {today} from "../core/utils.js";


export const view={route:location.hash.slice(1)||"dashboard",calendarCursor:new Date(),voucherDate:today(),showCalc:false,editLayout:false,dashGallery:false,dashTab:"overview",txf:{type:"",from:"",to:""},reportMode:"monthly",logTab:"traffic"};
