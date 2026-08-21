self.addEventListener('activate', e => e.waitUntil(
    caches.keys()
        .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
        .then(() => self.clients.claim())
));

self.addEventListener('fetch', e => {
    const u = new URL(e.request.url);
    if (e.request.method !== 'GET' || u.pathname.startsWith('/api/')) return;
    e.respondWith(
        caches.match(e.request).then(r => r || fetch(e.request).then(res => {
            const copy = res.clone();
            caches.open(CACHE).then(c => c.put(e.request, copy));
            return res;
        }).catch(() => caches.match('/')))
    );
});
