/* The save must not grow without limit, and pruning must never cost the hunter
   a number they earned or a word they wrote. */
const { test, expect } = require("@playwright/test");
const { bootAsGuest } = require("./helpers");

/* two years of daily use, plus quests with long completion histories */
const SEED = () => {
  const t = todayStr();
  state.history = {}; state.timeHistory = {}; state.streakHistory = {}; state.journal = {};
  state.archive = null;
  for (let i = 0; i < 730; i++) {
    const d = addDays(t, -i);
    state.history[d] = { xp: 100, count: 5 };
    state.timeHistory[d] = 3600;
    state.streakHistory[d] = { q1: i, q2: i, q3: i };
    state.journal[d] = { interesting: "x".repeat(120), mistake: "y".repeat(120), tomorrow: "z".repeat(120) };
  }
  state.quests = [];
  for (let k = 0; k < 5; k++) {
    const q = makeQuest("Q", "Quest " + k, "d", "daily", [], "easy", "END", "", false, 7);
    for (let i = 700; i > 0; i--) q.completions.push(addDays(t, -i)); /* oldest first, as the app records them */
    state.quests.push(q);
  }
  return JSON.stringify(state).length;
};

test.describe("pruning the save", () => {
  test("caps the structures that would otherwise grow without limit", async ({ page }) => {
    await bootAsGuest(page);
    const result = await page.evaluate((seed) => {
      eval("(" + seed + ")")();
      const size = (o) => JSON.stringify(o).length;
      const before = {
        history: Object.keys(state.history).length,
        streaks: Object.keys(state.streakHistory).length,
        completions: state.quests[0].completions.length,
        mechanicalKb: Math.round((size(state.history) + size(state.streakHistory) +
          size(state.timeHistory) + size(state.quests)) / 1024)
      };
      pruneState();
      const after = {
        history: Object.keys(state.history).length,
        streaks: Object.keys(state.streakHistory).length,
        completions: state.quests[0].completions.length,
        mechanicalKb: Math.round((size(state.history) + size(state.streakHistory) +
          size(state.timeHistory) + size(state.quests)) / 1024)
      };
      return { before: before, after: after };
    }, SEED.toString());
    /* 730 days of rows come down to the retention window */
    expect(result.after.history).toBeLessThanOrEqual(401);
    expect(result.after.streaks).toBeLessThanOrEqual(401);
    expect(result.after.completions).toBe(500);
    expect(result.before.history).toBe(730);
    /* the mechanical half of the save gets materially lighter (~38% here) */
    expect(result.after.mechanicalKb).toBeLessThan(result.before.mechanicalKb * 0.75);
  });

  test("the newest completions are the ones kept", async ({ page }) => {
    await bootAsGuest(page);
    const result = await page.evaluate((seed) => {
      eval("(" + seed + ")")();
      pruneState();
      const c = state.quests[0].completions;
      return {
        newest: c[c.length - 1],
        expectedNewest: addDays(todayStr(), -1),
        oldestIsRecentEnough: c[0] > addDays(todayStr(), -520),
        droppedTheOldest: c.indexOf(addDays(todayStr(), -700)) === -1
      };
    }, SEED.toString());
    expect(result.newest).toBe(result.expectedNewest);
    expect(result.oldestIsRecentEnough).toBe(true);
    expect(result.droppedTheOldest).toBe(true);
  });

  test("all-time totals survive exactly", async ({ page }) => {
    await bootAsGuest(page);
    const result = await page.evaluate((seed) => {
      eval("(" + seed + ")")();
      const clearedBefore = rkCleared();          /* 730 days x 5 = 3650 */
      const xpBefore = allTimeXp();
      const perQuestBefore = questTimesCleared(state.quests[0]);
      pruneState();
      return {
        clearedBefore: clearedBefore,
        clearedAfter: allTimeCleared(),
        xpBefore: xpBefore,
        xpAfter: allTimeXp(),
        perQuestBefore: perQuestBefore,
        perQuestAfter: questTimesCleared(state.quests[0])
      };
    }, SEED.toString());
    expect(result.clearedAfter).toBe(result.clearedBefore);
    expect(result.xpAfter).toBe(result.xpBefore);
    expect(result.perQuestAfter).toBe(result.perQuestBefore);
  });

  test("nothing the hunter wrote is ever pruned", async ({ page }) => {
    await bootAsGuest(page);
    const result = await page.evaluate((seed) => {
      eval("(" + seed + ")")();
      state.reports = { "w:2020-01-06": { text: "an old report", late: false, kind: "w" } };
      state.honors = [{ id: 1, name: "An old honor" }];
      const journalBefore = Object.keys(state.journal).length;
      pruneState();
      return {
        journalBefore: journalBefore,
        journalAfter: Object.keys(state.journal).length,
        oldestJournalKept: !!state.journal[addDays(todayStr(), -729)],
        reportKept: !!state.reports["w:2020-01-06"],
        honorKept: state.honors.length === 1,
        oathKept: !!state.oath.sworn
      };
    }, SEED.toString());
    expect(result.journalAfter).toBe(result.journalBefore);
    expect(result.oldestJournalKept).toBe(true);
    expect(result.reportKept).toBe(true);
    expect(result.honorKept).toBe(true);
    expect(result.oathKept).toBe(true);
  });

  test("recent detail is untouched — charts and grids still have their data", async ({ page }) => {
    await bootAsGuest(page);
    const result = await page.evaluate((seed) => {
      eval("(" + seed + ")")();
      pruneState();
      const t = todayStr();
      return {
        today: !!state.history[t],
        thirtyDaysAgo: !!state.history[addDays(t, -30)],
        sixMonthsAgo: !!state.history[addDays(t, -180)],
        wayBack: !!state.history[addDays(t, -720)],
        recentCompletion: state.quests[0].completions.indexOf(addDays(t, -30)) !== -1
      };
    }, SEED.toString());
    expect(result.today).toBe(true);
    expect(result.thirtyDaysAgo).toBe(true);
    expect(result.sixMonthsAgo).toBe(true);   /* the heatmap needs 6 months */
    expect(result.wayBack).toBe(false);       /* folded into the archive */
    expect(result.recentCompletion).toBe(true);
  });

  test("pruning twice does not double-count", async ({ page }) => {
    await bootAsGuest(page);
    const same = await page.evaluate((seed) => {
      eval("(" + seed + ")")();
      pruneState();
      const first = allTimeCleared();
      pruneState();
      return first === allTimeCleared();
    }, SEED.toString());
    expect(same).toBe(true);
  });

  test("a fresh hunter has nothing to prune and no archive notice", async ({ page }) => {
    await bootAsGuest(page);
    const result = await page.evaluate(() => {
      const changed = pruneState();
      switchPage("stats");
      const note = document.getElementById("archiveNote");
      return { changed: changed, noteHidden: note.style.display === "none" };
    });
    expect(result.changed).toBe(false);
    expect(result.noteHidden).toBe(true);
  });
});
