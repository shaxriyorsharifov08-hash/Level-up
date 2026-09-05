/* The app must open. If this file fails, nothing else matters. */
const { test, expect } = require("@playwright/test");
const { APP_URL, bootAsGuest, drainAnnouncements } = require("./helpers");

test.describe("boot", () => {
  test("opens on the world with no JavaScript errors", async ({ page }) => {
    const errors = await bootAsGuest(page);
    const info = await page.evaluate(() => ({
      page: currentPage,
      worldShown: document.getElementById("page-world").style.display !== "none",
      canvasWidth: document.getElementById("worldCv").width,
      looping: !!wRAF,
      hasState: !!state && !!state.quests
    }));
    expect(info.page).toBe("world");
    expect(info.worldShown).toBe(true);
    expect(info.canvasWidth).toBeGreaterThan(0);
    expect(info.looping).toBe(true);
    expect(info.hasState).toBe(true);
    expect(errors).toEqual([]);
  });

  test("a brand new hunter is asked to swear the Oath, and cannot skip it", async ({ page }) => {
    await page.route(/^https?:\/\//, (route) => route.abort());
    await page.goto(APP_URL, { waitUntil: "domcontentloaded" });
    await page.waitForFunction(() => typeof window.state === "object" && window.state !== null);
    await page.click("#entUserBtn");
    await page.click("#entGuestBtn");
    await page.waitForSelector("#oathOv.show", { timeout: 15000 });

    expect(await page.locator(".oath-in").count()).toBe(4);
    expect(await page.locator("#oathSeal").isDisabled()).toBe(true);
    expect(await page.locator("#oathLater").isVisible()).toBe(false);

    /* answers under the minimum length are refused */
    await page.evaluate(() => {
      document.querySelectorAll(".oath-in").forEach((t) => {
        t.value = "too short";
        t.dispatchEvent(new Event("input", { bubbles: true }));
      });
    });
    expect(await page.locator("#oathSeal").isDisabled()).toBe(true);
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
    expect(nav).toEqual(["world", "home", "quests"]);
  });
});
