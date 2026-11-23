/**
 * Settings screen (GitHub database, local data, export).
 */
import {$, badge, esc} from "../../core/utils.js";
import {card} from "../components.js";
import {hasDemoData} from "../settings.js";
import {app} from "../shell.js";
import * as Sync from "../../services/github-sync.js";
import {SKINS} from "../dashboard-layout.js";
import {getAuto} from "../theme-auto.js";

export const settingsPages={
 settings(){
  const c=Sync.info(),a=getAuto(),opt=(v,l,cur)=>`<option value="${v}"${v===cur?" selected":""}>${esc(l)}</option>`;
  const skinOpts=cur=>[["keep","Do not change"],...SKINS].map(x=>opt(x[0],x[1],cur)).join("");
  return `<div class="grid cards-3">${card("Data mode",badge(hasDemoData()?"Demo + Local":"Local"))}${card("Cloud repository",esc(c.repo||"Not connected"),c.repo?(c.encrypt?"Encrypted":"Not encrypted"):"Default: "+Sync.DEFAULT_REPO)}${card("Last sync",esc(c.lastSync?new Date(c.lastSync).toLocaleString():"Never"),c.label)}</div><br>
  <div class="card" id="appearance"><h3>Appearance: automatic colours</h3><p class="card-sub">Choose when the app turns light or dark by itself. Saved on this device only, so your phone and computer can differ. The Light/Dark button in the top bar always works too (it switches this off).</p><div class="form-grid">
  <div class="field"><label>Colour mode</label><select id="ap-mode">${opt("manual","Manual (use the top button)",a.mode)}${opt("time","By time of day (my schedule)",a.mode)}${opt("device","Follow my phone / computer",a.mode)}</select></div>
  <div class="field"><label>Light colours start at</label><input id="ap-light" type="time" value="${esc(a.lightFrom)}"></div>
  <div class="field"><label>Dark colours start at</label><input id="ap-dark" type="time" value="${esc(a.darkFrom)}"></div>
  <div class="field"><label>Dashboard colours by day</label><select id="ap-dayskin">${skinOpts(a.daySkin)}</select></div>
  <div class="field"><label>Dashboard colours by night</label><select id="ap-nightskin">${skinOpts(a.nightSkin)}</select></div></div><br>
  <div class="actions"><button class="btn primary" id="ap-save">Save colours</button></div></div><br>
  <div class="card"><h3>GitHub database</h3><p class="card-sub">Saved automatically to your private GitHub repository after every change, and loaded when you open the app on any device. Your token is stored only in encrypted form, protected by your passphrase. To use another device with only your passphrase: connect here, click <strong>Export connection file</strong>, upload connection.json to the main folder of your website repository, then open the site on the new device. That file is public but locked by your passphrase, so use a long one (12+ characters).</p><div class="form-grid">
  <div class="field"><label>Private data repository (owner/name)</label><input id="sync-repo" value="${esc(c.repo||Sync.DEFAULT_REPO)}" placeholder="${esc(Sync.DEFAULT_REPO)}"></div>
  <div class="field"><label>Branch</label><input id="sync-branch" value="${esc(c.branch||"main")}"></div>
  <div class="field"><label>Fine-grained token</label><input id="sync-token" type="password" autocomplete="off" placeholder="github_pat_..."></div>
  <div class="field"><label>Passphrase (min 8 characters)</label><input id="sync-pass" type="password" autocomplete="new-password"></div>
  <div class="field full"><label><input id="sync-encrypt" type="checkbox" ${c.encrypt!==false?"checked":""}> Encrypt financial data before upload (recommended; it cannot be recovered without the passphrase)</label></div>
  <div class="field full"><label><input id="sync-remember" type="checkbox" ${c.remember?"checked":""}> Remember passphrase on this device (convenient, but anyone using this browser can open your data)</label></div></div><br>
  <div class="actions"><button class="btn primary" id="connect-cloud">Connect &amp; sync</button><button class="btn" id="sync-now">Sync now</button><button class="btn" id="export-connection">Export connection file</button><button class="btn danger" id="disconnect-cloud">Disconnect</button></div></div><br>
  <div class="card"><h3>Local data</h3><div class="actions"><button class="btn" id="export-all">Export JSON backup</button><button class="btn danger" id="clear-data">Clear local data</button></div></div>`;
 }
};
