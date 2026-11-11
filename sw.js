// Çevrimdışı kullanım: uygulama dosyaları önbellekte tutulur.
// Kendi dosyalarımız önce ağdan istenir (güncellemeler hemen gelsin), ağ yoksa önbellekten verilir.
// Fontlar uygulamayla birlikte gelir (fonts/), ayrıca indirilmez.
const CACHE = "gitar-v15";
const SHELL = [
  "./",
  "index.html",
  "privacy.html",
  "css/fonts.css",
  "css/app.css",
  "fonts/Commissioner-latin-ext.woff2",
  "fonts/Commissioner-latin.woff2",
  "fonts/Fraunces-latin-ext.woff2",
  "fonts/Fraunces-latin.woff2",
  "fonts/IBMPlexMono-Medium.ttf",
  "fonts/IBMPlexMono-Regular.ttf",
  "fonts/NotoMusic-text.woff2",
  "js/core/i18n.js",
  "js/core/music.js",
  "js/core/guitar.js",
  "js/core/chords.js",
  "js/core/rhythm.js",
  "js/core/songs.js",
  "js/core/band.js",
  "js/core/follow.js",
  "js/core/pieces.js",
  "js/core/archive.js",
  "js/core/transcribe.js",
  "notalar/index.json",
  "js/core/ear.js",
  "js/core/lessons.js",
  "js/app/base.js",
  "js/app/band.js",
  "js/app/staff.js",
  "js/app/i18n-html.js",
  "js/app/tabs.js",
  "js/app/settings.js",
  "js/app/metronome.js",
  "js/app/prefs.js",
  "js/app/sap.js",
  "js/app/tuner.js",
  "js/app/chords.js",
  "js/app/rhythm.js",
  "js/app/songs.js",
  "js/app/melody.js",
  "js/app/pieces.js",
  "js/app/kulaktan.js",
  "js/app/ear.js",
  "js/app/lessons.js",
  "js/app/main.js",
  "manifest.webmanifest",
  "icon.svg",
  "icons/icon-192.png",
  "icons/icon-512.png",
  "icons/icon-maskable-192.png",
  "icons/icon-maskable-512.png",
  "icons/apple-touch-icon.png"
];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys()
    .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});
self.addEventListener("fetch", e => {
  const req = e.request;
  if(req.method !== "GET") return;
  const url = new URL(req.url);
  if(url.origin === location.origin){
    e.respondWith(fetch(req).then(res => {
      if(res.ok){ const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)); }
      return res;
    }).catch(() => caches.match(req, {ignoreSearch:true}).then(r => r || caches.match("index.html"))));
  }
});
