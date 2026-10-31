/* SOLID THEMES (README 4u).
   The neon look strained eyes. LEVEL UP now opens in Sky (white & blue), with
   six more solid themes beside it. Every one of them must stay readable
   (WCAG 4.5:1 for text and buttons), and nobody may lose a theme they chose. */
const { test, expect } = require("@playwright/test");
const { bootAsGuest } = require("./helpers");

const ready = (page) => page.waitForFunction(() => typeof window.state === "object" && window.state !== null && typeof window.switchPage === "function");

test.describe("solid themes", () => {
  test("a new hero opens in Sky: light, solid, sturdy type", async ({ page }) => {
    await bootAsGuest(page);
    const r = await page.evaluate(() => {
      const cs = getComputedStyle(document.body);
      const bg = cs.backgroundColor.match(/\d+/g).map(Number);
      return {
        theme: state.theme,
        attr: document.body.getAttribute("data-theme"),
        tok: document.body.classList.contains("tok"),
        light: (bg[0] + bg[1] + bg[2]) / 3 > 200,
        font: cs.fontFamily,
        weight: cs.fontWeight,
        titleGlow: getComputedStyle(document.querySelector(".panel-title")).textShadow
      };
    });
    expect(r.theme).toBe("sky");
    expect(r.attr).toBe("sky");
    expect(r.tok).toBe(true);
    expect(r.light).toBe(true);
    expect(r.font).toContain("Nunito");
    expect(r.weight).toBe("600");
    expect(r.titleGlow).toBe("none");
  });

  test("every solid theme passes 4.5:1 for text, grey text and buttons", async ({ page }) => {
    await bootAsGuest(page);
    const fails = await page.evaluate(() => {
      const lum = (hex) => {
        const v = hex.replace("#", "").match(/../g).map((h) => parseInt(h, 16) / 255)
          .map((x) => (x <= 0.03928 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4)));
        return 0.2126 * v[0] + 0.7152 * v[1] + 0.0722 * v[2];
      };
      const ratio = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
      const out = [];
      THEMES.filter((t) => t.tok).forEach((t) => {
        applyTheme(t.id);
        const cs = getComputedStyle(document.body), v = (k) => cs.getPropertyValue(k).trim();
        [["--text", "--card"], ["--dim", "--card"], ["--onp", "--purple"], ["--purple", "--card"], ["--legendary", "--card"]].forEach(([fg, bg]) => {
          const r = ratio(v(fg), v(bg));
          if (r < 4.5) out.push(t.id + " " + fg + " on " + bg + " = " + r.toFixed(2));
        });
      });
      applyTheme(state.theme);
      return out;
    });
    expect(fails).toEqual([]);
  });

  test("a light theme leaves no dark card behind on the main pages", async ({ page }) => {
    await bootAsGuest(page);
    const dark = await page.evaluate(() => {
      state.level = 20; save(); renderNav();
      const found = [];
      ["home", "quests", "profile", "story", "admin"].forEach((p) => {
        switchPage(p);
        document.querySelectorAll("#page-" + p + " .panel, #page-" + p + " .quest-card, #page-" + p + " .pkg-item, nav, header").forEach((el) => {
          const m = getComputedStyle(el).backgroundColor.match(/[\d.]+/g);
          if (!m || el.getClientRects().length === 0) return;
          const [r, g, b, a] = m.map(Number);
          if ((a === undefined || a > 0.5) && (r + g + b) / 3 < 120) found.push(p + ": " + el.className);
        });
      });
      return found;
    });
    expect(dark).toEqual([]);
  });

  test("Settings lists every theme, and the choice is remembered", async ({ page }) => {
    await bootAsGuest(page);
    await page.evaluate(() => switchPage("admin"));
    const ids = await page.$$eval("#admTheme option", (els) => els.map((e) => e.value));
    expect(ids).toEqual(["sky", "paper", "mint", "lilac", "sunrise", "blossom", "night", "shadow", "rose", "emerald", "ember"]);
    await page.selectOption("#admTheme", "night");
    await page.reload({ waitUntil: "domcontentloaded" });
    await ready(page);
    expect(await page.evaluate(() => ({ t: state.theme, a: document.body.getAttribute("data-theme"), tok: document.body.classList.contains("tok") })))
      .toEqual({ t: "night", a: "night", tok: true });
    /* the classic look is still there for whoever wants it, without the solid layer */
    await page.evaluate(() => { state.theme = "shadow"; save(); applyTheme("shadow"); });
    expect(await page.evaluate(() => ({ a: document.body.getAttribute("data-theme"), tok: document.body.classList.contains("tok") })))
      .toEqual({ a: null, tok: false });
  });

  test("an old save on the neon default moves to Sky once and keeps its data; a chosen theme is kept", async ({ page }) => {
    await bootAsGuest(page);
    for (const [before, after] of [["shadow", "sky"], ["ember", "ember"], ["blossom", "blossom"]]) {
      await page.evaluate((th) => {
        const old = JSON.parse(JSON.stringify(state));
        delete old.themeV2;
        old.theme = th;
        old.hunterName = "Old Save";
        old.saveCount = (state.saveCount || 0) + 500; /* newer than the vault copy */
        localStorage.setItem("leveluphunter_v1", JSON.stringify(old));
      }, before);
      await page.reload({ waitUntil: "domcontentloaded" });
      await ready(page);
      expect(await page.evaluate(() => ({ t: state.theme, n: state.hunterName, f: state.themeV2 })))
        .toEqual({ t: after, n: "Old Save", f: true });
    }
    /* once moved, choosing Shadow again sticks */
    await page.evaluate(() => { state.theme = "shadow"; save(); });
    await page.reload({ waitUntil: "domcontentloaded" });
    await ready(page);
    expect(await page.evaluate(() => state.theme)).toBe("shadow");
  });

  test("an unknown theme falls back to Sky", async ({ page }) => {
    await bootAsGuest(page);
    expect(await page.evaluate(() => { applyTheme("no-such-theme"); return document.body.getAttribute("data-theme"); })).toBe("sky");
  });

  test("theme names speak Russian and Uzbek", async ({ page }) => {
    await bootAsGuest(page);
    for (const [lang, sky] of [["ru", "☁️ Небо (белый и синий)"], ["uz", "☁️ Osmon (oq va koʻk)"]]) {
      await page.evaluate((l) => { state.lang = l; save(); }, lang);
      await page.reload({ waitUntil: "domcontentloaded" });
      await ready(page);
      await page.evaluate(() => { document.getElementById("entranceOv").classList.remove("show"); switchPage("admin"); });
      await expect(page.locator('#admTheme option[value="sky"]')).toHaveText(sky);
    }
  });
});
