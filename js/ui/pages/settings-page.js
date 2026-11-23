/**
 * Settings screen (GitHub database, local data, export).
 */
import {$, badge, esc} from "../../core/utils.js";
import {card} from "../components.js";
import {hasDemoData} from "../settings.js";
import {app} from "../shell.js";
import * as Sync from "../../services/github-sync.js";

export const settingsPages={
 settings(){
  const c=Sync.info();
  return `<div class="grid cards-3">${card("Data mode",badge(hasDemoData()?"Demo + Local":"Local"))}${card("Cloud repository",esc(c.repo||"Not connected"),c.repo?(c.encrypt?"Encrypted":"Not encrypted"):"Default: "+Sync.DEFAULT_REPO)}${card("Last sync",esc(c.lastSync?new Date(c.lastSync).toLocaleString():"Never"),c.label)}</div><br>
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
