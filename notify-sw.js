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

/* ---- background daily reminder (Periodic Background Sync) ----
   Works on Android when LEVEL UP is installed on the home screen: the
   browser wakes this worker every few hours even with the app closed.
   The page keeps a small "notifySnapshot" in IndexedDB on every save;
   this worker reads it and decides whether to ring. */
function swIdb(){
  return new Promise(function(resolve){
    try{
      var req = indexedDB.open("leveluphunter_db", 1);
      req.onsuccess = function(e){ resolve(e.target.result); };
      req.onerror = function(){ resolve(null); };
      req.onupgradeneeded = function(e){
        var db = e.target.result;
        if(!db.objectStoreNames.contains("kv")) db.createObjectStore("kv");
        if(!db.objectStoreNames.contains("snapshots")) db.createObjectStore("snapshots");
      };
    }catch(err){ resolve(null); }
  });
}
function swKvGet(db, key){
  return new Promise(function(resolve){
    try{
      var rq = db.transaction("kv", "readonly").objectStore("kv").get(key);
      rq.onsuccess = function(){ resolve(rq.result); };
      rq.onerror = function(){ resolve(undefined); };
    }catch(e){ resolve(undefined); }
  });
}
function swKvPut(db, key, val){
  try{ db.transaction("kv", "readwrite").objectStore("kv").put(val, key); }catch(e){}
}
function swToday(){
  var d = new Date();
  var p = function(n){ return (n < 10 ? "0" : "") + n; };
  return d.getFullYear() + "-" + p(d.getMonth() + 1) + "-" + p(d.getDate());
}
function checkAndNotify(){
  return swIdb().then(function(db){
    if(!db) return;
    return swKvGet(db, "notifySnapshot").then(function(raw){
      var snap = null;
      try{ snap = raw && JSON.parse(raw); }catch(e){}
      if(!snap || !snap.on) return;
      var now = new Date();
      var hm = (now.getHours() < 10 ? "0" : "") + now.getHours() + ":" + (now.getMinutes() < 10 ? "0" : "") + now.getMinutes();
      if(hm < (snap.time || "20:00")) return; /* not reminder time yet */
      var today = swToday();
      return swKvGet(db, "swNotifyDay").then(function(doneDay){
        if(doneDay === today) return;                                  /* already rang today */
        if(snap.day === today && snap.lastFired === today) return;     /* the open app already rang */
        if(snap.day === today && (snap.left || 0) <= 0) return;        /* everything is done — stay silent */
        var body = snap.day === today
          ? ("Unfinished quests today: " + snap.left + ". Don't break the streak!")
          : "Your daily quests are still waiting today. Don't break the streak!";
        swKvPut(db, "swNotifyDay", today);
        return self.registration.showNotification("⚔ The System calls, Hunter!", {
          body: body, icon: "icon-192.png", badge: "icon-192.png", tag: "levelup-reminder"
        });
      });
    });
  });
}
self.addEventListener("periodicsync", function(e){
  if(e.tag === "levelup-reminder") e.waitUntil(checkAndNotify());
});
/* also check whenever the worker happens to wake for a push-less sync */
self.addEventListener("sync", function(e){
  if(e.tag === "levelup-reminder") e.waitUntil(checkAndNotify());
});
