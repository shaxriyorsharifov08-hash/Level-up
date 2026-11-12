/* CLOUD SYNC (Mission 1.2, "sync that never loses progress").
   Uses the fake Firebase from fake-firebase.js: two "devices" are two pages in
   two browser contexts that share one in-memory server. Nothing touches the network.

   The "data-loss paths" tests each reproduce one bug the sync had before Mission 1.2
   (they were test.fail() until round B fixed them). They assert the correct
   behaviour: if one turns red, that bug is back. */
const { test, expect } = require("@playwright/test");
const fs = require("fs");
const path = require("path");
const { bootAsGuest } = require("./helpers");
const { createCloud } = require("./fake-firebase");

const OLD = JSON.parse(fs.readFileSync(path.join(__dirname, "fixtures", "old-sync-save.json"), "utf8"));
const hero = (over) => Object.assign(JSON.parse(JSON.stringify(OLD)), over || {});
const rec = (h) => ({ json: JSON.stringify(h), updatedAt: Date.now() });
const cloudHero = (cloud, uid) => {
  const r = cloud.get("hunters/" + uid);
  return r && r.json ? JSON.parse(r.json) : null;
};
const SETTLE_MS = 3000; /* cloudPush waits 1.2 s before writing */

let contexts = [];
test.afterEach(async () => { for (const c of contexts) await c.close().catch(() => {}); contexts = []; });

/* a new "phone": own browser context, fake Firebase attached before the app boots */
async function phone(browser, cloud, name) {
  const ctx = await browser.newContext({ viewport: { width: 420, height: 900 } });
  contexts.push(ctx);
  const page = await ctx.newPage();
  const dev = await cloud.attach(page, name);
  await bootAsGuest(page);
  return { page, dev };
}
/* put a hero on the device the way a restored save would be (before any sign-in) */
async function setHero(page, h) {
  await page.evaluate((x) => { adoptState(x); save(); }, h);
}
async function waitFor(fn, ms) {
  const end = Date.now() + (ms || 8000);
  while (Date.now() < end) { if (fn()) return true; await new Promise((r) => setTimeout(r, 100)); }
  return false;
}
/* the same hero on two phones, both signed in as u1 and in step with the cloud */
async function twoSyncedPhones(browser, cloud) {
  const d1 = await phone(browser, cloud, "P1");
  await setHero(d1.page, hero({ guildId: "" }));
  await d1.dev.signIn("u1");
  expect(await waitFor(() => !!cloudHero(cloud, "u1"))).toBe(true);
  const d2 = await phone(browser, cloud, "P2");
  await setHero(d2.page, hero({ guildId: "" }));
  await d2.dev.signIn("u1");
  await d2.page.waitForTimeout(SETTLE_MS);
  await cloud.settle();
  return { d1, d2 };
}

test.describe("cloud sync: the fake works with today's code", () => {
  test("a fresh sign-in pushes the local hero to hunters/<uid>", async ({ browser }) => {
    const cloud = createCloud();
    const d = await phone(browser, cloud, "A");
    await setHero(d.page, hero());
    await d.dev.signIn("uA");
    expect(await waitFor(() => !!cloudHero(cloud, "uA"))).toBe(true);
    const h = cloudHero(cloud, "uA");
    expect(h.hunterName).toBe("Old Phone Hero");
    expect(h.totalCompleted).toBe(212);
    /* the app ran its first check against the fake (admins/ lookup, then hunters/) and listens live */
    expect(await d.page.evaluate(() => cloudUser && cloudUser.uid)).toBe("uA");
  });

  test("a newer cloud save is adopted by the device, and a live update from another device too", async ({ browser }) => {
    const cloud = createCloud();
    const d = await phone(browser, cloud, "A");
    await setHero(d.page, hero());
    /* "newer" is a later change time (an old-format copy: its savedAt), never a bigger
       saveCount; before the first sync it must also be the same hero (created + name) */
    cloud.put("hunters/uA", rec(hero({ totalCompleted: 999, saveCount: 99999, savedAt: new Date().toISOString() })));
    await d.dev.signIn("uA");
    await d.page.waitForFunction(() => state.totalCompleted === 999);
    cloud.put("hunters/uA", rec(hero({ hunterName: "Live Hero", saveCount: 900000, savedAt: new Date(Date.now() + 60000).toISOString() })));
    await d.page.waitForFunction(() => state.hunterName === "Live Hero");
  });

  test("offline holds writes in order and replays them on reconnect; .info/connected follows", async ({ browser }) => {
    const cloud = createCloud();
    const d = await phone(browser, cloud, "A");
    const seen = await d.page.evaluate(() => {
      window.__c = [];
      firebase.database().ref(".info/connected").on("value", (s) => window.__c.push(s.val()));
      return null;
    });
    await d.dev.setOffline(true);
    await d.page.evaluate(() => { const r = firebase.database().ref("x/y"); r.set(1); r.set(2); });
    expect(cloud.get("x/y")).toBe(null);
    expect(d.dev.queued).toBe(2);
    await d.dev.setOffline(false);
    expect(cloud.get("x/y")).toBe(2);
    expect(cloud.writesTo("x").map((w) => [w.value, w.queued])).toEqual([[1, true], [2, true]]);
    expect(await d.page.evaluate(() => window.__c)).toEqual([true, false, true]);
  });
});

test.describe("cloud sync: the old data-loss paths stay fixed", () => {
  /* BUG: setupAuthListener's first check pushes whenever remote.saveCount <= local.saveCount.
     saveCount rises on EVERY save (even just opening the app), so an old phone with a big
     count overwrites the cloud copy that has the newer work. */
  test("old phone after weeks: its higher saveCount must not overwrite newer cloud work", async ({ browser }) => {
    const cloud = createCloud();
    const newer = hero({ level: 15, totalCompleted: 230, saveCount: 120, savedAt: new Date().toISOString(), hunterName: "Old Phone Hero" });
    cloud.put("hunters/uA", rec(newer));
    const b = await phone(browser, cloud, "B");
    await setHero(b.page, hero()); /* saveCount 9000, savedAt four weeks old */
    await b.dev.signIn("uA");
    await b.page.waitForTimeout(SETTLE_MS);
    const now = cloudHero(cloud, "uA");
    expect(now.totalCompleted).toBeGreaterThanOrEqual(230);
  });

  /* BUG: after the admins/ check, setupAuthListener runs publishGuildProfile() + attachGuild()
     BEFORE anything checks the hero belongs to this account, and cloudPush may then write
     A's hero into hunters/B. */
  test("shared phone: nothing is written for account B before the hero is confirmed to be B's", async ({ browser }) => {
    const cloud = createCloud();
    const d = await phone(browser, cloud, "Shared");
    await setHero(d.page, hero({ guildId: "gA" }));
    await d.dev.signIn("uA");
    expect(await waitFor(() => !!cloudHero(cloud, "uA"))).toBe(true);
    await d.dev.signOut();
    cloud.put("hunters/uB", rec(hero({ hunterName: "Account B Hero", totalCompleted: 3, saveCount: 50, guildId: "" })));
    cloud.clearWrites();
    await d.dev.signIn("uB");
    await d.page.waitForTimeout(SETTLE_MS);
    const mine = cloud.writes.filter((w) => w.device !== "server" && (w.path.indexOf("hunters/uB") === 0 || /^guilds\/[^/]+\/members\/uB/.test(w.path)));
    expect(mine).toEqual([]);
    expect(cloudHero(cloud, "uB").hunterName).toBe("Account B Hero");
  });

  /* BUG: deleteMyData only .remove()s hunters/<uid>. A second device that was offline still
     holds the hero and a persistent sign-in; when it opens the app online, its first check sees
     "no record" and cloudPush() writes the deleted hero back. */
  test("delete with a second device: the deleted hero is not recreated by the offline device", async ({ browser }) => {
    const cloud = createCloud();
    const { d1, d2 } = await twoSyncedPhones(browser, cloud);
    await d2.dev.setOffline(true);
    d1.page.on("dialog", (dlg) => dlg.accept(dlg.type() === "prompt" ? "DELETE" : undefined));
    await d1.page.evaluate(() => { switchPage("admin"); });
    await d1.page.evaluate(() => document.getElementById("privacyDelete").click());
    expect(await waitFor(() => !cloudHero(cloud, "u1"))).toBe(true);
    /* phone 2 comes back: it is opened again (still offline), then gets its connection */
    await d2.page.reload();
    await d2.page.waitForFunction(() => typeof window.state === "object" && window.state !== null && !!cloudUser);
    await d2.dev.setOffline(false);
    await d2.page.waitForTimeout(SETTLE_MS);
    expect(cloudHero(cloud, "u1")).toBe(null);
  });

  /* BUG: import/restore only does adoptState + save(), so the backup's saveCount is just +1.
     The other device keeps a higher count, so its next sync (a reload here) pushes over the restore. */
  test("restore survives the other device: a higher saveCount elsewhere does not undo it", async ({ browser }) => {
    const cloud = createCloud();
    const { d1, d2 } = await twoSyncedPhones(browser, cloud);
    const backup = hero({ hunterName: "Restored Hero", totalCompleted: 7, saveCount: 5, guildId: "" });
    d1.page.on("dialog", (dlg) => dlg.accept());
    await d1.page.setInputFiles("#admImportFile", { name: "backup.json", mimeType: "application/json", buffer: Buffer.from(JSON.stringify(backup)) });
    await d1.page.waitForFunction(() => state.hunterName === "Restored Hero");
    expect(await waitFor(() => (cloudHero(cloud, "u1") || {}).hunterName === "Restored Hero")).toBe(true);
    /* the other phone, whose count is far higher, syncs */
    await d2.page.reload();
    await d2.page.waitForFunction(() => typeof window.state === "object" && window.state !== null && !!cloudUser);
    await d2.page.waitForTimeout(SETTLE_MS);
    expect(cloudHero(cloud, "u1").hunterName).toBe("Restored Hero");
    expect(await d1.page.evaluate(() => state.hunterName)).toBe("Restored Hero");
  });

  /* BUG: cloudPush is a blind set(). While offline the SDK queues it and replays it on reconnect,
     over whatever the other device wrote in the meantime. */
  test("offline then online: the queued blind write must not overwrite the other device's newer work", async ({ browser }) => {
    const cloud = createCloud();
    const { d1, d2 } = await twoSyncedPhones(browser, cloud);
    await d1.dev.setOffline(true);
    /* a real key press first: these are the hero's changes, not the app's own housekeeping */
    await d1.page.keyboard.press("Shift");
    await d1.page.evaluate(() => { for (let i = 0; i < 5; i++) { state.totalCompleted += 1; save(); } });
    await d1.page.waitForTimeout(1800); /* the push timer fires and the write is queued */
    await d2.page.keyboard.press("Shift");
    await d2.page.evaluate(() => { state.hunterName = "Newer On Phone 2"; state.totalCompleted += 20; save(); });
    expect(await waitFor(() => (cloudHero(cloud, "u1") || {}).hunterName === "Newer On Phone 2")).toBe(true);
    await d1.dev.setOffline(false);
    await d1.page.waitForTimeout(SETTLE_MS);
    expect(cloudHero(cloud, "u1").hunterName).toBe("Newer On Phone 2");
  });
});

/* Mission 1.2 round B: one cloudSync() for every path, deciding with pickWinner().
   Hero changes are made after a real key press: the app only moves changedAt
   for the hero's own changes (README 4, "Sync safety"). */
const outer = (cloud, uid) => cloud.get("hunters/" + uid);
const heroChange = async (page, fn) => { await page.keyboard.press("Shift"); await page.evaluate(fn); };
const writesBy = (cloud, device, prefix) => cloud.writesTo(prefix).filter((w) => w.device === device);

test.describe("cloud sync: one decision for every path", () => {
  test("a guest hero is claimed on its first sign-in, and the record carries the change time and owner", async ({ browser }) => {
    const cloud = createCloud();
    const d = await phone(browser, cloud, "A");
    await setHero(d.page, hero());
    expect(await d.page.evaluate(() => state.ownerUid)).toBe("");
    const before = await d.page.evaluate(() => state.saveCount);
    await d.dev.signIn("uA");
    expect(await waitFor(() => !!cloudHero(cloud, "uA"))).toBe(true);
    await d.page.waitForTimeout(300);
    const r = outer(cloud, "uA"), inner = JSON.parse(r.json);
    const local = await d.page.evaluate(() => ({ owner: state.ownerUid, base: state.syncBase, changedAt: state.changedAt,
      kept: JSON.parse(localStorage.getItem(SKEY)).ownerUid }));
    expect(local.owner).toBe("uA");
    expect(local.kept).toBe("uA");                 /* the claim is kept on the device */
    expect(r.ownerUid).toBe("uA");
    expect(inner.ownerUid).toBe("uA");
    expect(r.changedAt).toBe(inner.changedAt);
    expect(r.changedAt).toBe(local.changedAt);
    expect(local.base).toBe(local.changedAt);      /* both sides now agree on this copy */
    expect(typeof r.updatedAt).toBe("number");     /* still there for older app versions */
    expect(inner.saveCount).toBeGreaterThan(before);
  });

  test("the echo of our own push does nothing", async ({ browser }) => {
    const cloud = createCloud();
    const d = await phone(browser, cloud, "A");
    await setHero(d.page, hero());
    await d.dev.signIn("uA");
    expect(await waitFor(() => !!cloudHero(cloud, "uA"))).toBe(true);
    await d.page.waitForTimeout(500);
    cloud.clearWrites();
    await heroChange(d.page, () => { window.__before = state; state.totalCompleted += 1; save(); });
    expect(await waitFor(() => cloudHero(cloud, "uA").totalCompleted === 213)).toBe(true);
    await d.page.waitForTimeout(SETTLE_MS); /* the live listener has delivered the echo */
    await cloud.settle();
    expect(writesBy(cloud, "A", "hunters/uA").length).toBe(1);
    const r = await d.page.evaluate(() => ({ same: state === window.__before, base: state.syncBase, changedAt: state.changedAt, pause: syncPause }));
    expect(r.same).toBe(true);        /* nothing was adopted */
    expect(r.base).toBe(r.changedAt);
    expect(r.pause).toBe("");
  });

  test("both changed: nothing is written, nothing is queued offline, and the hero is told; UPLOAD then settles it", async ({ browser }) => {
    const cloud = createCloud();
    const { d1, d2 } = await twoSyncedPhones(browser, cloud);
    await d1.dev.setOffline(true);
    await heroChange(d1.page, () => { state.totalCompleted += 5; save(); });
    await d1.page.waitForTimeout(1800);
    expect(d1.dev.queued).toBe(0);    /* no blind write waits to be replayed */
    await heroChange(d2.page, () => { state.hunterName = "Phone 2 Hero"; save(); });
    expect(await waitFor(() => cloudHero(cloud, "u1").hunterName === "Phone 2 Hero")).toBe(true);
    await cloud.settle();
    cloud.clearWrites();
    await d1.dev.setOffline(false);
    await d1.page.waitForTimeout(SETTLE_MS);
    expect(cloud.writes.filter((w) => w.device === "P1")).toEqual([]);
    expect(cloudHero(cloud, "u1").hunterName).toBe("Phone 2 Hero");
    const r1 = await d1.page.evaluate(() => ({ pause: syncPause, done: state.totalCompleted,
      note: document.getElementById("cloudSyncPause").textContent }));
    expect(r1.pause).toBe("ask");
    expect(r1.done).toBe(217);        /* this device keeps its own copy */
    expect(r1.note).toContain("Both copies of your hero changed");
    expect(await d1.page.evaluate(() => { state.lang = "uz"; renderCloudStatus(); const t = document.getElementById("cloudSyncPause").textContent; state.lang = "en"; return t; }))
      .toContain("sinxronlash toʻxtatildi");

    /* the hero chooses this device: the cloud copy is kept here first, then replaced */
    d1.page.on("dialog", (dlg) => dlg.accept());
    await d1.page.evaluate(() => cloudUpload());
    expect(await waitFor(() => cloudHero(cloud, "u1").totalCompleted === 217)).toBe(true);
    await d2.page.waitForFunction(() => state.totalCompleted === 217);   /* the other phone follows */
    const r2 = await d1.page.evaluate(() => new Promise((res) => idbAllKeys("snapshots", (ks) => {
      const pre = ks.map(String).filter((k) => k.indexOf("pre-") === 0).sort();
      idbGet("snapshots", pre[pre.length - 1], (v) => res({ pause: syncPause, label: v.label, name: JSON.parse(v.json).hunterName }));
    })));
    expect(r2).toEqual({ pause: "", label: "cloud", name: "Phone 2 Hero" });
  });

  test("the clan card is published only after the decision, from the hero that won", async ({ browser }) => {
    const cloud = createCloud();
    const d = await phone(browser, cloud, "A");
    await setHero(d.page, hero({ guildId: "gA", level: 14 }));
    cloud.put("hunters/uA", rec(hero({ guildId: "gA", level: 20, savedAt: new Date().toISOString() })));
    await d.dev.signIn("uA");
    await d.page.waitForFunction(() => state.level === 20);
    expect(await waitFor(() => writesBy(cloud, "A", "guilds/gA/members/uA").length > 0)).toBe(true);
    const levels = writesBy(cloud, "A", "guilds/gA/members/uA").map((w) => w.value.level);
    expect(levels.every((l) => l === 20)).toBe(true);   /* never the device's old level 14 */
  });

  test("the push refuses to write when the cloud moved after it was read", async ({ browser }) => {
    const cloud = createCloud();
    const d = await phone(browser, cloud, "A");
    await setHero(d.page, hero());
    await d.dev.signIn("uA");
    expect(await waitFor(() => !!cloudHero(cloud, "uA"))).toBe(true);
    await d.page.waitForTimeout(500);
    /* another phone writes between this phone's read and its write */
    await d.page.exposeFunction("__otherPhoneWrites", () => {
      cloud.put("hunters/uA", rec(hero({ hunterName: "Other Phone", schemaVersion: 1, changedAt: Date.now() + 5000, ownerUid: "uA" })));
    });
    await d.page.evaluate(() => {
      const ref = cloudRef, real = ref.once;
      ref.once = function (ev, cb) {
        ref.once = real;
        return real.call(ref, ev).then((snap) => window.__otherPhoneWrites().then(() => { cb(snap); return snap; }));
      };
    });
    cloud.clearWrites();
    await heroChange(d.page, () => { state.totalCompleted += 1; save(); });
    await d.page.waitForTimeout(SETTLE_MS);
    await cloud.settle();
    expect(writesBy(cloud, "A", "hunters/uA")).toEqual([]);
    expect(cloudHero(cloud, "uA").hunterName).toBe("Other Phone");
    expect(await d.page.evaluate(() => syncPause)).toBe("ask");
  });
});
