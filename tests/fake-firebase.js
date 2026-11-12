/* A FAKE FIREBASE for the sync tests (Mission 1.2). Tests never touch the network.

   HOW IT WORKS
   - One in-memory "server" lives in Node: cloud = createCloud().
   - Each "device" is a Playwright page in its OWN browser context (pages of one
     context share localStorage on file://, so they would not be two phones).
     cloud.attach(page, "A") must be called BEFORE bootAsGuest(page): it installs
     a fake window.firebase with page.addInitScript. The real SDK (three gstatic
     script tags) is aborted by bootAsGuest, so it can never overwrite the fake.
   - The fake talks to the server through page.exposeFunction (__fbRpc) and the
     server pushes listener events back with page.evaluate (__fbEvent).

   NODE API
     const cloud = createCloud();
     cloud.get(path)            value at path (deep copy) or null
     cloud.put(path, value)     write straight into the server, as no device (null removes)
     cloud.writes               log of every APPLIED write: {device, kind, path, value, queued}
                                (kind: set|update|remove; update is logged per key, full path;
                                 queued=true when it was held offline and replayed later)
     cloud.writesTo(prefix)     writes whose path is prefix or below it
     cloud.clearWrites()
     cloud.settle()             wait until all pending events were delivered to every page
     const dev = await cloud.attach(page, "A");
     dev.signIn(uid, opts)      sign in as uid (opts: {name, photo, password:true}); fires onAuthStateChanged
     dev.signOut()
     dev.setOffline(true|false) offline: .info/connected=false, set/update/remove/transaction are
                                held (like the real SDK's queue); online: connected=true, queue replays
                                IN ORDER, then listeners get the new values
     dev.queued                 number of writes held while offline
     The signed-in user is kept in Node, so it survives page.reload() like Firebase's LOCAL persistence.

   WHAT IS FAKED (everything index.html uses; checked with grep on fbDb./firebase.)
     firebase.initializeApp, apps, auth() {onAuthStateChanged, currentUser, setPersistence,
       getRedirectResult, signInWithPopup/Redirect (sign in as window.__fbPopupUser if set),
       signInWithEmailAndPassword (never signs in), signOut}, auth.GoogleAuthProvider,
       auth.Auth.Persistence.LOCAL, database() {ref}, database.ServerValue.TIMESTAMP.
     ref: child, key, ref, push, limitToLast (no-op), once("value", cb?), on("value"|other), off,
       set, update, remove, transaction(fn, cb?) (compare-and-set against the server, retried).
     snapshot: val, exists, key, ref, child, forEach.

   NOT FAKED (documented gaps)
     - Offline writes do not fire LOCAL optimistic events (the real SDK would).
     - once("value") while offline waits until online (the real SDK may answer from cache).
     - child_added listeners are registered and ignored.
     - No security rules, no ordering/limit queries, no onDisconnect.
*/

/* ------------------------------ page side ------------------------------ */
function pageFake(cfg) {
  var loadId = Math.random().toString(36).slice(2);
  var listeners = {}, nextId = 1, authCbs = [], keyN = 0;
  function rpc() { return window.__fbRpc.apply(null, arguments); }
  function norm(p) { return String(p || "").replace(/^\/+|\/+$/g, ""); }
  function clone(v) { return v === undefined ? null : JSON.parse(JSON.stringify(v)); }
  function mkSnap(path, val) {
    var s = {
      val: function () { return clone(val); },
      exists: function () { return val !== null && val !== undefined; },
      get key() { var a = path.split("/"); return a[a.length - 1] || null; },
      get ref() { return new Ref(path); },
      child: function (c) {
        var v = val, parts = norm(c).split("/");
        for (var i = 0; i < parts.length; i++) { v = (v && typeof v === "object" && parts[i] in v) ? v[parts[i]] : null; }
        return mkSnap(path + "/" + norm(c), v);
      },
      forEach: function (fn) {
        if (!val || typeof val !== "object") return false;
        var ks = Object.keys(val);
        for (var i = 0; i < ks.length; i++) { if (fn(s.child(ks[i])) === true) return true; }
        return false;
      }
    };
    return s;
  }
  function Ref(p) { this.path = norm(p); }
  Ref.prototype = {
    get key() { var a = this.path.split("/"); return a[a.length - 1] || null; },
    get ref() { return this; },
    child: function (c) { return new Ref(this.path + "/" + norm(c)); },
    limitToLast: function () { return this; },
    push: function (v) {
      var r = new Ref(this.path + "/-F" + Date.now().toString(36) + (++keyN));
      var p = v === undefined ? Promise.resolve() : r.set(v);
      r.then = function (a, b) { return p.then(a, b); };
      r.catch = function (b) { return p.catch(b); };
      return r;
    },
    once: function (ev, cb) {
      var self = this;
      var p = rpc("once", this.path).then(function (v) { return mkSnap(self.path, v); });
      if (cb) p.then(cb);
      return p;
    },
    on: function (ev, cb) {
      if (ev !== "value") return cb;
      var id = loadId + ":" + (nextId++);
      listeners[id] = { path: this.path, cb: cb };
      rpc("listen", loadId, id, this.path);
      return cb;
    },
    off: function () {
      var ids = [];
      for (var id in listeners) if (listeners[id].path === this.path) { ids.push(id); delete listeners[id]; }
      if (ids.length) rpc("unlisten", ids);
    },
    set: function (v) { return rpc("write", "set", this.path, clone(v)); },
    update: function (v) { return rpc("write", "update", this.path, clone(v)); },
    remove: function () { return rpc("write", "remove", this.path, null); },
    transaction: function (fn, done) {
      var self = this;
      function attempt() {
        return rpc("get", self.path).then(function (cur) {
          var next = fn(clone(cur));
          if (next === undefined) return { committed: false, snapshot: mkSnap(self.path, cur) };
          return rpc("cas", self.path, cur, clone(next)).then(function (ok) {
            return ok ? { committed: true, snapshot: mkSnap(self.path, clone(next)) } : attempt();
          });
        });
      }
      var p = attempt();
      if (done) p.then(function (r) { done(null, r.committed, r.snapshot); }, function (e) { done(e); });
      return p;
    }
  };
  window.__fbEvent = function (id, val) {
    var l = listeners[id];
    if (l) l.cb(mkSnap(l.path, val));
  };

  var user = null;
  /* the signed-in user lives in Node (survives page.reload(), like Firebase's LOCAL persistence) */
  var ready = rpc("whoami").then(function (u) { user = u; });
  function fireAuth() { authCbs.slice().forEach(function (cb) { cb(user); }); }
  window.__fbSignIn = function (u) {
    user = u;
    rpc("setUser", u);
    fireAuth();
  };
  var auth = {
    get currentUser() { return user; },
    onAuthStateChanged: function (cb) {
      authCbs.push(cb);
      ready.then(function () { cb(user); });
      return function () { authCbs = authCbs.filter(function (x) { return x !== cb; }); };
    },
    setPersistence: function () { return Promise.resolve(); },
    getRedirectResult: function () { return Promise.resolve(null); },
    signInWithPopup: function () {
      if (!window.__fbPopupUser) return Promise.reject(new Error("fake: no popup user set"));
      window.__fbSignIn(window.__fbPopupUser); return Promise.resolve({ user: user });
    },
    signInWithRedirect: function () { return auth.signInWithPopup(); },
    signInWithEmailAndPassword: function () { return Promise.reject(new Error("fake: password sign-in is not supported")); },
    signOut: function () {
      user = null;
      rpc("setUser", null);
      fireAuth();
      return Promise.resolve();
    }
  };
  var fb = {
    apps: [],
    initializeApp: function () { fb.apps.push({}); return fb.apps[0]; },
    auth: function () { return auth; },
    database: function () { return { ref: function (p) { return new Ref(p); } }; }
  };
  fb.auth.GoogleAuthProvider = function () {};
  fb.auth.Auth = { Persistence: { LOCAL: "local", SESSION: "session", NONE: "none" } };
  fb.database.ServerValue = { TIMESTAMP: { ".sv": "timestamp" } };
  window.firebase = fb;
  rpc("reset", loadId);
}

/* ------------------------------ node side ------------------------------ */
function parts(p) { return String(p || "").replace(/^\/+|\/+$/g, "").split("/").filter(Boolean); }
function clone(v) { return v === undefined || v === null ? null : JSON.parse(JSON.stringify(v)); }
function json(v) { return JSON.stringify(v === undefined ? null : v); }

function createCloud() {
  var root = {};
  var devices = [];
  var cloud = { writes: [] };

  function getRaw(path) {
    var v = root, p = parts(path);
    for (var i = 0; i < p.length; i++) {
      if (v && typeof v === "object" && p[i] in v) v = v[p[i]]; else return null;
    }
    return v;
  }
  function stamp(v) {
    if (v && typeof v === "object") {
      if (v[".sv"] === "timestamp") return Date.now();
      Object.keys(v).forEach(function (k) { v[k] = stamp(v[k]); });
    }
    return v;
  }
  function setRaw(path, val) {
    var p = parts(path);
    if (!p.length) { root = val === null ? {} : stamp(clone(val)); return; }
    var chain = [root];
    for (var i = 0; i < p.length - 1; i++) {
      var nx = chain[i][p[i]];
      if (!nx || typeof nx !== "object") { if (val === null) { return; } nx = chain[i][p[i]] = {}; }
      chain.push(nx);
    }
    if (val === null) delete chain[p.length - 1][p[p.length - 1]];
    else chain[p.length - 1][p[p.length - 1]] = stamp(clone(val));
    /* prune empty parents, like the real database */
    for (var j = p.length - 1; j > 0; j--) {
      var node = chain[j];
      if (node && typeof node === "object" && !Object.keys(node).length) delete chain[j - 1][p[j - 1]]; else break;
    }
  }
  cloud.get = function (path) { return clone(getRaw(path)); };
  function record(device, kind, path, value, queued) {
    cloud.writes.push({ device: device, kind: kind, path: parts(path).join("/"), value: clone(value), queued: !!queued });
  }
  function apply(device, kind, path, val, queued) {
    if (kind === "update") {
      Object.keys(val || {}).forEach(function (k) {
        var full = parts(path).concat(parts(k)).join("/");
        var v = clone(val[k]);
        setRaw(full, v);
        record(device, "update", full, v, queued);
      });
    } else {
      var v2 = kind === "remove" ? null : clone(val);
      setRaw(path, v2);
      record(device, kind, path, v2, queued);
    }
    devices.forEach(function (d) { d.flush(); });
  }
  cloud.put = function (path, val) { apply("server", val === null ? "remove" : "set", path, val, false); };
  cloud.writesTo = function (prefix) {
    var p = parts(prefix).join("/");
    return cloud.writes.filter(function (w) { return w.path === p || w.path.indexOf(p + "/") === 0; });
  };
  cloud.clearWrites = function () { cloud.writes.length = 0; };
  cloud.settle = async function () {
    for (var i = 0; i < 3; i++) await Promise.all(devices.map(function (d) { return d.chain; }));
  };

  cloud.attach = async function (page, name) {
    var dev = {
      name: name, page: page, online: true, queue: [], listeners: {}, waiters: [], chain: Promise.resolve(), loadId: "", user: null
    };
    Object.defineProperty(dev, "queued", { get: function () { return dev.queue.length; } });
    function deliver(id, val) {
      dev.chain = dev.chain.then(function () {
        return page.evaluate(function (a) { if (window.__fbEvent) window.__fbEvent(a[0], a[1]); }, [id, val]).catch(function () {});
      });
    }
    function valueFor(path) { return path === ".info/connected" ? dev.online : getRaw(path); }
    dev.flush = function () {
      Object.keys(dev.listeners).forEach(function (id) {
        var l = dev.listeners[id];
        if (!dev.online && l.path !== ".info/connected") return;
        var v = clone(valueFor(l.path)), j = json(v);
        if (l.last !== j) { l.last = j; deliver(id, v); }
      });
    };
    function waitOnline() { return dev.online ? Promise.resolve() : new Promise(function (r) { dev.waiters.push(r); }); }
    dev.setOffline = async function (off) {
      if (off === !dev.online) return;
      dev.online = !off;
      if (off) { dev.flush(); await cloud.settle(); return; }
      dev.flush(); /* connected = true first */
      var q = dev.queue; dev.queue = [];
      q.forEach(function (w) { apply(dev.name, w.kind, w.path, w.val, true); w.resolve(); });
      var ws = dev.waiters; dev.waiters = []; ws.forEach(function (r) { r(); });
      dev.flush();
      await cloud.settle();
    };
    dev.signIn = async function (uid, opts) {
      opts = opts || {};
      var u = {
        uid: uid, displayName: opts.name || ("Hero " + uid), email: uid + "@example.test", photoURL: opts.photo || "",
        providerData: [{ providerId: opts.password ? "password" : "google.com" }]
      };
      await page.evaluate(function (x) { window.__fbSignIn(x); }, u);
      await cloud.settle();
    };
    dev.signOut = async function () {
      await page.evaluate(function () { return window.firebase.auth().signOut(); });
      await cloud.settle();
    };

    await page.exposeFunction("__fbRpc", async function (op, a, b, c, d) {
      if (op === "whoami") return dev.user;
      if (op === "setUser") { dev.user = a; return null; }
      if (op === "reset") {
        dev.loadId = a;
        Object.keys(dev.listeners).forEach(function (id) { if (id.indexOf(a + ":") !== 0) delete dev.listeners[id]; });
        return null;
      }
      if (op === "listen") { /* a=loadId b=id c=path */
        if (a !== dev.loadId) return null;
        dev.listeners[b] = { path: parts(c).join("/"), last: undefined };
        dev.flush();
        return null;
      }
      if (op === "unlisten") { a.forEach(function (id) { delete dev.listeners[id]; }); return null; }
      if (op === "once") {
        if (parts(a).join("/") === ".info/connected") return dev.online;
        await waitOnline();
        return clone(getRaw(a));
      }
      if (op === "get") { await waitOnline(); return clone(getRaw(a)); }
      if (op === "cas") { /* a=path b=old c=new */
        await waitOnline();
        if (json(getRaw(a)) !== json(b)) return false;
        apply(dev.name, c === null ? "remove" : "set", a, c, false);
        return true;
      }
      if (op === "write") { /* a=kind b=path c=value */
        if (!dev.online) return new Promise(function (resolve) { dev.queue.push({ kind: a, path: b, val: c, resolve: resolve }); });
        apply(dev.name, a, b, c, false);
        return null;
      }
      throw new Error("fake firebase: unknown rpc " + op);
    });
    await page.addInitScript(pageFake, { device: name });
    devices.push(dev);
    return dev;
  };
  return cloud;
}

module.exports = { createCloud };
