/* LEVEL UP — service-worker KILL SWITCH.
   The app no longer uses a service worker (it caused cross-project mixing on the
   shared github.io origin). Any previously-installed copy of this worker now
   deletes all caches, unregisters itself, and reloads open tabs so the page is
   served fresh from the network from now on. */
self.addEventListener("install", function(){ self.skipWaiting(); });
self.addEventListener("activate", function(e){
  e.waitUntil(
    caches.keys()
      .then(function(keys){ return Promise.all(keys.map(function(k){ return caches.delete(k); })); })
      .then(function(){ return self.registration.unregister(); })
      .then(function(){ return self.clients.matchAll(); })
      .then(function(clients){ clients.forEach(function(c){ try{ c.navigate(c.url); }catch(e){} }); })
  );
});
/* never intercept anything — always go to network */
self.addEventListener("fetch", function(){});
