/* The separate interval timer is gone, one timer serves everything, and money
   is read a day at a time instead of as one undifferentiated run of rows. */
const { test, expect } = require("@playwright/test");
const { bootAsGuest, drainAnnouncements } = require("./helpers");

async function seedMoney(page) {
  await page.evaluate(() => {
    const t = todayStr();
    const mk = (type, amount, cat, note, date) => ({ id: uid(), type, amount, cat, note, date });
    state.budget.currency = "$";
    state.budget.transactions = [
      mk("out", 45, "food", "Groceries", t),
      mk("out", 12, "transport", "Taxi", t),
      mk("in", 500, "salary", "Salary", t),
      mk("out", 90, "fun", "Cinema", addDays(t, -1)),
      mk("out", 30, "food", "Lunch", addDays(t, -1)),
      mk("out", 250, "home", "Rent", addDays(t, -3))
    ];
    state.level = 90;
    save();
    switchPage("budget");
  });
  await page.waitForTimeout(400);
}

test.describe("the separate interval timer is gone", () => {
  test("its page, its engine and its markup all left together", async ({ page }) => {
    await bootAsGuest(page);
    const r = await page.evaluate(() => ({
      inPages: PAGES.indexOf("interval"),
      inNav: NAV_ORDER.indexOf("interval"),
      section: !!document.getElementById("page-interval"),
      engine: typeof window.ivStart,
      presets: typeof window.IV_PRESETS,
      dial: !!document.getElementById("ivDial"),
      qvDial: !!document.getElementById("qvDial"),
      qvWork: !!document.getElementById("qvWork")
    }));
    expect(r.inPages).toBe(-1);
    expect(r.inNav).toBe(-1);
    expect(r.section).toBe(false);
    expect(r.engine).toBe("undefined");
    expect(r.presets).toBe("undefined");
    expect(r.dial).toBe(false);
    expect(r.qvDial).toBe(false);     /* and the copy inside the quest window */
    expect(r.qvWork).toBe(false);
  });

  test("the dock no longer offers it", async ({ page }) => {
    await bootAsGuest(page);
    const labels = await page.evaluate(() =>
      (state.navConfig || []).map((n) => n.page));
    expect(labels).not.toContain("interval");
  });

  test("an old save that was sitting on the timer page still opens", async ({ page }) => {
    await bootAsGuest(page);
    const r = await page.evaluate(() => {
      const old = JSON.parse(localStorage.getItem(SKEY));
      old.quests = [{
        id: "q1", icon: "⚔", name: "Old quest", desc: "", freq: "daily", days: [],
        tier: "easy", stat: "END", link: "", system: false, target: 1, progress: 0,
        startDate: "", endDate: "", repeatDays: 0, blocking: false, needTimer: false,
        lastTimedOn: "", streak: 0, bestStreak: 0, lastCompleted: "", lastWeek: "",
        completions: [], done: false, created: "2026-01-01",
        iv: { w: 45, r: 20, c: 6 }        /* rounds from the removed timer */
      }];
      old.navConfig = [{ page: "interval", label: "TIMER", hidden: false },
                       { page: "home", label: "HOME", hidden: false }];
      localStorage.setItem(SKEY, JSON.stringify(old));
      load();
      reconcileNav();
      return { ivGone: questById("q1").iv === undefined,
               nav: state.navConfig.map((n) => n.page) };
    });
    expect(r.ivGone).toBe(true);
    expect(r.nav).not.toContain("interval");
  });
});

test.describe("one timer, everywhere", () => {
  test("a quest, a challenge, a one-time goal and a to-do all open the same window", async ({ page }) => {
    await bootAsGuest(page);
    const r = await page.evaluate(() => {
      const out = [];
      const mk = (name, freq) => {
        const q = makeQuest("⚔", name, "d", freq, [], "easy", "END", "", false, 1);
        state.quests.push(q); return q;
      };
      state.quests = [];
      const targets = [mk("A daily", "daily"), mk("A challenge", "challenge"), mk("A goal", "longterm")];
      state.todos = [makeTodo("A to-do", todayStr())];
      targets.concat([state.todos[0]]).forEach((x) => {
        startTimer(x.id);
        out.push({ id: x.id, open: focusOpen(), timing: state.activeTimer.id === x.id,
                   kind: state.activeTimer.kind });
        stopTimer(true);
      });
      return out;
    });
    await drainAnnouncements(page);
    expect(r.length).toBe(4);
    r.forEach((x) => {
      expect(x.open).toBe(true);
      expect(x.timing).toBe(true);
    });
    /* and each one is attributed to the right bucket */
    expect(r.map((x) => x.kind)).toEqual(["quest", "challenge", "quest", "todo"]);
  });
});

test.describe("money, a day at a time", () => {
  test("transactions are packed per day, newest day first", async ({ page }) => {
    await bootAsGuest(page);
    await seedMoney(page);
    const packs = await page.evaluate(() =>
      Array.from(document.querySelectorAll("#txList .tx-day")).map((d) => ({
        day: d.querySelector(".tx-day-d").textContent,
        n: d.querySelector(".tx-day-n").textContent,
        sum: d.querySelector(".tx-day-sum").textContent,
        rows: d.querySelectorAll(".tx-row").length
      })));
    expect(packs.length).toBe(3);
    expect(packs[0].rows).toBe(3);       /* today */
    expect(packs[1].rows).toBe(2);
    expect(packs[2].rows).toBe(1);
    expect(packs[0].n).toContain("3 entries");
    expect(packs[2].n).toContain("1 entry");
    /* newest first: today's day label is not the same as the oldest */
    expect(packs[0].day).not.toBe(packs[2].day);
  });

  test("each pack shows that day's net, in and out", async ({ page }) => {
    await bootAsGuest(page);
    await seedMoney(page);
    const t = await page.evaluate(() => {
      const today = txDayTotals(txOn(todayStr()));
      const yday = txDayTotals(txOn(addDays(todayStr(), -1)));
      return { today: today, yday: yday,
               sum: document.querySelector("#txList .tx-day .tx-day-sum").textContent,
               cls: document.querySelector("#txList .tx-day .tx-day-sum").className };
    });
    expect(t.today).toEqual({ inc: 500, out: 57, net: 443 });
    expect(t.yday).toEqual({ inc: 0, out: 120, net: -120 });
    expect(t.sum).toContain("443");
    expect(t.cls).toContain("tx-in");    /* a positive day reads as income */
  });

  test("the rows inside a pack no longer repeat the date", async ({ page }) => {
    await bootAsGuest(page);
    await seedMoney(page);
    /* the date is the pack's header now; repeating it on every row was the noise */
    const dates = await page.evaluate(() =>
      Array.from(document.querySelectorAll("#txList .tx-row .tx-date")).map((e) => e.textContent));
    expect(dates.length).toBe(6);
    dates.forEach((d) => expect(d).not.toContain(","));
  });

  test("an empty month still says so", async ({ page }) => {
    await bootAsGuest(page);
    await seedMoney(page);
    await page.evaluate(() => { state.budget.transactions = []; renderBudget(); });
    await page.waitForTimeout(200);
    expect(await page.locator("#txList .tx-day").count()).toBe(0);
    expect(await page.textContent("#txList")).toContain("No transactions");
  });
});

test.describe("money in the calendar", () => {
  test("a day carries its money behind its own button, below the to-dos", async ({ page }) => {
    await bootAsGuest(page);
    await seedMoney(page);
    await page.evaluate(() => { switchPage("quests"); qcOpen(); qcOpenDay(todayStr()); });
    await page.waitForTimeout(350);

    const label = await page.textContent("#qcTxBtn");
    expect(label).toContain("3 entries");
    expect(label).toContain("443");

    /* order: the to-do button comes before the money button */
    const order = await page.evaluate(() => {
      const ids = Array.from(document.querySelectorAll("#qcDayList button")).map((b) => b.id);
      return { td: ids.indexOf("qcTdBtn"), tx: ids.indexOf("qcTxBtn") };
    });
    expect(order.td).toBeGreaterThanOrEqual(0);
    expect(order.tx).toBeGreaterThan(order.td);

    /* and it stays behind the button until asked for */
    expect(await page.locator("#qcTxList").isVisible()).toBe(false);
    await page.click("#qcTxBtn");
    await page.waitForTimeout(200);
    expect(await page.locator("#qcTxList").isVisible()).toBe(true);
    expect(await page.locator("#qcTxList .tx-row").count()).toBe(3);
  });

  test("the calendar copy cannot be edited from there", async ({ page }) => {
    await bootAsGuest(page);
    await seedMoney(page);
    await page.evaluate(() => { switchPage("quests"); qcOpen(); qcOpenDay(todayStr()); });
    await page.waitForTimeout(300);
    await page.click("#qcTxBtn");
    await page.waitForTimeout(200);
    /* the calendar is an overview; editing belongs in BUDGET */
    expect(await page.locator("#qcTxList [data-txedit]").count()).toBe(0);
    expect(await page.locator("#txList [data-txedit]").count()).toBeGreaterThan(0);
  });

  test("a day with no money says nothing moved", async ({ page }) => {
    await bootAsGuest(page);
    await seedMoney(page);
    await page.evaluate(() => { switchPage("quests"); qcOpen(); qcOpenDay(addDays(todayStr(), -9)); });
    await page.waitForTimeout(300);
    expect(await page.textContent("#qcTxBtn")).toContain("nothing spent");
    await page.click("#qcTxBtn");
    await page.waitForTimeout(200);
    expect(await page.textContent("#qcTxList")).toContain("No money moved");
  });
});
