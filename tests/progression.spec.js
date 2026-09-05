/* The rules that decide whether the game is worth playing: rank cannot be
   bought, points are scarce, and a lesson has to produce real action. */
const { test, expect } = require("@playwright/test");
const { bootAsGuest, drainAnnouncements } = require("./helpers");

test.describe("rank", () => {
  test("attributes alone do NOT promote you", async ({ page }) => {
    await bootAsGuest(page);
    const result = await page.evaluate(() => {
      state.stats = { INT: 29, STR: 29, CON: 29, END: 29 }; /* 116 -> B */
      state.statPoints = 35;
      state.rank = "";
      state.lastRankKey = "";
      const startRank = currentRank().key;
      for (let i = 0; i < 35; i++) { state.stats.INT++; state.statPoints--; }
      checkStatRankUp();
      return {
        startRank: startRank,
        total: totalStats(),
        eligible: eligibleRank().key,
        held: currentRank().key
      };
    });
    expect(result.startRank).toBe("B");
    expect(result.total).toBeGreaterThanOrEqual(150);
    expect(result.eligible).toBe("A");
    expect(result.held).toBe("B"); /* eligible, not promoted */
  });

  test("requesting an unearned evaluation is refused", async ({ page }) => {
    await bootAsGuest(page);
    const held = await page.evaluate(() => {
      state.stats = { INT: 40, STR: 40, CON: 40, END: 40 };
      state.rank = "B";
      requestEvaluation();
      return currentRank().key;
    });
    expect(held).toBe("B");
  });

  test("a genuinely earned evaluation promotes", async ({ page }) => {
    await bootAsGuest(page);
    const result = await page.evaluate(() => {
      const t = todayStr();
      state.stats = { INT: 40, STR: 40, CON: 40, END: 40 };
      state.rank = "B";
      for (let i = 0; i < 40; i++) {
        state.history[addDays(t, -i)] = { xp: 120, count: 9 };
        state.timeHistory[addDays(t, -i)] = 3600;
      }
      state.journal = {};
      for (let i = 0; i < 35; i++) state.journal[addDays(t, -i)] = { interesting: "x" };
      learnFix();
      state.learn.done = {};
      for (let i = 0; i < 20; i++) state.learn.done["discipline:" + i] = t;
      state.reports = {
        a: { late: false, text: "x", kind: "w" },
        b: { late: false, text: "y", kind: "w" },
        c: { late: false, text: "z", kind: "m" }
      };
      state.honors = [{ id: 1 }, { id: 2 }, { id: 3 }];
      state.xpDebt = 0;
      state.penaltyTask = null;
      const before = currentRank().key;
      requestEvaluation();
      return { before: before, after: currentRank().key };
    });
    expect(result.before).toBe("B");
    expect(result.after).toBe("A");
  });

  test("XP debt alone blocks the clean-record condition", async ({ page }) => {
    await bootAsGuest(page);
    const blocked = await page.evaluate(() => {
      state.rank = "C";
      state.xpDebt = 50;
      const checks = trialChecks(nextRankTarget());
      return checks[checks.length - 1].ok === false;
    });
    expect(blocked).toBe(true);
  });

  test("a rank once earned is never taken back", async ({ page }) => {
    await bootAsGuest(page);
    const kept = await page.evaluate(() => {
      state.rank = "A";
      state.stats = { INT: 5, STR: 5, CON: 5, END: 5 };
      return currentRank().key;
    });
    expect(kept).toBe("A");
  });

  test("stat points stay scarce: one free point every third level", async ({ page }) => {
    await bootAsGuest(page);
    const result = await page.evaluate(() => {
      state.level = 1; state.xp = 0; state.statPoints = 0; state.xpDebt = 0;
      state.levelRewards = []; /* isolate the free-point rule from the story road */
      for (let i = 0; i < 6; i++) gainXP(20000);
      return { level: state.level, points: state.statPoints };
    });
    await drainAnnouncements(page);
    const expected = Math.floor(result.level / 3);
    expect(Math.abs(result.points - expected)).toBeLessThanOrEqual(1);
  });

  test("the default story road pays 1 stat point, not 2", async ({ page }) => {
    await bootAsGuest(page);
    const allOne = await page.evaluate(() => {
      const road = defaultRoad();
      const sp = road.filter((r) => r.kind === "sp");
      return sp.length > 0 && sp.every((r) => +r.value === 1);
    });
    expect(allOne).toBe(true);
  });

  test("the road migration halves the default but preserves a customised value", async ({ page }) => {
    await bootAsGuest(page);
    const result = await page.evaluate(() => {
      state.levelRewards = [
        { id: "a", level: 9, kind: "sp", value: "2" },   /* untouched default */
        { id: "b", level: 11, kind: "sp", value: "7" }   /* the owner chose this */
      ];
      state.roadSpV3 = false;
      migrateState();
      return { def: state.levelRewards[0].value, custom: state.levelRewards[1].value };
    });
    expect(result.def).toBe("1");
    expect(result.custom).toBe("7");
  });
});

test.describe("learn and grow", () => {
  test("a level stays sealed until the one before it is cleared", async ({ page }) => {
    await bootAsGuest(page);
    await page.evaluate(() => { state.learn.cat = "discipline"; switchPage("learn"); });
    await page.waitForTimeout(400);
    const rows = await page.evaluate(() => {
      const r = document.querySelectorAll("#lrnLadder .lvl-row");
      return { first: r[0].className, second: r[1].className, total: r.length };
    });
    expect(rows.total).toBe(10);
    expect(rows.first).toContain("open");
    expect(rows.second).toContain("locked");
  });

  test("accepting a task creates a real quest that costs no quest slot", async ({ page }) => {
    await bootAsGuest(page);
    const result = await page.evaluate(() => {
      learnFix();
      state.learn.done["discipline:0"] = todayStr();
      acceptLearnTask("discipline", 1);
      const q = questById(state.learn.quests["discipline:1"]);
      let slotsUsed = 0;
      state.quests.forEach((x) => { if (x.freq !== "longterm" && !x.system) slotsUsed++; });
      return {
        created: !!q,
        system: q && q.system,
        freq: q && q.freq,
        target: q && q.target,
        slotsUsed: slotsUsed
      };
    });
    await drainAnnouncements(page);
    expect(result.created).toBe(true);
    expect(result.system).toBe(true);
    expect(result.freq).toBe("daily");
    expect(result.target).toBe(3);      /* The Three-Day Vow */
    expect(result.slotsUsed).toBe(0);   /* System-assigned, so no slot spent */
  });

  test("a single-sitting task becomes a one-time goal instead", async ({ page }) => {
    await bootAsGuest(page);
    const freq = await page.evaluate(() => {
      learnFix();
      state.learn.done["education:0"] = todayStr();
      acceptLearnTask("education", 1);
      const q = questById(state.learn.quests["education:1"]);
      return q && q.freq;
    });
    await drainAnnouncements(page);
    expect(freq).toBe("longterm");
  });
});
