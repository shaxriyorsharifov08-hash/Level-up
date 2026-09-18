/* The per-quest record window. These used to live in world.spec.js, which
   was deleted with the walkable world. */
const { test, expect } = require("@playwright/test");
const { bootAsGuest } = require("./helpers");

test.describe("one quest, full screen", () => {
  test("opens with the quest's real record and its own timer", async ({ page }) => {
    await bootAsGuest(page);
    const result = await page.evaluate(() => {
      const q = state.quests[0];
      q.completions = [];
      for (let i = 1; i <= 40; i += 2) q.completions.push(addDays(todayStr(), -i));
      q.streak = 4; q.bestStreak = 11; q.timeSpent = 5400; q.target = 7; q.progress = 3;
      save();
      openQuestView(q.id);
      return {
        open: document.getElementById("questView").classList.contains("show"),
        numbers: Array.from(document.querySelectorAll("#qvNums .qv-num b")).map((x) => x.textContent),
        cells: document.querySelectorAll("#qvGrid .qv-cell").length,
        lit: document.querySelectorAll("#qvGrid .qv-cell.on").length,
        logRows: document.querySelectorAll("#qvLog .qv-log-row").length
      };
    });
    expect(result.open).toBe(true);
    expect(result.cells).toBe(84);          /* 12 weeks */
    expect(result.lit).toBe(20);            /* every other day for 40 days */
    expect(result.numbers[0]).toBe("4");    /* current streak */
    expect(result.numbers[1]).toBe("11");   /* best streak */
    expect(result.logRows).toBeGreaterThan(0);
  });

  test("its timer is the same focus window everything else uses", async ({ page }) => {
    await bootAsGuest(page);
    const r = await page.evaluate(() => {
      const q = state.quests[0];
      openQuestView(q.id);
      document.getElementById("qvStart").click();
      return { open: focusOpen(), timing: state.activeTimer && state.activeTimer.id === q.id,
               name: document.getElementById("foName").textContent };
    });
    expect(r.open).toBe(true);
    expect(r.timing).toBe(true);
    expect(r.name).toBeTruthy();
  });
});
