/* Reports are mandatory and cost XP when missed, so their arithmetic has to be
   right — especially the rule that nothing is ever demanded retroactively. */
const { test, expect } = require("@playwright/test");
const { bootAsGuest, drainAnnouncements } = require("./helpers");

test.describe("mandatory reports", () => {
  test("a hunter who just started owes nothing", async ({ page }) => {
    await bootAsGuest(page);
    const owed = await page.evaluate(() => {
      state.created = addDays(todayStr(), -400);
      state.reportsSince = "";
      repFix(); /* stamps reportsSince = today */
      return repPeriods().filter((p) => p.due || p.missed).length;
    });
    expect(owed).toBe(0);
  });

  test("deadlines are 1 day weekly, 3 days monthly, 7 days annual", async ({ page }) => {
    await bootAsGuest(page);
    const g = await page.evaluate(() => [REP_KINDS.w.grace, REP_KINDS.m.grace, REP_KINDS.y.grace]);
    expect(g).toEqual([1, 3, 7]);

    const week = await page.evaluate(() => {
      state.created = addDays(todayStr(), -400);
      state.reportsSince = addDays(todayStr(), -400);
      const w = repPeriods().filter((p) => p.kind === "w")[0];
      return { end: w.end, opens: w.opens, deadline: w.deadline };
    });
    /* a weekly report opens the day after the week ends and is due that same day */
    expect(week.opens).toBe(week.deadline);
  });

  test("a report under 40 characters is refused", async ({ page }) => {
    await bootAsGuest(page);
    await page.evaluate(() => {
      state.level = 40;
      state.created = addDays(todayStr(), -400);
      state.reportsSince = addDays(todayStr(), -400);
      save();
      const k = repPeriods().filter((p) => p.kind === "w")[0].key;
      openReportModal(k);
      document.getElementById("repMText").value = "too short";
    });
    await page.click("#repMSave");
    await page.waitForTimeout(300);
    expect(await page.locator("#repModal.show").isVisible()).toBe(true);
    expect(await page.evaluate(() => Object.keys(state.reports).length)).toBe(0);
  });

  test("filing on time pays XP; filing late pays nothing and is marked LATE", async ({ page }) => {
    await bootAsGuest(page);
    const onTime = await page.evaluate(() => {
      state.level = 40;
      state.created = addDays(todayStr(), -400);
      state.reportsSince = addDays(todayStr(), -400);
      state.reports = {};
      state.xpDebt = 0;
      REP_KINDS.w.grace = 30; /* keep the most recent week inside its window */
      const p = repPeriods().filter((x) => x.kind === "w" && x.due)[0];
      const before = state.totalXp;
      openReportModal(p.key);
      document.getElementById("repMText").value =
        "Five clean days, two lost to travel. The fix is packing the kit the night before.";
      saveReport();
      REP_KINDS.w.grace = 1;
      return { gain: state.totalXp - before, late: state.reports[p.key].late };
    });
    await drainAnnouncements(page);
    expect(onTime.late).toBe(false);
    expect(onTime.gain).toBeGreaterThan(0);

    const late = await page.evaluate(() => {
      state.reports = {};
      const p = repPeriods().filter((x) => x.kind === "w" && x.missed)[0];
      const before = state.totalXp;
      openReportModal(p.key);
      document.getElementById("repMText").value =
        "Filed after the deadline. The week was a mess and I did not want to write it down.";
      saveReport();
      return { gain: state.totalXp - before, late: state.reports[p.key].late };
    });
    await drainAnnouncements(page);
    expect(late.late).toBe(true);
    expect(late.gain).toBe(0);
  });

  test("a missed deadline adds debt exactly once", async ({ page }) => {
    await bootAsGuest(page);
    const first = await page.evaluate(() => {
      state.created = addDays(todayStr(), -400);
      state.reportsSince = addDays(todayStr(), -400);
      state.reports = {};
      state.reportDebt = {};
      state.xpDebt = 0;
      checkReportDeadlines();
      return { debt: state.xpDebt, punished: Object.keys(state.reportDebt).length };
    });
    await drainAnnouncements(page);
    expect(first.debt).toBeGreaterThan(0);
    expect(first.punished).toBeGreaterThan(0);

    const second = await page.evaluate(() => {
      const before = state.xpDebt;
      checkReportDeadlines();
      return state.xpDebt === before;
    });
    expect(second).toBe(true);
  });
});
