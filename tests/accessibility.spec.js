/* An app someone uses every day should not be unusable by someone who cannot
   see it. These assert the two things that actually lock a screen-reader user
   out: controls with no name, and a UI that speaks only in silent toasts. */
const { test, expect } = require("@playwright/test");
const { bootAsGuest } = require("./helpers");

/* every visible form control must expose an accessible name */
const NAMELESS = () => {
  const bad = [];
  document.querySelectorAll("input,textarea,select").forEach((el) => {
    if (el.type === "hidden") return;
    if (el.getAttribute("aria-label") || el.getAttribute("aria-labelledby")) return;
    if (el.id && document.querySelector('label[for="' + el.id + '"]')) return;
    if (el.closest("label")) return;
    bad.push((el.id || el.className || el.tagName) + "/" + (el.type || ""));
  });
  return bad;
};

test.describe("accessibility", () => {
  test("no form control is left without a name", async ({ page }) => {
    await bootAsGuest(page);
    await page.waitForTimeout(500); /* the repair pass is debounced */
    const bad = await page.evaluate(NAMELESS);
    expect(bad).toEqual([]);
  });

  test("controls inside panels rendered later are named too", async ({ page }) => {
    await bootAsGuest(page);
    await page.evaluate(() => { state.level = 40; switchPage("stats"); });
    await page.waitForTimeout(600);
    expect(await page.evaluate(NAMELESS)).toEqual([]);

    await page.evaluate(() => switchPage("budget"));
    await page.waitForTimeout(600);
    expect(await page.evaluate(NAMELESS)).toEqual([]);
  });

  test("a control added after load is repaired by the observer", async ({ page }) => {
    await bootAsGuest(page);
    const named = await page.evaluate(async () => {
      const box = document.createElement("div");
      box.innerHTML = '<label class="form-lbl">Brand new field</label><input class="inp" id="brandNew">';
      document.getElementById("page-home").appendChild(box);
      await new Promise((r) => setTimeout(r, 700));
      const el = document.getElementById("brandNew");
      return !!(el.getAttribute("aria-labelledby") || document.querySelector('label[for="brandNew"]'));
    });
    expect(named).toBe(true);
  });

  test("toasts and System announcements are announced, not just shown", async ({ page }) => {
    await bootAsGuest(page);
    const regions = await page.evaluate(() => ({
      toasts: document.getElementById("toasts").getAttribute("aria-live"),
      announce: document.getElementById("announceOv").getAttribute("aria-live"),
      announceRole: document.getElementById("announceOv").getAttribute("role"),
      liveCount: document.querySelectorAll("[aria-live]").length
    }));
    expect(regions.toasts).toBe("polite");
    expect(regions.announce).toBe("assertive");
    expect(regions.announceRole).toBe("alertdialog");
    expect(regions.liveCount).toBeGreaterThanOrEqual(2);
  });

  test("every dialog says it is a dialog", async ({ page }) => {
    await bootAsGuest(page);
    const missing = await page.evaluate(() => {
      const bad = [];
      document.querySelectorAll(".modal").forEach((m) => {
        if (m.getAttribute("role") !== "dialog") bad.push(m.id || "unnamed modal");
      });
      ["oathOv", "questView", "entranceOv"].forEach((id) => {
        const el = document.getElementById(id);
        if (el && !el.getAttribute("role")) bad.push(id);
      });
      return bad;
    });
    expect(missing).toEqual([]);
  });

  test("the walkable world is not a nameless canvas", async ({ page }) => {
    await bootAsGuest(page);
    const world = await page.evaluate(() => ({
      canvasLabel: document.getElementById("worldCv").getAttribute("aria-label"),
      stageRole: document.getElementById("worldStage").getAttribute("role")
    }));
    expect(world.canvasLabel).toBeTruthy();
    expect(world.stageRole).toBe("application");
  });

  test("icon-only buttons expose what they do", async ({ page }) => {
    await bootAsGuest(page);
    await page.evaluate(() => switchPage("quests"));
    await page.waitForTimeout(600);
    const unnamed = await page.evaluate(() => {
      const bad = [];
      document.querySelectorAll("button").forEach((b) => {
        if (b.offsetParent === null) return;              /* not visible */
        if ((b.textContent || "").trim()) return;
        if (b.getAttribute("aria-label")) return;
        bad.push(b.id || b.className);
      });
      return bad;
    });
    expect(unnamed).toEqual([]);
  });

  test("the document declares its language", async ({ page }) => {
    await bootAsGuest(page);
    expect(await page.evaluate(() => document.documentElement.getAttribute("lang"))).toBeTruthy();
  });
});
