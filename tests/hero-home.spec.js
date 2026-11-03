/* TODAY AND THE HERO ARE ONE PLACE (README 4y).
   TODAY's hero card is the only hero card. Tapping it opens the hero's page
   (portrait, rank evaluation, attributes, the Oath, dossier, titles, badges,
   pages of the hero), and the long parts of that page fold to one row. The
   Mentor and Premium have their own pages in MORE. Old saves get the new
   pages in their place and keep their own names and order. */
const { test, expect } = require("@playwright/test");
const { bootAsGuest } = require("./helpers");

const ready = (page) => page.waitForFunction(() => typeof window.state === "object" && window.state !== null && typeof window.switchPage === "function");

test.describe("TODAY and the hero", () => {
  test("the hero card on TODAY opens the hero, and TODAY brings the hero back", async ({ page }) => {
    await bootAsGuest(page);
    await expect(page.locator("#todayHero")).toHaveAttribute("role", "button");
    await page.click("#todayHero");
    expect(await page.evaluate(() => currentPage)).toBe("profile");
    await expect(page.locator('#nav .nav-btn[data-tab="today"]')).toHaveClass(/active/); /* the hero lives under TODAY */
    await expect(page.locator("#subnav .sub-btn")).toHaveCount(0);
    await expect(page.locator("#hunterSub")).toHaveText("E-RANK HERO");
    await page.click("#heroBack");
    expect(await page.evaluate(() => currentPage)).toBe("home");
    /* the TODAY tab always opens today, even straight from the hero */
    await page.click("#todayHero");
    await page.click('#nav .nav-btn[data-tab="today"]');
    expect(await page.evaluate(() => currentPage)).toBe("home");
    await expect(page.locator("#subnav .sub-btn")).toHaveCount(0);
    /* the keyboard works too */
    await page.focus("#todayHero");
    await page.keyboard.press("Enter");
    expect(await page.evaluate(() => currentPage)).toBe("profile");
  });

  test("unspent attribute points on the card lead to the hero", async ({ page }) => {
    await bootAsGuest(page);
    await page.evaluate(() => { state.statPoints = 2; save(); renderHome(); });
    await page.click("#homeSpChip");
    expect(await page.evaluate(() => currentPage)).toBe("profile");
    await expect(page.locator("#spBanner")).toBeVisible();
  });

  test("the hero's page shows one hero, and its long parts fold to one row", async ({ page }) => {
    await bootAsGuest(page);
    await page.evaluate(() => switchPage("profile"));
    const r = await page.evaluate(() => {
      const pg = document.getElementById("page-profile");
      const titles = Array.from(pg.querySelectorAll(".panel-title")).map((t) => [t.textContent.trim(), t.parentElement.classList.contains("closed")]);
      return {
        bars: pg.querySelectorAll(".xp-wrap").length,
        mentor: !!pg.querySelector("#mentorPanel"),
        titles
      };
    });
    expect(r.bars).toBe(0);      /* the XP bar is on TODAY's card only */
    expect(r.mentor).toBe(false); /* the Mentor has its own page */
    const closed = Object.fromEntries(r.titles);
    expect(closed["⚖ RANK EVALUATION"]).toBe(false);
    expect(closed["ATTRIBUTES"]).toBe(false);
    for (const t of ["⚔ THE OATH", "📇 HERO DOSSIER", "TITLES", "BADGES", "📓 PAGES OF THE HERO"]) expect(closed[t], t).toBe(true);
    /* one tap opens a folded part */
    await page.click("#page-profile .panel.collapsible:has(.panel-title:text('TITLES')) > .panel-title");
    await expect(page.locator("#titlesList")).toBeVisible();
  });

  test("TODAY is short: the hero card, the Daily Quest, one quest row and at most one tip", async ({ page }) => {
    await bootAsGuest(page);
    const r = await page.evaluate(() => {
      switchPage("home");
      const pg = document.getElementById("page-home");
      const visible = Array.from(pg.children).filter((e) => e.getClientRects().length && e.innerHTML.trim() !== "");
      return visible.map((e) => e.id || e.className);
    });
    expect(r.length).toBeLessThanOrEqual(4);
    expect(r[0]).toBe("todayHero");
    expect(r).toContain("todayQuests");
  });

  test("an old save gets MENTOR and PREMIUM in their place and keeps its own names", async ({ page }) => {
    await bootAsGuest(page);
    await page.evaluate(() => {
      const old = JSON.parse(JSON.stringify(state));
      old.navConfig = old.navConfig.filter((c) => c.page !== "mentor" && c.page !== "premium");
      old.navConfig.forEach((c) => { if (c.page === "learn") c.label = "MY STUDY"; if (c.page === "budget") c.hidden = true; });
      old.hunterName = "Old Nav Save";
      old.saveCount = (state.saveCount || 0) + 500;
      localStorage.setItem("leveluphunter_v1", JSON.stringify(old));
    });
    await page.reload({ waitUntil: "domcontentloaded" });
    await ready(page);
    const r = await page.evaluate(() => {
      document.getElementById("entranceOv").classList.remove("show");
      renderNav();
      return {
        more: tabPages(TABS[4]),
        pages: state.navConfig.map((c) => c.page),
        learn: navEntry("learn").label,
        name: state.hunterName
      };
    });
    expect(r.name).toBe("Old Nav Save");
    expect(r.learn).toBe("MY STUDY");
    expect(r.more).toEqual(["mentor", "learn", "guild", "premium", "guide", "admin"]); /* budget stays hidden by the hero's choice */
    expect(new Set(r.pages).size).toBe(r.pages.length); /* nothing doubled */
  });

  test("the new places speak Russian and Uzbek", async ({ page }) => {
    await bootAsGuest(page);
    for (const [lang, back, mentor, soon] of [["ru", "‹ СЕГОДНЯ", "НАСТАВНИК", "СКОРО"], ["uz", "‹ BUGUN", "MURABBIY", "TEZ ORADA"]]) {
      await page.evaluate((l) => { state.lang = l; save(); }, lang);
      await page.reload({ waitUntil: "domcontentloaded" });
      await ready(page);
      await page.evaluate(() => { document.getElementById("entranceOv").classList.remove("show"); switchPage("profile"); });
      await expect(page.locator("#heroBack")).toHaveText(back);
      await page.evaluate(() => setMoreOpen(true));
      await expect(page.locator('#moreList .more-row[data-page="mentor"]')).toContainText(mentor);
      await expect(page.locator('#moreList .more-row[data-page="premium"] .mr-tag')).toHaveText(soon);
      await page.evaluate(() => setMoreOpen(false));
    }
  });
});
