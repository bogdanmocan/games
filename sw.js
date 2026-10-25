// Mărește VERSION la fiecare modificare a fișierelor pentru a invalida cache-ul.
const VERSION='v2';
const CACHE='games-'+VERSION;
const PRECACHE=[
  './',
  'index.html',
  'pwa.js',
  'manifest.webmanifest',
  'icons/icon.svg',
  'icons/solitaire.svg',
  'icons/icon-192.png',
  'icons/icon-512.png',
  'icons/icon-maskable-512.png',
  'apps/screw-puzzle/',
  'apps/screw-puzzle/index.html',
  'apps/screw-puzzle/vendor/three.min.js',
  'apps/solitaire/',
  'apps/solitaire/index.html'
];

self.addEventListener('install',e=>{
  e.waitUntil(caches.open(CACHE).then(c=>c.addAll(PRECACHE)).then(()=>self.skipWaiting()));
});

self.addEventListener('activate',e=>{
  e.waitUntil(
    caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('games-')&&k!==CACHE).map(k=>caches.delete(k))))
      .then(()=>self.clients.claim())
  );
});

// Cache first, cu reîmprospătare în fundal (stale-while-revalidate).
self.addEventListener('fetch',e=>{
  const req=e.request;
  if(req.method!=='GET'||new URL(req.url).origin!==location.origin)return;
  e.respondWith((async()=>{
    const cache=await caches.open(CACHE);
    const hit=await cache.match(req,{ignoreSearch:true});
    const net=fetch(req).then(res=>{
      if(res.ok)cache.put(req,res.clone());
      return res;
    }).catch(()=>null);
    if(hit){e.waitUntil(net);return hit}
    const res=await net;
    if(res)return res;
    if(req.mode==='navigate')return (await cache.match('index.html'))||Response.error();
    return Response.error();
  })());
});
