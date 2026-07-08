/* LEVEL UP — service worker: offline support + fast repeat loads.
   index.html is network-first (new versions arrive immediately when online,
   cached copy serves offline); all other assets are cache-first. */
var CACHE = "levelup-v1";
var CORE = ["./", "index.html", "manifest.webmanifest", "icon-192.png", "icon-512.png", "apple-touch-icon.png"];

self.addEventListener("install", function(e){
  e.waitUntil(
    caches.open(CACHE)
      .then(function(c){ return c.addAll(CORE); })
      .then(function(){ return self.skipWaiting(); })
  );
});

self.addEventListener("activate", function(e){
  e.waitUntil(
    caches.keys().then(function(keys){
      return Promise.all(keys.filter(function(k){ return k !== CACHE; }).map(function(k){ return caches.delete(k); }));
    }).then(function(){ return self.clients.claim(); })
  );
});

self.addEventListener("fetch", function(e){
  var req = e.request;
  if(req.method !== "GET") return;
  var url = new URL(req.url);
  /* never intercept Firebase auth/database traffic */
  if(url.hostname.indexOf("firebaseio.com") !== -1 || url.hostname.indexOf("identitytoolkit") !== -1 || url.hostname.indexOf("securetoken") !== -1) return;

  var isNav = req.mode === "navigate" ||
    (url.origin === location.origin && (url.pathname.endsWith("/index.html") || url.pathname.endsWith("/")));

  if(isNav){
    e.respondWith(
      fetch(req).then(function(res){
        var copy = res.clone();
        caches.open(CACHE).then(function(c){ c.put(req, copy); });
        return res;
      }).catch(function(){
        return caches.match(req).then(function(m){ return m || caches.match("index.html"); });
      })
    );
    return;
  }

  e.respondWith(
    caches.match(req).then(function(m){
      if(m) return m;
      return fetch(req).then(function(res){
        if(res && (res.status === 200 || res.type === "opaque")){
          var copy = res.clone();
          caches.open(CACHE).then(function(c){ c.put(req, copy); });
        }
        return res;
      });
    })
  );
});
