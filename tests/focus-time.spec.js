/* The focus timer takes the whole screen, and every tracked second is
   attributed to where the work actually went. */
const { test, expect } = require("@playwright/test");
const { bootAsGuest, drainAnnouncements } = require("./helpers");

test.describe("the focus window", () => {
  test("pressing the timer takes over the screen", async ({ page }) => {
    await bootAsGuest(page);
    await page.evaluate(() => {
      state.quests = [makeQuest("🏃", "Morning run", "d", "daily", [], "easy", "END", "", false, 1)];
      save();
      startTimer(state.quests[0].id);
    });
    await page.waitForSelector("#focusOv.show");
    expect(await page.locator("#focusOv").isVisible()).toBe(true);
    expect(await page.textContent("#foName")).toBe("Morning run");
    /* a focus window that shares the screen with the thing you are avoiding
       is not a focus window: it must cover everything */
    const box = await page.locator("#focusOv").boundingBox();
    const vp = page.viewportSize();
    expect(box.width).toBe(vp.width);
    expect(box.height).toBe(vp.height);
  });

  test("closing the window does not stop the clock", async ({ page }) => {
    await bootAsGuest(page);
    const r = await page.evaluate(async () => {
      state.quests = [makeQuest("🏃", "Run", "d", "daily", [], "easy", "END", "", false, 1)];
      save();
      startTimer(state.quests[0].id);
      closeFocus(true);
      await new Promise((res) => setTimeout(res, 1100));
      return { open: focusOpen(), running: !!state.activeTimer, elapsed: timerElapsedSec() };
    });
    expect(r.open).toBe(false);
    expect(r.running).toBe(true);
    expect(r.elapsed).toBeGreaterThan(0.9);
    /* and the pill is showing, so there is a way back in */
    expect(await page.locator("#timerPill").getAttribute("class")).toContain("show");
  });

  test("the target can be changed and is remembered for next time", async ({ page }) => {
    await bootAsGuest(page);
    const r = await page.evaluate(() => {
      state.quests = [makeQuest("🏃", "Run", "d", "daily", [], "easy", "END", "", false, 1)];
      save();
      startTimer(state.quests[0].id);
      const first = state.activeTimer.goalMin;
      document.querySelector('#foChips [data-goal="50"]').click();
      const after = state.activeTimer.goalMin;
      stopTimer(true);
      startTimer(state.quests[0].id);
      return { first: first, after: after, remembered: state.activeTimer.goalMin };
    });
    expect(r.first).toBe(25);
    expect(r.after).toBe(50);
    expect(r.remembered).toBe(50);
  });

  test("FINISH logs the session and shuts the window", async ({ page }) => {
    await bootAsGuest(page);
    const r = await page.evaluate(() => {
      state.quests = [makeQuest("🏃", "Run", "d", "daily", [], "easy", "END", "", false, 1)];
      state.timeHistory = {}; state.timeBy = {};
      save();
      startTimer(state.quests[0].id);
      state.activeTimer.accumulated = 600;     /* ten minutes of work */
      document.getElementById("foFinish").click();
      return {
        open: focusOpen(), running: !!state.activeTimer,
        quest: state.quests[0].timeSpent, day: state.timeHistory[todayStr()]
      };
    });
    await drainAnnouncements(page);
    expect(r.open).toBe(false);
    expect(r.running).toBe(false);
    expect(r.quest).toBe(600);
    expect(r.day).toBe(600);
  });
});

test.describe("where the time went", () => {
  test("each section's time is recorded separately and still sums to the total", async ({ page }) => {
    await bootAsGuest(page);
    const r = await page.evaluate(() => {
      state.timeHistory = {}; state.timeBy = {};
      const q = makeQuest("🏃", "Run", "d", "daily", [], "easy", "END", "", false, 1);
      const c = makeQuest("🚭", "Sober", "d", "challenge", [], "easy", "END", "", false, 1);
      state.quests = [q, c];
      state.todos = [makeTodo("Call the bank", todayStr())];
      const run = (id, secs) => {
        startTimer(id);
        state.activeTimer.accumulated = secs;
        stopTimer(true);
      };
      run(q.id, 1800);
      run(c.id, 600);
      run(state.todos[0].id, 900);
      const tb = timeByOn(todayStr());
      return { tb: tb, questSec: q.timeSpent, todoSec: state.todos[0].sec };
    });
    expect(r.tb.quest).toBe(1800);
    expect(r.tb.challenge).toBe(600);
    expect(r.tb.todo).toBe(900);
    expect(r.tb.total).toBe(3300);
    expect(r.tb.other).toBe(0);
    /* the per-task record survives alongside the per-section split */
    expect(r.questSec).toBe(1800);
    expect(r.todoSec).toBe(900);
  });

  test("time logged before the split existed is shown, not lost", async ({ page }) => {
    await bootAsGuest(page);
    const tb = await page.evaluate(() => {
      const t = todayStr();
      state.timeHistory = {}; state.timeBy = {};
      state.timeHistory[t] = 7200;      /* an old save: a total with no breakdown */
      return timeByOn(t);
    });
    expect(tb.total).toBe(7200);
    expect(tb.other).toBe(7200);
  });

  test("pruning drops the old breakdown without losing the archived total", async ({ page }) => {
    await bootAsGuest(page);
    const r = await page.evaluate(() => {
      const old = addDays(todayStr(), -500), keep = todayStr();
      state.timeHistory = {}; state.timeBy = {};
      state.timeHistory[old] = 3600; state.timeBy[old] = { quest: 3600 };
      state.timeHistory[keep] = 600;  state.timeBy[keep] = { todo: 600 };
      archiveFix();
      const before = state.archive.focusSec;
      pruneState();
      return {
        oldGone: state.timeBy[old] === undefined,
        keptStill: !!state.timeBy[keep],
        archived: state.archive.focusSec - before
      };
    });
    expect(r.oldGone).toBe(true);
    expect(r.keptStill).toBe(true);
    expect(r.archived).toBe(3600);
  });
});

test.describe("a day opened as a file", () => {
  async function seedDay(page) {
    await page.evaluate(() => {
      const t = todayStr();
      state.timeHistory = {}; state.timeBy = {};
      const q = makeQuest("🏃", "Morning run", "d", "daily", [], "easy", "END", "", false, 1);
      q.completions = [t]; q.lastCompleted = t; q.timeSpent = 2700;
      const q2 = makeQuest("📖", "Read", "d", "daily", [], "easy", "INT", "", false, 1);
      state.quests = [q, q2];
      state.todos = [makeTodo("Call the bank", t), makeTodo("Buy strings", t)];
      state.todos[0].done = true; state.todos[0].sec = 1500;
      state.todos[1].sec = 900;
      state.timeHistory[t] = 2700 + 2400;
      state.timeBy[t] = { quest: 2700, todo: 2400 };
      save();
      switchPage("quests"); qcOpen(); qcOpenDay(t);
    });
    await page.waitForTimeout(300);
  }

  test("the day shows time spent, completion percent and the split", async ({ page }) => {
    await bootAsGuest(page);
    await seedDay(page);
    const cells = await page.evaluate(() =>
      Array.from(document.querySelectorAll("#qcDayList .qd-cell")).map((c) => ({
        v: c.querySelector("b").textContent, l: c.querySelector("span").textContent
      })));
    expect(cells[0].l).toBe("TIME SPENT");
    expect(cells[0].v).toBe("1h 25m");
    expect(cells[1].l).toBe("COMPLETED");
    /* 1 of 2 quests + 1 of 2 to-dos = 2 of 4 */
    expect(cells[1].v).toBe("50%");
    expect(cells[2].v).toBe("2 / 4");

    const split = await page.evaluate(() =>
      Array.from(document.querySelectorAll("#qcDayList .qd-srow")).map((r) => ({
        name: r.querySelector(".qd-sname").textContent.trim(),
        time: r.querySelector(".qd-stime").textContent
      })));
    expect(split.map((x) => x.name)).toEqual(["📜 QUESTS", "✅ TO DO LIST"]);
    expect(split[0].time).toBe("45m");
    expect(split[1].time).toBe("40m");
  });

  test("the to-do button carries the day's to-do time, and each row its own", async ({ page }) => {
    await bootAsGuest(page);
    await seedDay(page);
    expect(await page.textContent("#qcTdBtn")).toContain("40m");
    await page.click("#qcTdBtn");
    await page.waitForTimeout(200);
    const rows = await page.evaluate(() =>
      Array.from(document.querySelectorAll("#qcTdList .qc-row")).map((r) => ({
        name: r.querySelector(".qc-name").textContent,
        meta: r.querySelector(".qc-freq").textContent
      })));
    expect(rows.find((r) => r.name === "Call the bank").meta).toContain("25m");
    expect(rows.find((r) => r.name === "Buy strings").meta).toContain("15m");
  });

  test("a day with nothing tracked says so instead of showing a fake bar", async ({ page }) => {
    await bootAsGuest(page);
    await page.evaluate(() => {
      state.timeHistory = {}; state.timeBy = {}; state.quests = []; state.todos = [];
      save();
      switchPage("quests"); qcOpen(); qcOpenDay(todayStr());
    });
    await page.waitForTimeout(300);
    expect(await page.locator("#qcDayList .qd-srow").count()).toBe(0);
    expect(await page.textContent("#qcDayList")).toContain("No time was tracked");
  });
});

test.describe("the to-do list's time", () => {
  test("the list shows one accumulated total, not a time per row", async ({ page }) => {
    await bootAsGuest(page);
    await page.evaluate(() => {
      const t = todayStr();
      state.timeHistory = {}; state.timeBy = {};
      state.todos = [makeTodo("A", t), makeTodo("B", t)];
      state.todos[0].sec = 1500; state.todos[1].sec = 900;
      state.timeBy[t] = { todo: 2400 }; state.timeHistory[t] = 2400;
      save();
      qTab = "todo"; switchPage("quests");
    });
    await page.waitForTimeout(300);
    expect(await page.textContent("#tdTotal")).toContain("40m");
    /* the split is kept in the data but stays out of the list itself */
    const rowText = await page.evaluate(() =>
      Array.from(document.querySelectorAll("#tdList .td-txt")).map((e) => e.textContent).join("|"));
    expect(rowText).not.toContain("25m");
    expect(rowText).not.toContain("15m");
  });

  test("the square is called TO DO LIST", async ({ page }) => {
    await bootAsGuest(page);
    await page.evaluate(() => switchPage("quests"));
    await page.waitForTimeout(300);
    expect(await page.textContent('#qTabs .qtab[data-tab="todo"] .qtab-name')).toBe("TO DO LIST");
  });
});
