import assert from "node:assert/strict";
import {DEFAULT_INCOME_FEES,normalizeFeeNames,feeNameForCollection} from "../js/finance/income-fees.js";
assert(normalizeFeeNames(["Monthly fees"," Monthly fees ","IC Card Fee"]).includes("IC Card Fee"));
assert.equal(normalizeFeeNames([])[0],DEFAULT_INCOME_FEES[0]);
assert.equal(feeNameForCollection({category:"IC Card Fee"}),"IC Card Fee");
assert.equal(feeNameForCollection({description:"Custom fee"}),"Custom fee");
console.log("income fee definitions OK");
