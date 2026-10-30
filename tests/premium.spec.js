/* The PREMIUM PREVIEW: it shows the price and what is planned, sells nothing,
   and obeys the Administrator's feature locks like every other feature. */
const { test, expect } = require("@playwright/test");
const { bootAsGuest } = require("./helpers");

test.describe("Premium preview", () => {
  test("shows the price and the plan, with no way to pay", async ({ page }) => {
    await bootAsGuest(page);
    await page.evaluate(() => switchPage("admin"));
    await page.click("#premiumOpen");
    const modal = page.locator("#premiumModal");
    await expect(modal).toHaveClass(/show/);
    const text = await modal.innerText();
    expect(text).toContain("37,500 so'm / month");
    expect(text).toContain("COMING SOON");
    expect(text).toContain("there is no payment in the app");
    /* nothing to type card details into, and no buy button */
    expect(await modal.locator("input, select, textarea, form").count()).toBe(0);
    expect(text).not.toMatch(/\bBUY\b|\bPAY NOW\b|\bSUBSCRIBE\b/i);
  });

  test("I'M INTERESTED is remembered, once", async ({ page }) => {
    await bootAsGuest(page);
    await page.evaluate(() => switchPage("admin"));
    await page.click("#premiumOpen");
    await page.click("#premiumInterest");
    await page.click("#premiumInterest");
    const s = await page.evaluate(() => ({ day: state.premiumInterest, today: todayStr() }));
    expect(s.day).toBe(s.today);
    await expect(page.locator("#premiumInterest")).toHaveText("✓ NOTED — THANK YOU");
    await page.click("#premiumClose");
    await expect(page.locator("#premiumModal")).not.toHaveClass(/show/);
  });

  test("the Administrator can remove it or seal it by level", async ({ page }) => {
    await bootAsGuest(page);
    const removed = await page.evaluate(() => {
      remoteSystemLocks = { premium: -1 };
      switchPage("admin");
      openPremium();
      return {
        hidden: document.getElementById("premiumPanel").style.display === "none",
        opened: document.getElementById("premiumModal").classList.contains("show")
      };
    });
    expect(removed).toEqual({ hidden: true, opened: false });
    const sealed = await page.evaluate(() => {
      remoteSystemLocks = { premium: 50 };
      renderAdmin();
      return document.getElementById("premiumPanel").style.display === "none";
    });
    expect(sealed).toBe(true);
    const open = await page.evaluate(() => {
      remoteSystemLocks = null;
      renderAdmin();
      return document.getElementById("premiumPanel").style.display;
    });
    expect(open).toBe("");
    /* it appears in the Administrator's lock list like every feature */
    expect(await page.evaluate(() => featureConf("premium") && featureConf("premium").type)).toBe("function");
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
  });
});
