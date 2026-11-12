/* SYNC CORE (Mission 1.2, round A): the parts sync is built on, tested without
   any cloud. A real change time (changedAt) that opening the app never moves,
   the numbered save migrations (schemaVersion), the pure pickWinner() rule
   table, and the safety snapshots taken before anything overwrites a save.
   The owner's rule under test: never break existing user data. README 4, "Sync safety". */
const { test, expect } = require("@playwright/test");
const fs = require("fs");
const path = require("path");
const { bootAsGuest, drainAnnouncements } = require("./helpers");

/* a real save from before this change: savedAt four weeks before "today", 9000 saves */
const OLD = JSON.parse(fs.readFileSync(path.join(__dirname, "fixtures", "old-save-2026-10.json"), "utf8"));
const OLD_AT = Date.parse(OLD.savedAt);
const TODAY = "2026-11-12T12:00:00";

const settle = (page) => page.waitForFunction(() => !!idb && state.lastSnapshotDay === todayStr());
const snapKeys = (page) => page.evaluate(() => new Promise((res) => idbAllKeys("snapshots", (k) => res(k.map(String)))));

test.describe("sync core: change time and save version", () => {
  test.beforeEach(async ({ page }) => { await page.clock.setSystemTime(new Date(TODAY)); });

  test("an old save through load() gets version 1 and its change time, and nothing else changes", async ({ page }) => {
    await bootAsGuest(page);
    const after = await page.evaluate((old) => {
      localStorage.setItem(SKEY, JSON.stringify(old));
      load();
      return JSON.parse(JSON.stringify(state));
    }, OLD);
    /* the only differences: the three new sync fields and the version number */
    expect(after).toEqual(Object.assign({}, OLD, { changedAt: OLD_AT, ownerUid: "", syncBase: 0, schemaVersion: 1 }));
  });

  test("an old phone opened after weeks keeps its old change time, open after open, until the hero acts", async ({ page }) => {
    await bootAsGuest(page);
    await page.evaluate((old) => { localStorage.setItem(SKEY, JSON.stringify(old)); }, OLD);
    await page.reload();
    await page.waitForFunction(() => typeof state === "object" && state !== null);
    await settle(page);
    const first = await page.evaluate(() => {
      const kept = JSON.parse(localStorage.getItem(SKEY));
      return { v: state.schemaVersion, changedAt: state.changedAt, keptChangedAt: kept.changedAt,
               saves: state.saveCount, name: state.hunterName, level: state.level, totalXp: state.totalXp,
               quests: state.quests.map((q) => q.name) };
    });
    expect(first.v).toBe(1);
    expect(first.changedAt).toBe(OLD_AT);
    expect(first.keptChangedAt).toBe(OLD_AT);
    expect(first.saves).toBeGreaterThan(9000);   /* boot housekeeping did save... */
    expect(first.name).toBe(OLD.hunterName);     /* ...and the hero is intact */
    expect(first.level).toBe(OLD.level);
    expect(first.totalXp).toBe(OLD.totalXp);
    expect(first.quests).toEqual(OLD.quests.map((q) => q.name));

    /* opened again the next day: the daily reset and penalties save again, still no touch */
    await page.clock.setSystemTime(new Date("2026-11-13T12:00:00"));
    await page.reload();
    await page.waitForFunction(() => typeof state === "object" && state !== null);
    await settle(page);
    const second = await page.evaluate(() => ({ changedAt: state.changedAt, saves: state.saveCount, v: state.schemaVersion }));
    expect(second.saves).toBeGreaterThan(first.saves);
    expect(second.changedAt).toBe(OLD_AT);
    expect(second.v).toBe(1);

    /* the first real key press makes the next save a change */
    await page.keyboard.press("Shift");
    const moved = await page.evaluate(() => { save(); return { changedAt: state.changedAt, now: Date.now() }; });
    expect(moved.changedAt).toBeGreaterThan(OLD_AT);
    expect(moved.changedAt).toBeLessThanOrEqual(moved.now);
    expect(moved.now - moved.changedAt).toBeLessThan(5000);
  });

  test("a script-made event is not the hero; a real tap is; the time never goes backwards", async ({ page }) => {
    await bootAsGuest(page);
    const r = await page.evaluate(() => {
      const c0 = state.changedAt;
      document.dispatchEvent(new KeyboardEvent("keydown", { key: "a", bubbles: true }));
      document.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }));
      save();
      return { c0: c0, c1: state.changedAt };
    });
    expect(r.c1).toBe(r.c0);

    await page.mouse.click(5, 5);   /* a real tap on the page */
    const tapped = await page.evaluate(() => { save(); return state.changedAt; });
    expect(tapped).toBeGreaterThan(r.c1);

    /* a phone whose clock was moved back: the change time still only grows */
    const future = await page.evaluate(() => {
      state.changedAt = Date.now() + 86400000 * 30;
      const before = state.changedAt;
      markChanged(); save();
      return { before: before, after: state.changedAt };
    });
    expect(future.after).toBe(future.before + 1);
  });

  test("a grind session that ends by itself is the hero's change", async ({ page }) => {
    await bootAsGuest(page);
    await page.evaluate(() => {
      state.quests = [makeQuest("🏃", "Morning run", "d", "daily", [], "easy", "END", "", false, 1)];
      state.focus.mode = "grind"; state.focus.work = 25; state.focus.rest = 5; state.focus.laps = 2;
      save();
      startTimer(state.quests[0].id);
    });
    const c0 = await page.evaluate(() => state.changedAt);
    /* two whole cycles done; the app's own 1-second tick ends the session */
    await page.evaluate(() => { state.activeTimer.accumulated = 60 * 60; });
    await page.waitForFunction(() => !state.activeTimer);
    await drainAnnouncements(page);
    expect(await page.evaluate(() => state.changedAt)).toBeGreaterThan(c0);
  });

  test("upgradeSave works on a raw cloud copy, twice is the same as once, and a newer version is left alone", async ({ page }) => {
    await bootAsGuest(page);
    const r = await page.evaluate((old) => {
      const raw = JSON.parse(JSON.stringify(old));
      upgradeSave(raw);
      const once = JSON.stringify(raw);
      upgradeSave(raw);
      migSyncV1(raw);   /* a step run again by hand changes nothing either */
      const newer = upgradeSave({ schemaVersion: 7, changedAt: 5, savedAt: "2026-01-01T00:00:00.000Z" });
      return { raw: raw, same: once === JSON.stringify(raw), newer: newer };
    }, OLD);
    expect(r.raw.schemaVersion).toBe(1);
    expect(r.raw.changedAt).toBe(OLD_AT);
    expect(r.raw.ownerUid).toBe("");
    expect(r.raw.syncBase).toBe(0);
    expect(r.same).toBe(true);
    expect(r.newer).toEqual({ schemaVersion: 7, changedAt: 5, savedAt: "2026-01-01T00:00:00.000Z" });
  });
});

test.describe("sync core: pickWinner", () => {
  test.beforeEach(async ({ page }) => { await page.clock.setSystemTime(new Date(TODAY)); });

  test("the rule table, every branch", async ({ page }) => {
    await bootAsGuest(page);
    const DAY = 86400000;
    const NOW = Date.parse("2026-11-12T10:00:00.000Z");
    const hero = (o) => Object.assign({
      hunterName: "Bekzod", created: "2026-03-02", level: 9, totalXp: 3260, totalCompleted: 143,
      quests: [{ name: "Read 20 pages", system: false }], schemaVersion: 1,
      changedAt: NOW - DAY, ownerUid: "u1", syncBase: 0, saveCount: 500
    }, o || {});
    const fresh = (o) => Object.assign({
      hunterName: "Hero", created: "2026-11-12", level: 1, totalXp: 0, totalCompleted: 0,
      quests: [{ name: "First Step Ritual", system: true }], todos: [], schemaVersion: 1,
      changedAt: NOW, ownerUid: "", syncBase: 0, saveCount: 6
    }, o || {});
    /* a phone from before this change, untouched for four weeks: no version, no changedAt */
    const oldPhone = Object.assign(JSON.parse(JSON.stringify(OLD)), { hunterName: "Bekzod", created: "2026-03-02" });
    const rows = [
      ["no cloud copy yet", hero(), null, "local"],
      ["a cloud record with no save in it", hero(), { updatedAt: NOW }, "local"],
      ["deleted, this copy is the account's and older", hero({ changedAt: NOW - 2 * DAY }), { deleted: true, deletedAt: NOW - DAY }, "deleted"],
      ["deleted, but changed here after the deletion", hero({ changedAt: NOW }), { deleted: true, deletedAt: NOW - DAY }, "local"],
      ["deleted, this copy was never linked to an account", hero({ ownerUid: "", changedAt: NOW - 2 * DAY }), { deleted: true, deletedAt: NOW - DAY }, "local"],
      ["another account's hero on this phone", hero({ ownerUid: "u2" }), hero({ ownerUid: "u1" }), "otherOwner"],
      ["another account's hero, this account has no cloud copy", hero({ ownerUid: "u2" }), null, "otherOwner"],
      ["the same change on both", hero(), hero({ saveCount: 99999 }), "same"],
      ["synced before: only the cloud moved", hero({ syncBase: NOW - 3 * DAY, changedAt: NOW - 3 * DAY }), hero({ changedAt: NOW - DAY }), "remote"],
      ["synced before: only this device moved", hero({ syncBase: NOW - 3 * DAY, changedAt: NOW }), hero({ changedAt: NOW - 3 * DAY }), "local"],
      ["synced before: both moved", hero({ syncBase: NOW - 3 * DAY, changedAt: NOW }), hero({ changedAt: NOW - DAY }), "ask"],
      ["never synced: a fresh device meets a cloud hero", fresh(), hero(), "remote"],
      ["never synced: a hero meets an empty cloud copy", hero(), fresh({ changedAt: NOW + DAY }), "local"],
      ["never synced: the same hero, this device newer", hero({ changedAt: NOW }), hero(), "local"],
      ["never synced: the same hero, the cloud newer", hero(), hero({ changedAt: NOW }), "remote"],
      ["never synced: two different heroes", hero({ changedAt: NOW }), hero({ hunterName: "Aziza", created: "2026-05-01" }), "ask"],
      ["old phone after weeks, 9000 saves, against yesterday's cloud with 40", oldPhone, hero({ ownerUid: "", saveCount: 40 }), "remote"],
      ["old phone after weeks, synced back then, against yesterday's cloud", Object.assign({}, oldPhone, { schemaVersion: 1, changedAt: OLD_AT, syncBase: OLD_AT }), hero({ saveCount: 40 }), "remote"],
      ["an old cloud copy is read by its savedAt", hero({ changedAt: NOW }), { hunterName: "Bekzod", created: "2026-03-02", level: 9, totalXp: 3000, savedAt: new Date(NOW - 3 * DAY).toISOString(), saveCount: 9999 }, "local"],
      ["the cloud record itself ({json}) is read", hero(), { json: JSON.stringify(hero({ changedAt: NOW })), updatedAt: NOW }, "remote"]
    ];
    const r = await page.evaluate((rows) => {
      const before = JSON.stringify(rows), stateBefore = JSON.stringify(state);
      const out = {};
      rows.forEach((row) => { out[row[0]] = pickWinner(row[1], row[2], "u1"); });
      return { out: out, pure: JSON.stringify(rows) === before && JSON.stringify(state) === stateBefore };
    }, rows);
    const want = {};
    rows.forEach((row) => { want[row[0]] = row[3]; });
    expect(r.out).toEqual(want);
    expect(r.pure).toBe(true);   /* it changed neither its arguments nor the live save */
  });
});

test.describe("sync core: snapshots before overwrites", () => {
  test.beforeEach(async ({ page }) => { await page.clock.setSystemTime(new Date(TODAY)); });

  test("safety snapshots keep 5, daily ones keep 14, and neither evicts the other", async ({ page }) => {
    await bootAsGuest(page);
    await settle(page);
    const r = await page.evaluate(async () => {
      const wait = (ms) => new Promise((res) => setTimeout(res, ms));
      const keys = () => new Promise((res) => idbAllKeys("snapshots", (k) => res(k.map(String))));
      for (let i = 1; i <= 16; i++) idbPut("snapshots", "2026-10-" + String(i).padStart(2, "0"), "{}");
      for (let i = 0; i < 7; i++) vaultSnapshot(JSON.stringify({ hunterName: "copy " + i }), "cloud");
      await wait(400);
      const mid = await keys();
      pruneSnapshots();
      await wait(400);
      const end = await keys();
      const pre = end.filter((k) => k.indexOf("pre-") === 0).sort();
      const newest = await new Promise((res) => idbGet("snapshots", pre[pre.length - 1], res));
      return {
        dailyBeforePrune: mid.filter((k) => /^\d{4}-\d\d-\d\d$/.test(k)).length,
        daily: end.filter((k) => /^\d{4}-\d\d-\d\d$/.test(k)).sort(),
        pre: pre.length, newest: newest
      };
    });
    expect(r.dailyBeforePrune).toBe(17);   /* the safety prune touched no daily snapshot */
    expect(r.daily.length).toBe(14);
    expect(r.daily[0]).toBe("2026-10-04");
    expect(r.daily[13]).toBe("2026-11-12");
    expect(r.pre).toBe(5);                 /* the daily prune touched no safety snapshot */
    expect(r.newest.label).toBe("cloud");
    expect(JSON.parse(r.newest.json).hunterName).toBe("copy 6");
  });

  test("a snapshot asked for while the vault is still opening waits for it", async ({ page }) => {
    await bootAsGuest(page);
    await settle(page);
    const r = await page.evaluate(async () => {
      idb = null; vaultQueue = [];   /* as at boot, before IndexedDB has answered */
      vaultSnapshot(JSON.stringify({ hunterName: "Queued" }), "cloud");
      const queued = vaultQueue.length;
      await new Promise((res) => idbOpen(res));
      await new Promise((res) => setTimeout(res, 300));
      const keys = await new Promise((res) => idbAllKeys("snapshots", (k) => res(k.map(String))));
      const pre = keys.filter((k) => k.indexOf("pre-") === 0);
      const v = pre.length ? await new Promise((res) => idbGet("snapshots", pre[0], res)) : null;
      return { queued: queued, pre: pre.length, name: v && JSON.parse(v.json).hunterName };
    });
    expect(r.queued).toBe(1);
    expect(r.pre).toBe(1);
    expect(r.name).toBe("Queued");
  });

  test("importing a backup keeps the replaced progress, and the backup becomes the newest change", async ({ page }) => {
    await bootAsGuest(page);
    await settle(page);
    await page.evaluate(() => { state.hunterName = "Before Import"; save(); });
    page.once("dialog", (d) => d.accept());
    await page.setInputFiles("#admImportFile", {
      name: "levelup-backup-2026-10-15.json", mimeType: "application/json",
      buffer: Buffer.from(JSON.stringify(OLD))
    });
    await page.waitForFunction((n) => state.hunterName === n, OLD.hunterName);
    await page.waitForTimeout(300);
    const r = await page.evaluate(async () => {
      const keys = await new Promise((res) => idbAllKeys("snapshots", (k) => res(k.map(String))));
      const pre = keys.filter((k) => k.indexOf("pre-") === 0);
      const v = await new Promise((res) => idbGet("snapshots", pre[0], res));
      return { pre: pre.length, label: v.label, kept: JSON.parse(v.json).hunterName,
               v: state.schemaVersion, changedAt: state.changedAt, now: Date.now() };
    });
    expect(r.pre).toBe(1);
    expect(r.label).toBe("import");
    expect(r.kept).toBe("Before Import");
    expect(r.v).toBe(1);
    expect(r.changedAt).toBeGreaterThan(OLD_AT);   /* not the backup's old time: the restore is the change */
    expect(r.now - r.changedAt).toBeLessThan(5000);

    /* DATA VAULT names it in the hero's language */
    await drainAnnouncements(page);
    await page.evaluate(() => { state.lang = "ru"; renderSnapshots(); });
    await expect(page.locator("#admSnapshots")).toContainText("Перед импортом");
    await expect(page.locator("#admSnapshots")).toContainText("Ежедневный снимок");
  });

  test("restoring another account's snapshot asks first; a no changes nothing", async ({ page }) => {
    await bootAsGuest(page);
    await settle(page);
    const KEY = "pre-2026-11-01T10:00:00.000Z";
    await page.evaluate((key) => {
      state.ownerUid = "uA"; state.hunterName = "Mine"; save();
      const other = Object.assign(JSON.parse(JSON.stringify(state)), { hunterName: "Someone Else", ownerUid: "uB" });
      idbPut("snapshots", key, { label: "cloud", json: JSON.stringify(other) });
      renderSnapshots();
    }, KEY);
    const btn = '#admSnapshots button[data-snap="' + KEY + '"]';
    await page.waitForSelector(btn, { state: "attached" });
    await expect(page.locator("#admSnapshots")).toContainText("Before cloud sync");

    const asked = [];
    let answer = false;
    page.on("dialog", (d) => { asked.push(d.message()); answer ? d.accept() : d.dismiss(); });
    await page.evaluate((b) => document.querySelector(b).click(), btn);
    await expect.poll(() => asked.length).toBe(1);
    expect(asked[0]).toContain("another account");
    expect(await page.evaluate(() => state.hunterName)).toBe("Mine");

    answer = true;
    await page.evaluate((b) => document.querySelector(b).click(), btn);
    await page.waitForFunction(() => state.hunterName === "Someone Else");
    expect(asked[1]).toContain("another account");
    await page.waitForTimeout(300);
    const keys = await snapKeys(page);
    const kept = await page.evaluate((ks) => new Promise((res) => {
      const pre = ks.filter((k) => k.indexOf("pre-") === 0 && k !== "pre-2026-11-01T10:00:00.000Z");
      idbGet("snapshots", pre[0], (v) => res({ n: pre.length, label: v.label, name: JSON.parse(v.json).hunterName }));
    }), keys);
    expect(kept).toEqual({ n: 1, label: "restore", name: "Mine" });
  });
});
