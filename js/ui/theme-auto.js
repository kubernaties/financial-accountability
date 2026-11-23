/**
 * Automatic colours. Three modes, saved on THIS device only (never synced, never part of the financial data):
 *  manual  - the Light/Dark button decides (the old behaviour)
 *  time    - light from one time, dark from another (for example light 07:00, dark 18:00)
 *  device  - follow the phone or computer's own light/dark setting
 * It can also switch the dashboard colours (skin) for day and night.
 */
const KEY="fa-theme-auto";
export const DEFAULTS={mode:"manual",lightFrom:"07:00",darkFrom:"18:00",daySkin:"paper",nightSkin:"comfort"};
const okTime=t=>/^([01]\d|2[0-3]):[0-5]\d$/.test(String(t||""));
const mins=t=>Number(t.slice(0,2))*60+Number(t.slice(3,5));

export function getAuto(){
 let r=null;try{r=JSON.parse(localStorage.getItem(KEY)||"null");}catch{}
 const a={...DEFAULTS,...(r&&typeof r==="object"?r:{})};
 if(!["manual","time","device"].includes(a.mode))a.mode="manual";
 if(!okTime(a.lightFrom))a.lightFrom=DEFAULTS.lightFrom;
 if(!okTime(a.darkFrom))a.darkFrom=DEFAULTS.darkFrom;
 return a;
}
export function setAuto(patch){
 const a={...getAuto(),...patch};
 try{localStorage.setItem(KEY,JSON.stringify(a));}catch{}
 return a;
}
/** "light" or "dark" for a moment in time. Works when dark starts after midnight too. */
export function themeAt(date,a=getAuto()){
 const now=date.getHours()*60+date.getMinutes(),l=mins(a.lightFrom),d=mins(a.darkFrom);
 if(l===d)return "dark";
 return l<d?(now>=l&&now<d?"light":"dark"):(now>=l||now<d?"light":"dark");
}
function deviceTheme(){
 try{return window.matchMedia&&window.matchMedia("(prefers-color-scheme: light)").matches?"light":"dark";}catch{return "dark";}
}
/** The theme the automatic mode wants right now, or null in manual mode. */
export function wantedTheme(date=new Date(),a=getAuto()){
 return a.mode==="time"?themeAt(date,a):a.mode==="device"?deviceTheme():null;
}
/**
 * Applies the wanted theme (and day/night dashboard colours) to the state.
 * Returns true when something changed, so the caller can redraw. Saved on this device only.
 */
export function applyAuto(state,saveLocal,date=new Date()){
 const a=getAuto(),w=wantedTheme(date,a);
 if(!w)return false;
 let changed=false;
 if(state.theme!==w){state.theme=w;changed=true;}
 if(typeof document!=="undefined")document.documentElement.dataset.theme=w;
 const skin=w==="light"?a.daySkin:a.nightSkin;
 if(skin&&skin!=="keep"&&state.dash&&typeof state.dash==="object"&&state.dash.skin!==skin){state.dash.skin=skin;changed=true;}
 if(changed&&saveLocal)saveLocal();
 return changed;
}
