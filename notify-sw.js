/* LEVEL UP — notification-only service worker.
   Deliberately has NO fetch handler and NO caching: every request always goes
   straight to the network, so this worker can never serve stale or wrong
   content (the problem that got the old caching worker removed).
   Its only job is showing notifications on platforms (Android) where pages
   cannot call new Notification() directly, and focusing the app on tap. */
self.addEventListener("install", function(){ self.skipWaiting(); });
self.addEventListener("activate", function(e){
  e.waitUntil(
    caches.keys()
      .then(function(keys){ return Promise.all(keys.map(function(k){ return caches.delete(k); })); })
      .then(function(){ return self.clients.claim(); })
  );
});
self.addEventListener("notificationclick", function(e){
  e.notification.close();
  e.waitUntil(
    self.clients.matchAll({type:"window", includeUncontrolled:true}).then(function(list){
      for(var i=0;i<list.length;i++){
        if("focus" in list[i]) return list[i].focus();
      }
      if(self.clients.openWindow) return self.clients.openWindow("./");
    })
  );
});
