# financial-accountability

Personal financial accountability and reconciliation manager.

## Run locally

```bash
python3 -m http.server 4173
```

Open `http://localhost:4173`.

## Features

- Responsive dark/light interface with Bangladeshi Taka formatting
- Entry editing, voiding, reversals and audit history
- Collections, expenses, vouchers, fine funds, advances, repayments and reimbursements
- Handovers, account adjustments, accountability reopen/carry-forward and independent monthly reports
- Full-month calendar confirmation and print/PDF output
- Voucher image/PDF metadata with browser-local file previews
- Local persistence, demo data, CSV/JSON export and JSON import
- Automatic GitHub cloud database (private repo), loaded on open and saved after every change
- Conflict detection using commit SHAs, optional AES-256 encryption, daily backup copies

## Main and Fine boards (dashboard, first block)

Two separate boards, **Main income first**, then **Fine**. Main is the Regular fund. Fine is the Fine fund. Fine money never mixes with Main.

- Each board lists the month **by date**: every entry, the day's spending, and the balance left after that day. Click any row for full details, edit, void and follow-up actions.
- **Money I had, Expenses, Given to principal, Cash left, Still need to give** are on every board. Click a figure to see exactly how it is calculated.
- **Still need to give** = collected - real expenses (yours and teacher-paid) - adjustments - money already given to the principal. If nothing is left it says all money is given and asks you to confirm accountability.
- **Give to principal** works at any time and from either fund (new "Given from" field on Handovers; old handovers count as Regular). It does not need accountability first.
- **Finish accountability** is per board and per month. If you still hold money it asks, then **carries the leftover into the next month as opening balance**. Entries added after finishing are flagged. **Reopen** is always possible and the history is kept.
- Anything can happen on any date. Back-dated entries recalculate every later balance. A red warning shows if cash goes below zero on a day.
- **Owed to me**: loans (someone took money), change owed to me, money waiting for a voucher, advances. **I owe others**: teachers who paid for the college, change I owe students. **My personal take**: money you took for yourself (custom entry type "I took personal money"); it must be put back.
- Custom entries have a new type **I took personal money** and a new **Who: Student**.
- The old figures ("I must give principal" and "Where is every taka") now use the same maths, so they agree with the boards.
- Code: `js/finance/boards.js` (all board maths), `js/ui/boards.js` (screen), `css/boards.css`, test `npm run test:boards`. Accountability records are saved in `state.boardClose` and merged additively when syncing.

## Dashboard styles

Pick a layout in the dashboard bar (**Dashboard style**) or press **Browse styles**. The style you choose is saved and is your default. Twelve styles: Movable blocks, Classic (the original), Essentials, Tabs, Fold-away sections, Two columns, Compact, Large and easy, Big total, Notice board, Quick jump, Plain sentences. Colours (six skins) work with every style except Classic.

- Default order everywhere: Total received, Income, Fine, People who owe me (person, fund it was given from, details on click), Spent and given out, Main and Fine boards.
- Money taken from a fund (spent, or given to someone) is always red. "Spent from funds" never includes money given to someone who owes you.
- Code: `js/ui/dashboard-layout.js` (`STYLES`, `LAYOUTS`), `css/dash-layout.css`, test `npm run test:dashboard`.

## Cloud database setup

1. On GitHub create a **private** repository, e.g. `financial-data`.
2. Settings > Developer settings > Fine-grained tokens: access to **only that repo**, permission **Contents: Read and write**.
3. In the app: Settings > GitHub database. Enter `kubernaties/financial-data` (the default), the token and a passphrase, then **Connect & sync**.
4. On another device, enter the same repo, a token and the **same passphrase**.

The token is stored only encrypted by your passphrase. If you forget the passphrase, encrypted data cannot be recovered (git history does not help), so keep it safe.

Repo layout: `data/state.json`, `vouchers/*.json`, `backups/YYYY-MM-DD.json`.

## What changed in this version

- **Fines**: the dashboard has an automatic "Fines collected" card. "Fine fund available" counts fines from Collections (category Fines) and from the Fine page, adds restored money back, and subtracts only expenses you paid from the fine fund. Fine page has an "Add fine collection" button that defaults the category to Fines.
- **Custom entries**: one flexible entry for anything. Choose a name, amount, type (money in, money out, someone owes me, I owe someone), fund (Regular, Fine, Principal's money, none), who, and whether it counts as an expense. Owed entries get a "Money came back" / "I paid back" button for partial or full returns.
- **Money by source** (dashboard): money in, spent, left, and still-to-get-back for each fund, plus an overall "Money in hand".
- **Easy new devices**: Settings > Export connection file saves your repo name and token, locked by your passphrase. Upload `connection.json` to the main folder of this website's repository. New devices then ask only for the passphrase. The file is public, so use a long passphrase. Optional "Remember passphrase on this device".
- Optional form fields are no longer required, so an unallocated handover can be saved. Pending reimbursements now subtract partial payments and only count teacher-paid expenses.

Never put your GitHub token in the website code or in any file in this repository.

## Money on Hold, transfers and reports

- **Money on Hold / Pending Voucher**: money given to someone without a voucher. It reduces its original fund straight away but is **not** an expense. When the voucher arrives use *Voucher received*: the held amount becomes a real expense from the same fund and is never deducted twice. *Money returned* credits the original fund back.
- **Fund Transfers**: move money between Regular, Fine and Principal's funds. Transfers are shown separately and never counted as income or expense.
- **Reports**: daily, weekly, monthly and yearly tables, fund-wise summary, expenses by category and source, person-wise balances and voucher status.
- **Transactions**: one complete ledger of every record type with type and date filters and subtotals.
- The default cloud repository is `kubernaties/financial-data`. A previously saved `xubantu/financial-data` value is corrected automatically.

## Project structure

```
index.html                     Page shell. Loads the stylesheets, js/bootstrap.js, then js/main.js
manifest.json, icons/          Installable-app info and icon
service-worker.js              Offline fallback cache (network first, so updates always show)
.nojekyll                      Tells GitHub Pages to serve the files exactly as they are
.github/workflows/ci.yml       Runs the tests on every push
scripts/check-syntax.mjs       Syntax-checks every JavaScript file

css/                           Styles, split by purpose (load order matters, see index.html)
  base.css                     Colours/sizes (design tokens), reset, base elements
  layout.css                   Sidebar, top bar, content area
  components.css               Cards, buttons, fields, tables, badges, modal, toast
  calendar.css  dashboard.css  panels.css  glance.css  pages.css    Screen-specific styles
  themes.css                   Light theme overrides
  print.css  responsive.css    Print layout and breakpoints (keep responsive.css order)
  fatal.css                    Start-up error panel

js/bootstrap.js                Start-up safety net: shows an error panel instead of a blank page
js/main.js                     Entry point: offline cache, connects sync to the store, starts the app
js/core/                       Foundation (no screens, no money formulas)
  utils.js                     Formatting, IDs, dates, escaping, sums
  feedback.js                  Toast messages, file downloads
  errors.js                    report() and guard(): central error handling
  store.js                     App state, local save/load, audit entries
  merge.js                     Additive merge (never deletes or replaces records)
js/finance/                    Money logic only (no HTML). boards.js: Main and Fine boards
  calculations.js              Every formula: collected, spent, cash in hand, funds, holds, owed
  reporting.js                 Ledger, grouping and monthly snapshots
  overview.js                  Numbers for the One-Glance dashboard and warnings
js/services/                   Things that talk to the outside world
  github-sync.js               Sync engine: conflicts, merge, backups, device logs
  github-api.js                Minimal GitHub REST client (read/write a file)
  crypto.js                    AES-256-GCM encryption helpers
  dialog.js                    Popup used by sync (unlock, conflict, confirm passphrase)
  logger.js                    Activity/bug/security logger (separate from financial data)
js/ui/                         Everything you see and click
  shell.js                     Sidebar, routing, rendering, button wiring
  view-state.js  components.js Current page/filters; cards, tables, toolbars, bars
  widgets.js  overview.js      Dashboard/report building blocks; One-Glance, drill-down, cash count
  settings.js                  Settings actions, passphrase-protected local clear
  logs-page.js  cash-counter.js  demo-page.js    Their own screens
  pages/                       One file per group of screens + index.js (route -> screen)
    dashboard.js calendar.js ledgers.js funds.js reports.js settings-page.js
  forms/                       Add/edit dialog and record actions
    definitions.js             Fields of each record type
    modal.js  files.js         The add/edit dialog; voucher file helpers
    record-actions.js          Void, reverse, repayments, reimbursements
    holds.js  periods.js       Money on Hold actions; periods, monthly reports, day popup
    data-io.js                 CSV export, additive JSON import
    index.js                   Single import point for the above
tests/                         smoke-test.mjs (renders every screen), robustness-test.mjs (breaks things on purpose)
```

Run all checks: `npm test` (needs Node 18+). Test records exist only in the test files and are never loaded by the website.

## Deploy on GitHub Pages

1. Put **all files from this project at the root of the repository** (so `index.html` sits next to `js/` and `css/`), then commit and push.
2. Repository **Settings > Pages > Build and deployment**: Source **Deploy from a branch**, branch `main`, folder `/ (root)`.
3. Wait a minute, then open `https://<user>.github.io/<repository>/`. After an update, hard-refresh once (Ctrl+Shift+R).
4. If the page is blank or shows "The app could not start", read the message on the panel. Use **Clear app cache & reload** first; your saved data is not deleted by that.

All paths in the app are relative, so it works under a project URL such as `/<repository>/`. Keep the data repository (`financial-data`) **private** and separate from the website repository.

## Data protection

Imports and sync conflicts **merge** records and never delete or replace existing ones. There is no demo-data loader. Clearing local data needs your passphrase and downloads a backup first; cloud data is never deleted by the app.

## Activity & Bug Log

Records visits (with IP address via api.ipify.org), page views, JavaScript errors with stack traces, sync problems and security events (wrong passphrase, protected actions). Stored separately from financial data (browser key `fa-logs`, GitHub folder `logs/`, encrypted like the data). GitHub Pages has no server, so only devices that open the app are logged; upload each device's log to see them together.

## Error handling

- A page that fails shows an error panel (with a backup download) instead of a blank screen; the rest of the app keeps working.
- Every uncaught error and failed promise is shown once as a message and saved in the Activity and Bug Log with its stack trace.
- Corrupt browser data is kept under `fa-state-corrupt-<time>` before anything is reset; malformed fields are repaired, never silently dropped.
- Run `npm test` after any change.

## Startup safety net

`js/bootstrap.js` is a small script that runs before the app. If any file fails to load, a script has an error while starting, or nothing is drawn within 6 seconds, it shows an error panel with **Reload**, **Clear app cache & reload** and **Download my saved data** buttons instead of a blank page. It never deletes saved data. For GitHub Pages, keep `index.html` at the repository root, with the empty `.nojekyll` file next to it.

## Dashboard styles and movable layout

- **Dashboard style** (top of the Dashboard page): *New (movable blocks)* or *Classic (as before)*. The choice is saved and stays your default.
- **Colors**: Current theme, Paper, Ledger, Soft, Bold, Calm. Saved too.
- **Edit layout**: drag a block by its title to move it, use the ▲ ▼ buttons on a phone, or Hide/Show a block. Every change saves automatically (browser storage, and GitHub sync if connected). **Reset layout** restores the original order.
- **People who owe me** lists each person, the amount, the fund it was given from and the date. **Details** opens the full record.
- Money taken out of a fund (Spent, Given to people) is shown in the same red. "Spent from funds" counts expenses only; money someone owes you is counted under "Given to people".
- Code: `js/ui/dashboard-layout.js`, `css/dash-layout.css`. Settings live in `state.dash`.
