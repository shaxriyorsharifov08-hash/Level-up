/* CLOUD SYNC (Mission 1.2, "sync that never loses progress").
   Uses the fake Firebase from fake-firebase.js: two "devices" are two pages in
   two browser contexts that share one in-memory server. Nothing touches the network.

   The tests marked test.fail() reproduce TODAY's data-loss paths. They assert the
   CORRECT behaviour, so the suite is green now and turns red the moment a fix
   lands: whoever fixes the bug then deletes the test.fail() line of that test. */
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
    cloud.put("hunters/uA", rec(hero({ hunterName: "Cloud Hero", saveCount: 99999 })));
    await d.dev.signIn("uA");
    await d.page.waitForFunction(() => state.hunterName === "Cloud Hero");
    cloud.put("hunters/uA", rec(hero({ hunterName: "Live Hero", saveCount: 900000 })));
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

test.describe("cloud sync: today's data-loss paths (test.fail = bug still present)", () => {
  /* BUG: setupAuthListener's first check pushes whenever remote.saveCount <= local.saveCount.
     saveCount rises on EVERY save (even just opening the app), so an old phone with a big
     count overwrites the cloud copy that has the newer work. */
  test("old phone after weeks: its higher saveCount must not overwrite newer cloud work", async ({ browser }) => {
    test.fail();
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
    test.fail();
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
    test.fail();
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
    test.fail();
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
    test.fail();
    const cloud = createCloud();
    const { d1, d2 } = await twoSyncedPhones(browser, cloud);
    await d1.dev.setOffline(true);
    await d1.page.evaluate(() => { for (let i = 0; i < 5; i++) { state.totalCompleted += 1; save(); } });
    await d1.page.waitForTimeout(1800); /* the push timer fires and the write is queued */
    await d2.page.evaluate(() => { state.hunterName = "Newer On Phone 2"; state.totalCompleted += 20; save(); });
    expect(await waitFor(() => (cloudHero(cloud, "u1") || {}).hunterName === "Newer On Phone 2")).toBe(true);
    await d1.dev.setOffline(false);
    await d1.page.waitForTimeout(SETTLE_MS);
    expect(cloudHero(cloud, "u1").hunterName).toBe("Newer On Phone 2");
  });
});
