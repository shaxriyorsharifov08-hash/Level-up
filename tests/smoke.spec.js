/* The app must open. If this file fails, nothing else matters. */
const { test, expect } = require("@playwright/test");
const { APP_URL, bootAsGuest, drainAnnouncements } = require("./helpers");

test.describe("boot", () => {
  test("opens on HOME with no JavaScript errors", async ({ page }) => {
    const errors = await bootAsGuest(page);
    const info = await page.evaluate(() => ({
      page: currentPage,
      homeShown: document.getElementById("page-home").style.display !== "none",
      hasState: !!state && !!state.quests
    }));
    expect(info.page).toBe("home");
    expect(info.homeShown).toBe(true);
    expect(info.hasState).toBe(true);
    expect(errors).toEqual([]);
  });

  test("the walkable world is gone, and nothing still points at it", async ({ page }) => {
    await bootAsGuest(page);
    const leftovers = await page.evaluate(() => ({
      page: !!document.getElementById("page-world"),
      canvas: !!document.getElementById("worldCv"),
      inPages: PAGES.indexOf("world") !== -1,
      inNavIcons: !!NAV_ICON.world,
      inNavConfig: state.navConfig.filter((c) => c.page === "world").length,
      engine: typeof window.WMAPS,
      three: typeof window.THREE,
      savedPosition: state.world
    }));
    expect(leftovers.page).toBe(false);
    expect(leftovers.canvas).toBe(false);
    expect(leftovers.inPages).toBe(false);
    expect(leftovers.inNavIcons).toBe(false);
    expect(leftovers.inNavConfig).toBe(0);
    expect(leftovers.engine).toBe("undefined");
    expect(leftovers.three).toBe("undefined");
    expect(leftovers.savedPosition).toBeUndefined();
  });

  test("an old save that was standing in the world still opens", async ({ page }) => {
    await bootAsGuest(page);
    const result = await page.evaluate(() => {
      const old = JSON.parse(localStorage.getItem(SKEY));
      old.world = { map: "academy", x: 300, y: 500, seen: true };
      old.navConfig = [{ page: "world", label: "WORLD", hidden: false },
                       { page: "home", label: "HOME", hidden: false }];
      localStorage.setItem(SKEY, JSON.stringify(old));
      load();
      reconcileNav();
      return {
        worldDropped: state.world === undefined,
        navClean: state.navConfig.filter((c) => c.page === "world").length,
        homeStillThere: state.navConfig.filter((c) => c.page === "home").length
      };
    });
    expect(result.worldDropped).toBe(true);
    expect(result.navClean).toBe(0);
    expect(result.homeStillThere).toBe(1);
  });

  test("a brand-new hero goes straight in; the Oath waits for the first finished day and takes any answer", async ({ page }) => {
    await page.route(/^https?:\/\//, (route) => route.abort());
    await page.goto(APP_URL, { waitUntil: "domcontentloaded" });
    await page.waitForFunction(() => typeof window.state === "object" && window.state !== null);
    await page.click("#entGuestBtn");
    await page.waitForTimeout(1700); /* longer than the Oath's own 1.2 s delay */
    expect(await page.evaluate(() => document.getElementById("oathOv").classList.contains("show"))).toBe(false);

    /* a day was finished yesterday: the next open asks */
    await page.evaluate(() => {
      state.history[addDays(todayStr(), -1)] = { xp: 10, count: 1 };
      save();
    });
    await page.reload({ waitUntil: "domcontentloaded" });
    await page.waitForSelector("#oathOv.show", { timeout: 15000 });
    expect(await page.locator(".oath-in").count()).toBe(4);
    expect(await page.locator("#oathSeal").isDisabled()).toBe(true); /* nothing written yet */

    /* one character each is enough: the hero decides how much to write */
    await page.evaluate(() => {
      document.querySelectorAll(".oath-in").forEach((t) => {
        t.value = "x";
        t.dispatchEvent(new Event("input", { bubbles: true }));
      });
      const sign = document.getElementById("oathSign");
      sign.value = "A";
      sign.dispatchEvent(new Event("input", { bubbles: true }));
    });
    expect(await page.locator("#oathSeal").isDisabled()).toBe(false);
  });

  test("every registered page can be opened", async ({ page }) => {
    await bootAsGuest(page);
    const result = await page.evaluate(() => {
      const missing = [];
      PAGES.forEach((p) => { if (!document.getElementById("page-" + p)) missing.push(p); });
      return { missing: missing, count: PAGES.length };
    });
    expect(result.missing).toEqual([]);
    expect(result.count).toBeGreaterThan(10);
  });

  test("the navigation dock leads with the daily loop", async ({ page }) => {
    await bootAsGuest(page);
    const nav = await page.evaluate(() => state.navConfig.map((c) => c.page).slice(0, 3));
    expect(nav).toEqual(["home", "quests", "learn"]);
  });
});
