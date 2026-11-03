/* THE PREMIUM PAGE (README 4r, 4y): MORE → ⭐ PREMIUM, marked SOON. It shows the
   price and what is planned so everyone can see Premium exists, sells nothing,
   and obeys the Administrator's feature locks like every other section. */
const { test, expect } = require("@playwright/test");
const { bootAsGuest } = require("./helpers");

test.describe("the Premium page", () => {
  test("MORE → PREMIUM shows the price and the plan, with no way to pay", async ({ page }) => {
    await bootAsGuest(page);
    await page.click('#nav .nav-btn[data-tab="more"]');
    await page.click('#moreList .more-row[data-page="premium"]');
    expect(await page.evaluate(() => currentPage)).toBe("premium");
    const pg = page.locator("#page-premium");
    const text = await pg.innerText();
    expect(text).toContain("LEVEL UP PREMIUM");
    expect(text).toContain("37,500 so'm / month");
    expect(text).toContain("COMING SOON");
    expect(text).toContain("Mentor AI with 20 questions a day instead of 3");
    expect(text).toContain("ALWAYS FREE");
    expect(text).toContain("there is no payment in the app");
    /* nothing to type card details into, and no buy button */
    expect(await pg.locator("input, select, textarea, form").count()).toBe(0);
    expect(text).not.toMatch(/\bBUY\b|\bPAY NOW\b|\bSUBSCRIBE\b/i);
    expect(await page.locator("#premiumModal").count()).toBe(0); /* the old window became this page */
  });

  test("SETTINGS still points to it", async ({ page }) => {
    await bootAsGuest(page);
    await page.evaluate(() => switchPage("admin"));
    await page.click("#premiumOpen");
    expect(await page.evaluate(() => currentPage)).toBe("premium");
  });

  test("I'M INTERESTED is remembered, once", async ({ page }) => {
    await bootAsGuest(page);
    await page.evaluate(() => switchPage("premium"));
    await page.click("#premiumInterest");
    await page.click("#premiumInterest");
    const s = await page.evaluate(() => ({ day: state.premiumInterest, today: todayStr() }));
    expect(s.day).toBe(s.today);
    await expect(page.locator("#premiumInterest")).toHaveText("✓ NOTED — THANK YOU");
    /* and it still says so after a reload */
    await page.reload({ waitUntil: "domcontentloaded" });
    await page.waitForFunction(() => typeof window.state === "object" && window.state !== null && typeof window.switchPage === "function");
    await page.evaluate(() => { document.getElementById("entranceOv").classList.remove("show"); switchPage("premium"); });
    await expect(page.locator("#premiumInterest")).toHaveText("✓ NOTED — THANK YOU");
  });

  test("the Administrator can remove it or seal it by level", async ({ page }) => {
    await bootAsGuest(page);
    const removed = await page.evaluate(() => {
      remoteSystemLocks = { premium: -1 };
      renderNav();
      switchPage("admin");
      openPremium();
      return {
        inMore: tabPages(TABS[4]).indexOf("premium") !== -1,
        panelHidden: document.getElementById("premiumPanel").style.display === "none",
        page: currentPage
      };
    });
    expect(removed).toEqual({ inMore: false, panelHidden: true, page: "admin" });
    const sealed = await page.evaluate(() => {
      remoteSystemLocks = { premium: 50 };
      renderNav(); renderAdmin();
      switchPage("premium");
      return {
        lock: document.querySelector('#moreList .more-row[data-page="premium"]').getAttribute("data-locklv"),
        panelHidden: document.getElementById("premiumPanel").style.display === "none",
        page: currentPage
      };
    });
    expect(sealed).toEqual({ lock: "50", panelHidden: true, page: "admin" });
    const open = await page.evaluate(() => {
      remoteSystemLocks = null;
      renderAdmin();
      return document.getElementById("premiumPanel").style.display;
    });
    expect(open).toBe("");
    /* it appears in the Administrator's lock list as a section */
    expect(await page.evaluate(() => featureConf("premium") && featureConf("premium").type)).toBe("section");
  });

  test("speaks Russian", async ({ page }) => {
    await bootAsGuest(page);
    await page.evaluate(() => { state.lang = "ru"; save(); });
    await page.reload({ waitUntil: "domcontentloaded" });
    await page.waitForFunction(() => typeof window.state === "object" && window.state !== null && typeof window.switchPage === "function");
    await page.evaluate(() => {
      document.getElementById("entranceOv").classList.remove("show");
      switchPage("admin");
    });
    await expect(page.locator("#premiumOpen")).toHaveText("⭐ ЧТО БУДЕТ В PREMIUM");
    await expect(page.locator("#privacyDelete")).toHaveText("🗑 УДАЛИТЬ МОИ ДАННЫЕ");
    await expect(page.locator("#breakMinsSel option[value='30']")).toHaveText("Через 30 минут");
    await page.click("#premiumOpen");
    await expect(page.locator("#page-premium")).toContainText("ВСЕГДА БЕСПЛАТНО");
    await expect(page.locator("#page-premium")).toContainText("ИИ-наставник: 20 вопросов в день вместо 3");
  });
});
