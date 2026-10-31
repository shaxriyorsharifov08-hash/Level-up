/* ORIGINAL NAMES + OʻZBEKCHA (README 4s).
   The anime-derived names were retired. An old save must keep every record and
   only the strings the app itself wrote are renamed, once. The app also speaks
   Uzbek, and anything not translated still falls back to English. */
const fs = require("fs");
const path = require("path");
const { test, expect } = require("@playwright/test");
const { bootAsGuest } = require("./helpers");

/* Words that pointed at a specific anime. Only identifiers (storage keys, CSS
   classes, database paths) may still say "hunter": renaming those would orphan
   every existing save. */
const RETIRED = /monarch|awaken|arisen|\barise\b|solo level|jin-?woo|shadow army|association|penalty zone|national level|nat'l|hunter|охотни|монарх|пробужд|ассоциац/i;
const IDENTIFIERS = /leveluphunter_[\w*]*|level-up-hunter-\d+|"hunters\/?"|hunters\/|hunterName|hunterSub|hunter-name|hunter-sub|\.hunter\b/g;

async function reloadIn(page, lang) {
  await page.evaluate((l) => { state.lang = l; save(); }, lang);
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => typeof window.state === "object" && window.state !== null && typeof window.switchPage === "function");
  await page.evaluate(() => document.getElementById("entranceOv").classList.remove("show"));
}

test.describe("the rename keeps old saves whole", () => {
  test("an old save gets the new names, keeps its own, and loses nothing", async ({ page }) => {
    await bootAsGuest(page);
    await page.evaluate(() => {
      const old = JSON.parse(JSON.stringify(state));
      delete old.namesV2;
      old.hunterName = "Hunter";
      old.titles = ["The Awakened", "Arisen", "Shadow Monarch", "The Beginner", "My Own Title"];
      old.totalXp = 4321;
      /* the starter quest, as an old save named it */
      const ritual = old.quests.filter((q) => q.system && q.name === "First Step Ritual");
      if (ritual.length !== 1) throw new Error("expected one starter quest, found " + ritual.length);
      ritual[0].name = "Awakening Ritual";
      const mine = makeQuest("📚", "Awakening Ritual", "", "daily", [], "easy", "INT", "", false, 1);
      old.quests.push(mine);
      old.penaltyTask = { icon: "⛓", name: "Penalty Zone: 100 Squats", desc: "d", day: "2026-01-01" };
      old.saveCount = (state.saveCount || 0) + 500; /* newer than the vault copy */
      localStorage.setItem("leveluphunter_v1", JSON.stringify(old));
    });
    await page.reload({ waitUntil: "domcontentloaded" });
    await page.waitForFunction(() => typeof window.state === "object" && window.state !== null && typeof window.switchPage === "function");
    const s = await page.evaluate(() => ({
      name: state.hunterName,
      titles: state.titles,
      xp: state.totalXp,
      system: state.quests.filter((q) => q.system && q.name === "First Step Ritual").length,
      mine: state.quests.filter((q) => !q.system && q.name === "Awakening Ritual").length,
      penalty: state.penaltyTask && state.penaltyTask.name,
      flag: state.namesV2
    }));
    expect(s).toEqual({
      name: "Hero",
      titles: ["The Beginner", "Rising Star", "Master of Discipline", "My Own Title"],
      xp: 4321,
      system: 1,
      mine: 1, /* the hero's own quest is never touched */
      penalty: "Penalty Round: 100 Squats",
      flag: true
    });
  });

  test("the migration runs once: a later 'Hunter' the hero typed is kept, and titles are not awarded twice", async ({ page }) => {
    await bootAsGuest(page);
    const s = await page.evaluate(() => {
      state.hunterName = "Hunter"; /* chosen by the hero after the rename */
      state.titles = ["The Beginner"];
      migrateState();
      checkAchievements();
      return { name: state.hunterName, beginner: state.titles.filter((t) => t === "The Beginner").length };
    });
    expect(s).toEqual({ name: "Hunter", beginner: 1 });
  });

  test("a new save starts with the new names and the lighter daily package", async ({ page }) => {
    await bootAsGuest(page);
    const s = await page.evaluate(() => {
      const d = defaultState();
      return { name: d.hunterName, flagInDefaults: "namesV2" in d };
    });
    /* namesV2 must not be a default, or old saves would skip the migration */
    expect(s).toEqual({ name: "Hero", flagInDefaults: false });
    await expect(page.locator("#hunterSub")).toHaveText("E-RANK HERO");
  });
});

test.describe("no anime-derived names remain", () => {
  test("the source has none outside identifiers and the migration that renames them", async () => {
    let src = fs.readFileSync(path.resolve(__dirname, "..", "index.html"), "utf8");
    const a = src.indexOf("if(!state.namesV2){");
    const b = src.indexOf("state.namesV2 = true;", a);
    expect(a).toBeGreaterThan(0);
    expect(b).toBeGreaterThan(a);
    /* blank the migration but keep its line breaks, so reported line numbers stay true */
    src = src.slice(0, a) + src.slice(a, b).replace(/[^\n]/g, "") + src.slice(b);
    src = src.replace(IDENTIFIERS, "");
    const hits = src.split("\n").map((l, i) => [i + 1, l]).filter(([, l]) => RETIRED.test(l));
    expect(hits.map(([n, l]) => n + ": " + l.trim().slice(0, 120))).toEqual([]);
  });

  for (const lang of ["en", "ru", "uz"]) {
    test("every page reads clean in " + lang, async ({ page }) => {
      await bootAsGuest(page);
      await reloadIn(page, lang);
      const pages = ["home", "profile", "quests", "rewards", "inventory", "stats", "story", "honor", "guild", "budget", "guide", "admin", "learn"];
      for (const p of pages) {
        const text = await page.evaluate((id) => { switchPage(id); return document.body.innerText; }, p);
        const m = text.match(RETIRED);
        expect(m ? p + ": " + m[0] : null).toBeNull();
      }
    });
  }
});

test.describe("oʻzbekcha", () => {
  test("Settings offers Uzbek and switching to it is remembered", async ({ page }) => {
    await bootAsGuest(page);
    await page.evaluate(() => switchPage("admin"));
    await expect(page.locator("#admLang option[value='uz']")).toHaveText("Oʻzbekcha");
    await Promise.all([page.waitForEvent("load"), page.selectOption("#admLang", "uz")]);
    await page.waitForFunction(() => typeof window.state === "object" && window.state !== null);
    expect(await page.evaluate(() => state.lang)).toBe("uz");
    expect(await page.evaluate(() => document.documentElement.getAttribute("lang"))).toBe("uz");
  });

  test("the app speaks Uzbek, and untranslated text falls back to English", async ({ page }) => {
    const errors = await bootAsGuest(page);
    await reloadIn(page, "uz");
    await page.evaluate(() => switchPage("admin"));
    await expect(page.locator("#premiumOpen")).toHaveText("⭐ PREMIUMDA NIMA BOʻLADI");
    await expect(page.locator("#privacyDelete")).toHaveText("🗑 MAʼLUMOTLARIMNI OʻCHIRISH");
    await expect(page.locator("#breakMinsSel option[value='30']")).toHaveText("30 daqiqadan keyin");
    const t = await page.evaluate(() => ({ known: tr("QUESTS"), unknown: tr("A sentence no dictionary has") }));
    expect(t).toEqual({ known: "KVESTLAR", unknown: "A sentence no dictionary has" });
    expect(errors).toEqual([]);
  });

  test("every Russian string has an Uzbek one, in the same Latin orthography", async ({ page }) => {
    await bootAsGuest(page);
    const r = await page.evaluate(() => {
      const ru = Object.keys(I18N_RU), uz = Object.keys(I18N_UZ);
      const missing = ru.filter((k) => !Object.prototype.hasOwnProperty.call(I18N_UZ, k));
      /* oʻ and gʻ use the modifier letter ʻ (U+02BB), never a typed apostrophe */
      const badOkina = uz.filter((k) => /[OoGg]['‘’`]/.test(I18N_UZ[k]));
      const cyrillic = uz.filter((k) => /[Ѐ-ӿ]/.test(I18N_UZ[k]));
      return { ru: ru.length, uz: uz.length, missing, badOkina, cyrillic };
    });
    expect(r.missing).toEqual([]);
    expect(r.uz).toBe(r.ru);
    expect(r.badOkina).toEqual([]);
    expect(r.cyrillic).toEqual([]);
  });

  test("DELETE MY DATA accepts OʻCHIRISH however the oʻ is typed", async ({ page }) => {
    await bootAsGuest(page);
    await reloadIn(page, "uz");
    await page.evaluate(() => { state.hunterName = "Wipe Probe"; save(); switchPage("admin"); });
    page.once("dialog", (d) => {
      expect(d.message()).toContain("DELETE yoki OʻCHIRISH");
      d.accept("o'chirish");
    });
    await Promise.all([page.waitForEvent("load"), page.click("#privacyDelete")]);
    await page.waitForFunction(() => typeof window.state === "object" && window.state !== null);
    await page.waitForTimeout(1200); /* vault recovery runs on load */
    expect(await page.evaluate(() => state.hunterName)).not.toBe("Wipe Probe");
  });
});
