/* SOLID THEMES (README 4u, 4v).
   LEVEL UP opens in the classic Shadow look (Sky was the default for a few
   days, then the team chose Shadow again). Seven solid themes sit beside it.
   Every solid theme must stay readable (WCAG 4.5:1 for text and buttons), and
   nobody may lose a theme they chose. */
const { test, expect } = require("@playwright/test");
const { bootAsGuest } = require("./helpers");

const ready = (page) => page.waitForFunction(() => typeof window.state === "object" && window.state !== null && typeof window.switchPage === "function");

test.describe("solid themes", () => {
  test("a new hero opens in the classic Shadow look, with sturdy type and no glow", async ({ page }) => {
    await bootAsGuest(page);
    const r = await page.evaluate(() => {
      const cs = getComputedStyle(document.body);
      return {
        theme: state.theme,
        attr: document.body.getAttribute("data-theme"),
        tok: document.body.classList.contains("tok"),
        font: cs.fontFamily,
        weight: cs.fontWeight,
        titleGlow: getComputedStyle(document.querySelector(".panel-title")).textShadow
      };
    });
    expect(r.theme).toBe("shadow");
    expect(r.attr).toBe(null);
    expect(r.tok).toBe(false);
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
      state.level = 20; state.theme = "sky"; save(); applyTheme("sky"); renderNav();
      const found = [];
      ["home", "quests", "profile", "mentor", "premium", "story", "admin"].forEach((p) => {
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
    expect(ids).toEqual(["shadow", "sky", "paper", "mint", "lilac", "sunrise", "blossom", "night", "rose", "emerald", "ember"]);
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

  test("every existing save enters in Shadow once and keeps its data; after that the hero's choice is kept", async ({ page }) => {
    await bootAsGuest(page);
    for (const before of ["sky", "ember", "night", "shadow"]) {
      await page.evaluate((th) => {
        const old = JSON.parse(JSON.stringify(state));
        delete old.themeV3; delete old.themeV4; /* a save from before the switch back */
        old.theme = th;
        old.hunterName = "Old Save";
        old.saveCount = (state.saveCount || 0) + 500; /* newer than the vault copy */
        localStorage.setItem("leveluphunter_v1", JSON.stringify(old));
      }, before);
      await page.reload({ waitUntil: "domcontentloaded" });
      await ready(page);
      expect(await page.evaluate(() => ({ t: state.theme, n: state.hunterName, f: state.themeV4 })))
        .toEqual({ t: "shadow", n: "Old Save", f: true });
    }
    /* once moved, a theme the hero picks sticks */
    await page.evaluate(() => { state.theme = "night"; save(); });
    await page.reload({ waitUntil: "domcontentloaded" });
    await ready(page);
    expect(await page.evaluate(() => state.theme)).toBe("night");
  });

  test("calm Shadow keeps its own purple background", async ({ page }) => {
    await bootAsGuest(page);
    const bg = await page.evaluate(() => ({ calm: document.body.classList.contains("calm"), img: getComputedStyle(document.body).backgroundImage }));
    expect(bg.calm).toBe(true);
    expect(bg.img).toContain("radial-gradient");
  });

  test("an unknown theme falls back to Shadow", async ({ page }) => {
    await bootAsGuest(page);
    expect(await page.evaluate(() => { applyTheme("no-such-theme"); return document.body.getAttribute("data-theme"); })).toBe(null);
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
