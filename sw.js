'use strict';
/* KN Training service worker — offline-tuki.
   Navigointi: verkko ensin (päivitykset perille), välimuisti varalla.
   Muut: välimuisti ensin, taustapäivitys. */
const CACHE = 'knt-v2';
const PRECACHE = ['/', '/manifest.webmanifest', '/kn-192.png', '/kn-512.png'];

self.addEventListener('install', e => {
  /* Ei skipWaiting-kutsua: uusi versio jää odottamaan, kunnes käyttäjä
     hyväksyy päivityksen (sivu lähettää SKIP_WAITING-viestin). */
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(PRECACHE)));
});
self.addEventListener('message', e => {
  if (e.data === 'SKIP_WAITING') self.skipWaiting();
});
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  if (url.origin !== location.origin) return; // ulkoiset (Supabase ym.) suoraan verkkoon
  if (e.request.mode === 'navigate') {
    e.respondWith(
      fetch(e.request).then(r => {
        const kopio = r.clone();
        caches.open(CACHE).then(c => c.put('/', kopio));
        return r;
      }).catch(() => caches.match('/'))
    );
    return;
  }
  e.respondWith(
    caches.match(e.request).then(osuma => {
      const haku = fetch(e.request).then(r => {
        if (r.ok) { const kopio = r.clone(); caches.open(CACHE).then(c => c.put(e.request, kopio)); }
        return r;
      }).catch(() => osuma);
      return osuma || haku;
    })
  );
});
