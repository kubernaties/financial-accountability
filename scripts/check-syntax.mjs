// Syntax-checks every JavaScript file in the project (js/, tests/, scripts/, service-worker.js).
// Usage: node scripts/check-syntax.mjs
import {readdirSync, statSync} from "node:fs";
import {join, extname} from "node:path";
import {spawnSync} from "node:child_process";

const roots = ["js", "tests", "scripts", "service-worker.js"];
const files = [];
const walk = p => statSync(p).isDirectory() ? readdirSync(p).forEach(f => walk(join(p, f))) : [".js", ".mjs"].includes(extname(p)) && files.push(p);
roots.forEach(walk);

let failed = 0;
for (const f of files) {
  const r = spawnSync(process.execPath, ["--check", f], {encoding: "utf8"});
  if (r.status !== 0) { failed++; console.error("SYNTAX ERROR in " + f + "\n" + r.stderr); }
}
import {readFileSync} from "node:fs";
const sw = readFileSync("service-worker.js", "utf8"), assets = [];
["css", "js"].forEach(function w(p) { statSync(p).isDirectory() ? readdirSync(p).forEach(f => w(join(p, f))) : assets.push(p); });
for (const a of assets) if (!sw.includes('"./' + a + '"')) { failed++; console.error("Not in service-worker.js offline cache: " + a); }
console.log(`${files.length - failed}/${files.length} files OK`);
process.exit(failed ? 1 : 0);
