/* SAFETY WALLS 2.0 (README 4x, Mission 1.1): the phrase corpus.
   tests/fixtures/safety-corpus.json holds real-sounding crisis, eating-distress and
   diet messages in English, Russian and Uzbek (Latin and Cyrillic, slang, typos,
   no apostrophes), normal questions that must never trigger, and agent commands.
   The rules, for each group and language:
   - at least 95% are caught by the group's wall or a stronger one (crisis must be
     crisis; eating may be crisis or eating; diet may be any of the three);
   - not one normal question triggers anything, as a wall or as a Mentor answer;
   - an unsafe agent command never becomes a card, and a safe one becomes exactly one.
   The Worker reads the same corpus the same way (ai-proxy.spec.js). */
const fs = require("fs");
const path = require("path");
const { test, expect } = require("@playwright/test");
const { bootAsGuest } = require("./helpers");

const CORPUS = JSON.parse(fs.readFileSync(path.join(__dirname, "fixtures", "safety-corpus.json"), "utf8"));
const GROUPS = ["crisis", "eating", "diet"];
const LANGS = ["en", "ru", "uz", "uzCyr"];
/* a phrase may be caught by a stronger wall, never by a weaker one */
const ALLOWED = { crisis: ["crisis"], eating: ["crisis", "eating"], diet: ["crisis", "eating", "diet"] };

test.describe("the safety walls and the phrase corpus", () => {
  test.beforeEach(async ({ page }) => { await page.clock.setSystemTime(new Date("2026-06-17T12:00:00")); });

  test("every group and language is caught at 95% or more, by its own wall or a stronger one", async ({ page }) => {
    await bootAsGuest(page);
    const kinds = await page.evaluate((c) => {
      const out = {};
      ["crisis", "eating", "diet"].forEach((g) => { out[g] = {}; Object.keys(c[g]).forEach((l) => { out[g][l] = c[g][l].map((p) => mSafetyKind(p)); }); });
      return out;
    }, CORPUS);
    const rates = [], missed = [];
    for (const g of GROUPS) {
      for (const l of LANGS) {
        const list = CORPUS[g][l];
        expect(list.length, g + "." + l + " has phrases").toBeGreaterThan(0);
        const ok = kinds[g][l].filter((k) => ALLOWED[g].includes(k)).length;
        const rate = ok / list.length;
        rates.push(g + "." + l + " " + ok + "/" + list.length + " (" + Math.round(rate * 1000) / 10 + "%)");
        kinds[g][l].forEach((k, i) => { if (!ALLOWED[g].includes(k)) missed.push(g + "." + l + ": " + list[i] + " -> " + (k || "nothing")); });
        expect(rate, g + "." + l + " catch rate; missed: " + missed.join(" | ")).toBeGreaterThanOrEqual(0.95);
      }
    }
    /* the rates are printed with the test, so a drop is seen before it fails */
    test.info().annotations.push({ type: "catch rates", description: rates.join(", ") });
    if (missed.length) test.info().annotations.push({ type: "missed", description: missed.join(" | ") });
    console.log("safety walls, catch rates: " + rates.join(", "));
  });

  test("not one normal question triggers a wall or a safety answer", async ({ page }) => {
    await bootAsGuest(page);
    const hits = await page.evaluate((normal) => {
      const out = [];
      Object.keys(normal).forEach((l) => normal[l].forEach((p) => {
        /* the wall itself, and what the hero would really see (food restriction included) */
        const k = mSafetyKind(p), a = mentorAnswer(p).kind;
        if (k || a === "crisis" || a === "eating" || a === "diet") out.push(l + ": " + p + " -> " + (k || a));
      }));
      return out;
    }, CORPUS.normal);
    const total = Object.keys(CORPUS.normal).reduce((n, l) => n + CORPUS.normal[l].length, 0);
    test.info().annotations.push({ type: "false alarms", description: hits.length + " of " + total + " normal questions" });
    console.log("safety walls, false alarms: " + hits.length + " of " + total);
    expect(hits).toEqual([]);
  });

  test("an unsafe agent command never becomes a card, and a safe one becomes exactly one", async ({ page }) => {
    await bootAsGuest(page);
    const r = await page.evaluate((c) => ({
      /* refused by a wall (answered with care or as diet), or by the agent's caps */
      unsafe: c.agentUnsafe.filter((p) => !(mSafetyKind(p) || agentParse(p).length === 0)),
      safe: c.agentSafe.filter((p) => !(!mSafetyKind(p) && agentParse(p).length === 1))
    }), CORPUS);
    expect(r.unsafe).toEqual([]);
    expect(r.safe).toEqual([]);
    /* typed in the Mentor box: no card for an unsafe command, one card for a safe one */
    await page.evaluate(() => switchPage("mentor"));
    for (const [q, n] of [["todo: kms", 0], ["quest: drink only water until friday", 0], ["add quest: fast for 3 days", 0], ["todo: buy vegetables", 1]]) {
      await page.fill("#mentorQ", q);
      await page.click("#mentorAsk");
      await expect(page.locator("#mentorAnswer .m-you")).toContainText(q);
      await expect(page.locator("#mentorAnswer .ag-card")).toHaveCount(n);
    }
    await expect(page.locator("#mentorAnswer .ag-card")).toHaveCount(1);
  });

  test("Uzbek typed in Cyrillic without ў қ ғ ҳ is read through a Latin copy, by the Uzbek patterns only", async ({ page }) => {
    await bootAsGuest(page);
    const r = await page.evaluate(() => ({
      kinds: ["узимни улдирмокчиман", "дадам мени уради", "овкат емаяпман", "кунига 500 калория ейман", "хаётдан тойдим"].map((p) => mSafetyKind(p)),
      /* Russian is never read by the English patterns: "кмс" is a sports rank, not "kms" */
      ru: ["я кмс по боксу, как тренироваться", "меня бьет дрожь перед экзаменом", "у меня есть только час, что сделать"].map((p) => mSafetyKind(p)),
      copy: [mSafeCopy("хаётдан тойдим", mSafeNorm("хаётдан тойдим")), mSafeCopy("read more", mSafeNorm("read more"))],
      /* "Xdan oʻzib ketmoq" (overtake) is not ozmoq (lose weight); "oʻzingiz" is not ozgʻin (thin) */
      uz: ["sinfdoshlarimdan oʻzib ketmoqchiman", "jamoadoshlarimdan o'zmoqchiman", "oʻzingizni qanday his qilyapsiz", "ozgina dam olsam boʻladimi", "ketolmayman uydan", "omad tilayman"].map((p) => mSafetyKind(p))
    }));
    expect(r.kinds).toEqual(["crisis", "crisis", "eating", "eating", "crisis"]);
    expect(r.ru).toEqual(["", "", ""]);
    expect(r.copy).toEqual(["xayotdan toydim", ""]);
    expect(r.uz).toEqual(["", "", "", "", "", ""]);
  });

  test("very low calories are eating distress; a normal number is a diet question", async ({ page }) => {
    await bootAsGuest(page);
    const r = await page.evaluate(() => [
      "eating 500 cals a day", "under 800 calories", "ем 600 ккал в день", "kuniga 400 kaloriya",
      "is 1500 calories a day enough", "1,500 calories a day", "2500 kcal a day for bulking", "how many kcal in a banana"
    ].map((p) => mSafetyKind(p)));
    expect(r).toEqual(["eating", "eating", "eating", "eating", "diet", "diet", "diet", "diet"]);
  });
});
