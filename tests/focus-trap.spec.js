/* Focus stays inside an open dialog. A keyboard or screen-reader hunter used
   to tab straight out of a window into the page behind it, and lose their
   place when it closed. */
const { test, expect } = require("@playwright/test");
const { bootAsGuest } = require("./helpers");

/* id of the dialog that holds focus, or "PAGE" if it escaped */
function where(page) {
  return page.evaluate(() => {
    const d = document.activeElement && document.activeElement.closest('[aria-modal="true"]');
    return d ? d.id : "PAGE";
  });
}

test.describe("focus trap", () => {
  test("Tab and Shift+Tab never leave an open dialog", async ({ page }) => {
    await bootAsGuest(page);
    await page.evaluate(() => openQuestModal(null));
    await page.waitForSelector("#questModal.show");
    expect(await where(page)).toBe("questModal");
    for (let i = 0; i < 80; i++) {
      await page.keyboard.press("Tab");
      expect(await where(page)).toBe("questModal");
    }
    for (let i = 0; i < 20; i++) {
      await page.keyboard.press("Shift+Tab");
      expect(await where(page)).toBe("questModal");
    }
  });

  test("focus pushed behind the dialog is pulled back in", async ({ page }) => {
    await bootAsGuest(page);
    await page.evaluate(() => openQuestModal(null));
    await page.waitForSelector("#questModal.show");
    await page.evaluate(() => {
      const behind = Array.from(document.querySelectorAll("button"))
        .find((b) => !b.closest('[aria-modal="true"]') && b.getClientRects().length);
      behind.focus();
    });
    expect(await where(page)).toBe("questModal");
  });

  test("opening does not grab an input, so a phone keyboard stays down", async ({ page }) => {
    await bootAsGuest(page);
    await page.evaluate(() => openQuestModal(null));
    await page.waitForSelector("#questModal.show");
    const tag = await page.evaluate(() => document.activeElement.id);
    expect(tag).toBe("questModal");
  });

  test("closing returns focus to what opened it", async ({ page }) => {
    await bootAsGuest(page);
    await page.evaluate(() => {
      const b = document.createElement("button");
      b.id = "trapOpener"; b.textContent = "open";
      b.onclick = () => openQuestModal(null);
      document.querySelector(".page.active, main, body").appendChild(b);
    });
    await page.focus("#trapOpener");
    await page.keyboard.press("Enter");
    await page.waitForSelector("#questModal.show");
    await page.click("#qmCancel");
    await expect(page.locator("#questModal")).not.toHaveClass(/show/);
    await expect.poll(() => page.evaluate(() => document.activeElement.id)).toBe("trapOpener");
  });

  test("a panel opened inside the focus window traps on its own, then hands back", async ({ page }) => {
    await bootAsGuest(page);
    await page.evaluate(() => {
      state.quests = [makeQuest("🏃", "Morning run", "d", "daily", [], "easy", "END", "", false, 1)];
      save();
      startTimer(state.quests[0].id);
    });
    await page.waitForSelector("#focusOv.show");
    await page.focus("#foCfgBtn");
    await page.keyboard.press("Enter");
    await page.waitForSelector("#foCfg.show");
    for (let i = 0; i < 40; i++) {
      await page.keyboard.press("Tab");
      expect(await where(page)).toBe("foCfg");
    }
    await page.click("#foCfgClose");
    await expect.poll(() => page.evaluate(() => document.activeElement.id)).toBe("foCfgBtn");
    for (let i = 0; i < 15; i++) {
      await page.keyboard.press("Tab");
      expect(await where(page)).toBe("focusOv");
    }
  });
});
