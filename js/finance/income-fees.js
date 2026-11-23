export const DEFAULT_INCOME_FEES=["Monthly fees","Annual fees","Examination fees","IC Card Fee","Registration fee","Admission fee","Development fee","Fines","Other income"];
export function normalizeFeeNames(value,fallback=DEFAULT_INCOME_FEES){
  const source=Array.isArray(value)?value:(typeof value==="string"?value.split(","):[]);
  const cleaned=[...new Set(source.map(x=>String(x||"").trim()).filter(Boolean))];
  return cleaned.length?cleaned:[...fallback];
}
export function feeNameForCollection(collection){
  return String(collection?.category||collection?.feeName||collection?.description||"Other income").trim()||"Other income";
}
