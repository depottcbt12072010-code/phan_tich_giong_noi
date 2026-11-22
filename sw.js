const CACHE='voice-intelligence-ai-v2-0-2';
const ASSETS=[
  './','./index.html','./manifest.webmanifest',
  './assets/css/style.css?v=2.0.2',
  './assets/js/app.js?v=2.0.2',
  './assets/icons/icon.svg'
];
self.addEventListener('install',event=>{
  event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(ASSETS)).then(()=>self.skipWaiting()));
});
self.addEventListener('activate',event=>{
  event.waitUntil(
    caches.keys().then(keys=>Promise.all(keys
      .filter(key=>key!==CACHE&&(key.startsWith('voice-intelligence-ai-')||key.startsWith('voice-intelligence-free-')))
      .map(key=>caches.delete(key))
    )).then(()=>self.clients.claim())
  );
});
self.addEventListener('fetch',event=>{
  if(event.request.method!=='GET'||new URL(event.request.url).origin!==location.origin)return;
  const requestUrl=new URL(event.request.url);
  const isNavigation=event.request.mode==='navigate';
  if(isNavigation){
    event.respondWith(fetch(event.request).then(response=>{
      const copy=response.clone();caches.open(CACHE).then(cache=>cache.put('./index.html',copy));return response;
    }).catch(()=>caches.match('./index.html')));
    return;
  }
  event.respondWith(caches.match(event.request).then(cached=>{
    if(cached)return cached;
    return fetch(event.request).then(response=>{
      if(response.ok&&['http:','https:'].includes(requestUrl.protocol)){
        const copy=response.clone();caches.open(CACHE).then(cache=>cache.put(event.request,copy));
      }
      return response;
    }).catch(()=>caches.match('./index.html'));
  }));
});
