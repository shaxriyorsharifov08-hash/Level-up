/* THE CHRONICLE — the hunter's own history told back, a chapter per month.
   What matters: it is built from the record and says only what is true,
   it quotes the hunter's words safely, and it never writes to the save. */
const { test, expect } = require("@playwright/test");
const { bootAsGuest } = require("./helpers");

/* three full months behind the current one: strong, collapsed, back again */
async function seedThreeMonths(page) {
  return page.evaluate(() => {
    const t = todayStr();
    const y = +t.slice(0, 4), m = +t.slice(5, 7);
    const key = (back) => {
      const d = new Date(y, m - 1 - back, 1);
      return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0");
    };
    const k3 = key(3), k2 = key(2), k1 = key(1);
    state.created = k3 + "-01";
    state.history = {};
    state.timeHistory = {};
    const fill = (k, days) => {
      for (let d = 1; d <= days; d++) {
        const ds = k + "-" + String(d).padStart(2, "0");
        state.history[ds] = { xp: 100, count: 4 };
        state.timeHistory[ds] = 1800;
      }
    };
    fill(k3, 26);   /* showed up nearly every day */
    fill(k2, 3);    /* then almost nothing */
    fill(k1, 20);   /* and came back */
    state.journal = {};
    state.journal[k2 + "-03"] = { interesting: "I skipped everything <img src=x onerror=window.__pwned=1> and felt it", mistake: "", tomorrow: "" };
    state.honors = [{ id: "h1", type: "challenge", icon: "🔥", name: "30 days of running", completedOn: k1 + "-20", started: k3 + "-01", target: 30 }];
    state.reports = {};
    state.reports["m:" + k1] = { text: "I came back because the oath was still on the wall.", at: k1 + "-28", late: false };
    save();
    return { k3, k2, k1 };
  });
}

async function openChronicle(page) {
  await page.evaluate(() => { switchPage("story"); setStoryView("chronicle"); });
  await page.waitForSelector("#chronicleView .chron-ch");
}

test.describe("the chronicle", () => {
  test("one chapter per month, newest first, numbered from the beginning", async ({ page }) => {
    await bootAsGuest(page);
    const k = await seedThreeMonths(page);
    await openChronicle(page);
    const ch = await page.$$eval(".chron-ch", (els) => els.map((e) => e.getAttribute("data-chapter")));
    expect(ch.length).toBe(4);
    expect(ch.slice(1)).toEqual([k.k1, k.k2, k.k3]);
    await expect(page.locator(".chron-ch").first().locator(".chron-num")).toContainText("CHAPTER 4");
    await expect(page.locator(".chron-ch").first()).toContainText("still being written");
    await expect(page.locator(".chron-ch").last().locator(".chron-title")).toHaveText("The Awakening");
  });

  test("a collapse and a return are named only because they happened", async ({ page }) => {
    await bootAsGuest(page);
    const k = await seedThreeMonths(page);
    await openChronicle(page);
    await expect(page.locator('[data-chapter="' + k.k2 + '"] .chron-title')).toContainText("nearly stopped");
    await expect(page.locator('[data-chapter="' + k.k1 + '"] .chron-title')).toContainText("came back");
    await expect(page.locator('[data-chapter="' + k.k2 + '"]')).toContainText("3 of");
    await expect(page.locator('[data-chapter="' + k.k2 + '"]')).toContainText("23 fewer than the month before");
  });

  test("the record is told: honors, focus, runs, the monthly report", async ({ page }) => {
    await bootAsGuest(page);
    const k = await seedThreeMonths(page);
    await openChronicle(page);
    const c1 = page.locator('[data-chapter="' + k.k1 + '"]');
    await expect(c1).toContainText("30 days of running");
    await expect(c1).toContainText("10h");
    await expect(c1).toContainText("longest unbroken run was 20 days");
    await expect(c1).toContainText("the oath was still on the wall");
  });

  test("the hunter's own words are quoted, never executed", async ({ page }) => {
    await bootAsGuest(page);
    const k = await seedThreeMonths(page);
    await openChronicle(page);
    await expect(page.locator('[data-chapter="' + k.k2 + '"] .chron-quote')).toContainText("<img src=x");
    expect(await page.evaluate(() => window.__pwned)).toBeUndefined();
  });

  test("the prologue is the Oath", async ({ page }) => {
    await bootAsGuest(page);
    await page.evaluate(() => { state.oath.become = "A man who finishes what he starts."; save(); });
    await openChronicle(page);
    await expect(page.locator("#chronPrologue")).toContainText("finishes what he starts");
    await expect(page.locator("#chronPrologue")).toContainText("Tester");
  });

  test("a brand-new hunter gets one honest chapter and no boasts", async ({ page }) => {
    await bootAsGuest(page);
    await openChronicle(page);
    const titles = await page.$$eval(".chron-title", (els) => els.map((e) => e.textContent));
    expect(titles).toEqual(["The Awakening"]);
    await expect(page.locator(".chron-ch")).toContainText("page is blank");
  });

  test("reading the chronicle never writes to the save", async ({ page }) => {
    await bootAsGuest(page);
    await seedThreeMonths(page);
    await page.evaluate(() => { switchPage("story"); setStoryView("chronicle"); });
    const before = await page.evaluate(() => JSON.stringify(state));
    await page.evaluate(() => renderChronicle());
    expect(await page.evaluate(() => JSON.stringify(state))).toBe(before);
  });

  test("a dream remembers the day it came true", async ({ page }) => {
    await bootAsGuest(page);
    await page.evaluate(() => {
      state.dreams = [{ id: "d1", tier: "life", title: "Speak English", note: "", target: "", done: false, created: todayStr() }];
      save(); switchPage("story"); setStoryView("dreams");
    });
    await page.click('[data-dream="d1"] .dream-main');
    expect(await page.evaluate(() => state.dreams[0].doneOn)).toBe(await page.evaluate(() => todayStr()));
    await page.evaluate(() => { document.getElementById("announceOv").classList.remove("show"); setStoryView("chronicle"); });
    await expect(page.locator(".chron-ch").first()).toContainText("A dream came true: Speak English");
  });

  test("the story page remembers the chronicle was open", async ({ page }) => {
    await bootAsGuest(page);
    await openChronicle(page);
    await page.evaluate(() => { switchPage("home"); switchPage("story"); });
    await expect(page.locator("#chronicleView")).toBeVisible();
    await expect(page.locator("#chooseChronicle")).toHaveClass(/active/);
  });
});
