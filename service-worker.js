const CACHE = "financial-accountability-v19";
const ASSETS = [
  "./",
  "./index.html",
  "./manifest.json",
  "./icons/icon.svg",
  "./css/base.css",
  "./css/calendar.css",
  "./css/components.css",
  "./css/dashboard.css",
  "./css/dash-layout.css",
  "./css/boards.css",
  "./css/fatal.css",
  "./css/glance.css",
  "./css/layout.css",
  "./css/pages.css",
  "./css/panels.css",
  "./css/print.css",
  "./css/responsive.css",
  "./css/themes.css",
  "./js/bootstrap.js",
  "./js/main.js",
  "./js/core/errors.js",
  "./js/core/feedback.js",
  "./js/core/merge.js",
  "./js/core/store.js",
  "./js/core/utils.js",
  "./js/finance/boards.js",
  "./js/finance/calculations.js",
  "./js/finance/overview.js",
  "./js/ui/boards.js",
  "./js/ui/dashboard-layout.js",
  "./js/ui/inline-add.js",
  "./js/ui/theme-auto.js",
  "./js/finance/reporting.js",
  "./js/services/crypto.js",
  "./js/services/dialog.js",
  "./js/services/github-api.js",
  "./js/services/github-sync.js",
  "./js/services/logger.js",
  "./js/ui/cash-counter.js",
  "./js/ui/components.js",
  "./js/ui/demo-page.js",
  "./js/ui/logs-page.js",
  "./js/ui/overview.js",
  "./js/ui/settings.js",
  "./js/ui/shell.js",
  "./js/ui/view-state.js",
  "./js/ui/widgets.js",
  "./js/ui/forms/data-io.js",
  "./js/ui/forms/definitions.js",
  "./js/ui/forms/files.js",
  "./js/ui/forms/holds.js",
  "./js/ui/forms/index.js",
  "./js/ui/forms/modal.js",
  "./js/ui/forms/periods.js",
  "./js/ui/forms/record-actions.js",
  "./js/ui/pages/calendar.js",
  "./js/ui/pages/dashboard.js",
  "./js/ui/pages/funds.js",
  "./js/ui/pages/index.js",
  "./js/ui/pages/ledgers.js",
  "./js/ui/pages/reports.js",
  "./js/ui/pages/settings-page.js"
];

self.addEventListener("install", event => {
  self.skipWaiting();
  event.waitUntil(caches.open(CACHE).then(cache => Promise.all(ASSETS.map(a => cache.add(a).catch(() => {})))));
});
self.addEventListener("activate", event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
// Network first so updates always show; cache is only an offline fallback. GitHub API calls are never intercepted.
self.addEventListener("fetch", event => {
  const url = new URL(event.request.url);
  if (event.request.method !== "GET" || url.origin !== location.origin) return;
  // cache:"no-cache" revalidates with the server so the browser's own HTTP cache can never serve an old/blank page.
  event.respondWith(fetch(event.request, {cache: "no-cache"}).then(res => {
    // Only keep good, non-empty responses as the offline fallback.
    if (res.ok && res.status === 200 && res.headers.get("content-length") !== "0") { const copy = res.clone(); caches.open(CACHE).then(c => c.put(event.request, copy)).catch(() => {}); }
    return res;
  }).catch(() => caches.match(event.request).then(r => r || new Response("Offline and not cached yet", {status: 503}))));
});
