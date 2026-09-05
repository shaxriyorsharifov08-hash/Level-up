/* Regression tests for the three defects found in the September audit.
   These protect a hunter's record. Do not delete them. */
const { test, expect } = require("@playwright/test");
const { bootAsGuest, drainAnnouncements } = require("./helpers");

test.describe("data safety", () => {
  test("a free-text icon cannot inject HTML (audit: it used to execute)", async ({ page }) => {
    await bootAsGuest(page);
    const executed = await page.evaluate(() => {
      window.__pwned = false;
      const q = makeQuest('<img src=x onerror="window.__pwned=true">', "Injection probe",
        "desc", "daily", [], "easy", "END", "", false, 3);
      state.quests.push(q);
      save();
      switchPage("quests");
      return window.__pwned;
    });
    await page.waitForTimeout(600);
    expect(executed).toBe(false);
    expect(await page.evaluate(() => window.__pwned === true)).toBe(false);

    /* and it is shown as literal text rather than swallowed */
    const shown = await page.evaluate(() => {
      const el = document.querySelector(".quest-card:last-child .q-ico");
      return el ? el.textContent : "";
    });
    expect(shown).toContain("<img");
  });

  test("collection emoji is escaped too", async ({ page }) => {
    await bootAsGuest(page);
    const executed = await page.evaluate(() => {
      window.__pwned2 = false;
      state.collections.push({
        id: "probe", emoji: '<img src=x onerror="window.__pwned2=true">',
        name: "Probe crate", tier: "easy", items: [], complete: false
      });
      save();
      switchPage("rewards");
      return window.__pwned2;
    });
    await page.waitForTimeout(600);
    expect(executed).toBe(false);
    expect(await page.evaluate(() => window.__pwned2 === true)).toBe(false);
  });

  test("a failed save warns the hunter instead of losing the record silently", async ({ page }) => {
    await bootAsGuest(page);
    const result = await page.evaluate(() => {
      const original = localStorage.setItem.bind(localStorage);
      localStorage.setItem = function () {
        const e = new Error("QuotaExceededError");
        e.name = "QuotaExceededError";
        throw e;
      };
      saveBroken = false;
      try { save(); } catch (e) { /* save must not throw */ }
      localStorage.setItem = original;
      return { flagged: saveBroken, queued: annQueue.length + (annOpen ? 1 : 0) };
    });
    expect(result.flagged).toBe(true);
    expect(result.queued).toBeGreaterThan(0);
  });

  test("save() never throws even when storage refuses", async ({ page }) => {
    await bootAsGuest(page);
    const threw = await page.evaluate(() => {
      const original = localStorage.setItem.bind(localStorage);
      localStorage.setItem = function () { throw new Error("nope"); };
      let didThrow = false;
      try { save(); } catch (e) { didThrow = true; }
      localStorage.setItem = original;
      return didThrow;
    });
    expect(threw).toBe(false);
  });

  test("an uncaught error shows a recovery bar instead of a dead screen", async ({ page }) => {
    await bootAsGuest(page);
    await page.evaluate(() => {
      try { null.boom(); } catch (e) {
        window.dispatchEvent(new ErrorEvent("error", { error: e, message: "boom" }));
      }
    });
    await page.waitForSelector("#luReload", { timeout: 5000 });
    expect(await page.locator("#luReload").isVisible()).toBe(true);
    /* the app is still alive behind it */
    expect(await page.evaluate(() => typeof renderAll === "function")).toBe(true);
  });

  test("an older save gains new fields without losing anything", async ({ page }) => {
    await bootAsGuest(page);
    const result = await page.evaluate(() => {
      /* a save written before any of the recent features existed */
      const old = {
        hunterName: "Veteran", level: 12, xp: 40, totalXp: 5000,
        stats: { INT: 20, STR: 20, CON: 20, END: 20 }, statPoints: 3,
        quests: [], collections: [], history: { "2026-01-01": { xp: 10, count: 2 } },
        journal: { "2026-01-01": { learn: "old field", changed: "old field", tomorrow: "x" } },
        entryChoice: "guest", seeded: true, created: "2026-01-01"
      };
      localStorage.setItem(SKEY, JSON.stringify(old));
      load();
      return {
        name: state.hunterName,
        level: state.level,
        oldJournalKept: state.journal["2026-01-01"].learn === "old field",
        gotWorld: !!state.world && state.world.map === "city",
        gotLearn: !!state.learn,
        gotReports: typeof state.reports === "object",
        gotOathSlot: state.oath === null || typeof state.oath === "object"
      };
    });
    expect(result.name).toBe("Veteran");
    expect(result.level).toBe(12);
    expect(result.oldJournalKept).toBe(true);
    expect(result.gotWorld).toBe(true);
    expect(result.gotLearn).toBe(true);
    expect(result.gotReports).toBe(true);
  });

  test("the storage key never changes — renaming it orphans every hunter", async ({ page }) => {
    await bootAsGuest(page);
    expect(await page.evaluate(() => SKEY)).toBe("leveluphunter_v1");
  });
});
