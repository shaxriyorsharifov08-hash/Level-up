/* The screen-time BREAK REMINDER. Only active use counts: idle time, a hidden
   app and a running focus session never do, and five minutes away resets it. */
const { test, expect } = require("@playwright/test");
const { bootAsGuest, drainAnnouncements } = require("./helpers");

/* Simulate `minutes` of 15-second ticks, the hunter touching the app on each
   tick unless `idle` is set. Runs in one evaluate, so the real interval can't
   interleave. Returns whether the reminder was raised. */
async function simulate(page, minutes, opts) {
  return page.evaluate(({ minutes, opts }) => {
    annQueue.length = 0;
    let t = breakLastTick;
    const raised = () => annQueue.concat(annOpen ? [{ title: document.getElementById("annTitle").textContent }] : [])
      .some((a) => String(a.title).indexOf("BREAK") !== -1);
    for (let i = 0; i < (minutes * 60000) / 15000; i++) {
      t += 15000;
      if (!opts.idle) breakLastInput = t;
      breakTick(t);
      if (raised()) return true;
    }
    return false;
  }, { minutes, opts: opts || {} });
}

test.describe("break reminder", () => {
  test("an older save without the setting gets the 30-minute default and keeps its data", async ({ page }) => {
    await bootAsGuest(page);
    await page.evaluate(() => {
      const old = JSON.parse(JSON.stringify(state));
      delete old.breakMins;
      delete old.premiumInterest;
      old.hunterName = "Old Save";
      old.quests.push(makeQuest("📚", "Kept quest", "", "daily", [], "easy", "INT", "", false, 1));
      old.saveCount = (state.saveCount || 0) + 500; /* newer than the vault copy */
      localStorage.setItem("leveluphunter_v1", JSON.stringify(old));
    });
    await page.reload({ waitUntil: "domcontentloaded" });
    await page.waitForFunction(() => typeof window.state === "object" && window.state !== null && typeof window.breakTick === "function");
    const s = await page.evaluate(() => ({
      mins: state.breakMins, interest: state.premiumInterest, name: state.hunterName,
      kept: state.quests.some((q) => q.name === "Kept quest")
    }));
    expect(s).toEqual({ mins: 30, interest: "", name: "Old Save", kept: true });
  });

  test("a corrupt value is reset instead of firing every tick", async ({ page }) => {
    await bootAsGuest(page);
    const mins = await page.evaluate(() => { state.breakMins = "soon"; migrateState(); return state.breakMins; });
    expect(mins).toBe(30);
  });

  test("it reminds after the chosen minutes of active use", async ({ page }) => {
    await bootAsGuest(page);
    await page.evaluate(() => { state.breakMins = 20; breakActiveMs = 0; breakLastTick = Date.now(); });
    expect(await simulate(page, 19)).toBe(false);
    expect(await simulate(page, 2)).toBe(true);
    await drainAnnouncements(page);
  });

  test("idle time does not count", async ({ page }) => {
    await bootAsGuest(page);
    await page.evaluate(() => { state.breakMins = 20; breakActiveMs = 0; breakLastTick = Date.now(); breakLastInput = 0; });
    expect(await simulate(page, 45, { idle: true })).toBe(false);
  });

  test("a running focus session does not count", async ({ page }) => {
    await bootAsGuest(page);
    await page.evaluate(() => {
      state.breakMins = 20; breakActiveMs = 0; breakLastTick = Date.now();
      state.activeTimer = { id: "x", name: "Study", startedAt: Date.now(), accumulated: 0, paused: false };
    });
    expect(await simulate(page, 45)).toBe(false);
    await page.evaluate(() => { state.activeTimer = null; });
  });

  test("Off means never", async ({ page }) => {
    await bootAsGuest(page);
    await page.evaluate(() => { state.breakMins = 0; breakActiveMs = 0; breakLastTick = Date.now(); });
    expect(await simulate(page, 120)).toBe(false);
  });

  test("five minutes away counts as a break and starts the count again", async ({ page }) => {
    await bootAsGuest(page);
    await page.evaluate(() => { state.breakMins = 20; breakActiveMs = 0; breakLastTick = Date.now(); });
    expect(await simulate(page, 19)).toBe(false);
    /* the app was away for 6 minutes, then the hunter is back */
    await page.evaluate(() => { const t = breakLastTick + 6 * 60000; breakLastInput = t; breakTick(t); });
    expect(await simulate(page, 5)).toBe(false);
    expect(await page.evaluate(() => breakActiveMs)).toBeLessThan(10 * 60000);
  });

  test("the setting is saved and shown in SETTINGS", async ({ page }) => {
    await bootAsGuest(page);
    await page.evaluate(() => switchPage("admin"));
    await expect(page.locator("#breakMinsSel")).toHaveValue("30");
    await page.selectOption("#breakMinsSel", "45");
    const stored = await page.evaluate(() => JSON.parse(localStorage.getItem("leveluphunter_v1")).breakMins);
    expect(stored).toBe(45);
  });
});
