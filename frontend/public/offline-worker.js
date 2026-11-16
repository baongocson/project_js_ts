// Cache the app shell only. API data and credentials are never cached here.
const CACHE='dashboard3d-shell-v1';
self.addEventListener('install',event=>{
  event.waitUntil((async()=>{
    const response=await fetch('/offline',{cache:'reload'});
    const html=await response.text();
    const assets=[...html.matchAll(/(?:src|href)="(\/assets\/[^"]+)"/g)].map(match=>match[1]);
    const cache=await caches.open(CACHE);
    await cache.addAll(['/offline','/',...assets]);
    await self.skipWaiting();
  })());
});
self.addEventListener('activate',event=>event.waitUntil(self.clients.claim()));
self.addEventListener('fetch',event=>{
  const url=new URL(event.request.url);
  if(event.request.method!=='GET'||url.origin!==self.location.origin||url.pathname.startsWith('/api/'))return;
  if(event.request.mode==='navigate')event.respondWith(fetch(event.request).then(async response=>{
    if(response.ok){const html=await response.clone().text();const assets=[...html.matchAll(/(?:src|href)="(\/assets\/[^"]+)"/g)].map(match=>match[1]);const cache=await caches.open(CACHE);await cache.addAll(assets);await cache.put('/offline',response.clone());}
    return response;
  }).catch(async()=>{
    const cached=await caches.match('/offline');return cached||Response.error();
  }));
  else if(url.pathname.startsWith('/assets/'))event.respondWith(caches.match(event.request).then(async cached=>{
    if(cached)return cached;const response=await fetch(event.request);if(response.ok){const cache=await caches.open(CACHE);await cache.put(event.request,response.clone());}return response;
  }));
});
