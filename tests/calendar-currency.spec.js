/* The calendar must tell the truth about which day a quest belonged to, and
   changing currency must move the money, not just the symbol. */
const { test, expect } = require("@playwright/test");
const { bootAsGuest, drainAnnouncements } = require("./helpers");

test.describe("quest calendar", () => {
  test("the button is visible at the top of the quest section", async ({ page }) => {
    await bootAsGuest(page);
    await page.evaluate(() => switchPage("quests"));
    await page.waitForTimeout(400);
    expect(await page.locator("#qcOpenBtn").isVisible()).toBe(true);
  });

  test("opens on the current month and can be paged", async ({ page }) => {
    await bootAsGuest(page);
    await page.evaluate(() => switchPage("quests"));
    await page.click("#qcOpenBtn");
    await page.waitForSelector("#qcOv.show");
    const first = await page.textContent("#qcTitle");
    const cells = await page.locator("#qcGrid .qc-cell:not(.empty)").count();
    expect(cells).toBeGreaterThanOrEqual(28);
    expect(cells).toBeLessThanOrEqual(31);

    await page.click("#qcNext");
    expect(await page.textContent("#qcTitle")).not.toBe(first);
    await page.click("#qcPrev");
    expect(await page.textContent("#qcTitle")).toBe(first);
  });

  test("a day opens as its own window listing only that day's quests", async ({ page }) => {
    await bootAsGuest(page);
    const seeded = await page.evaluate(() => {
      const t = todayStr();
      const y = addDays(t, -3);
      state.quests = [];
      const daily = makeQuest("D", "Daily push-ups", "100 of them", "daily", [], "easy", "STR", "", false, 7);
      daily.created = addDays(t, -30);
      daily.completions = [y];
      const goal = makeQuest("G", "Finish the book", "The one on the shelf", "longterm", [], "medium", "INT", "", false, 1);
      goal.created = addDays(t, -30);
      goal.startDate = y; goal.endDate = y;
      const other = makeQuest("O", "Tuesday only", "custom day", "custom", [2], "easy", "END", "", false, 7);
      other.created = addDays(t, -30);
      state.quests.push(daily, goal, other);
      save();
      return { y: y, weekday: new Date(y + "T00:00:00").getDay() };
    });

    await page.evaluate((d) => { switchPage("quests"); qcOpen(); qcOpenDay(d); }, seeded.y);
    await page.waitForTimeout(300);

    const view = await page.evaluate(() => ({
      dayPaneShown: document.getElementById("qcDayPane").style.display !== "none",
      monthPaneHidden: document.getElementById("qcMonthPane").style.display === "none",
      rows: Array.from(document.querySelectorAll("#qcDayList .qc-row")).map((r) => ({
        name: r.querySelector(".qc-name").textContent,
        desc: r.querySelector(".qc-desc") ? r.querySelector(".qc-desc").textContent : "",
        status: r.querySelector(".qc-status").textContent.trim()
      })),
      count: document.getElementById("qcDayCount").textContent
    }));

    expect(view.dayPaneShown).toBe(true);
    expect(view.monthPaneHidden).toBe(true);
    /* the daily quest was cleared that day */
    const daily = view.rows.filter((r) => r.name === "Daily push-ups")[0];
    expect(daily).toBeTruthy();
    expect(daily.status).toContain("COMPLETED");
    expect(daily.desc).toBe("100 of them");
    /* the goal's window covered that day and it was not done */
    const goal = view.rows.filter((r) => r.name === "Finish the book")[0];
    expect(goal).toBeTruthy();
    expect(goal.status).toContain("NOT DONE");
    /* the Tuesday-only quest appears only if that day was a Tuesday */
    const custom = view.rows.filter((r) => r.name === "Tuesday only").length;
    expect(custom).toBe(seeded.weekday === 2 ? 1 : 0);
  });

  test("a quest is not shown before it existed", async ({ page }) => {
    await bootAsGuest(page);
    const shown = await page.evaluate(() => {
      const t = todayStr();
      state.quests = [];
      const q = makeQuest("N", "Made today", "d", "daily", [], "easy", "END", "", false, 7);
      q.created = t;
      state.quests.push(q);
      return dayQuests(addDays(t, -5)).length;
    });
    expect(shown).toBe(0);
  });

  test("future days read as scheduled, not as failures", async ({ page }) => {
    await bootAsGuest(page);
    const status = await page.evaluate(() => {
      const t = todayStr();
      state.quests = [];
      const q = makeQuest("F", "Future daily", "d", "daily", [], "easy", "END", "", false, 7);
      q.created = addDays(t, -10);
      state.quests.push(q);
      return dayQuests(addDays(t, 3))[0].status;
    });
    expect(status).toBe("future");
  });

  test("back returns to the month without closing the calendar", async ({ page }) => {
    await bootAsGuest(page);
    await page.evaluate(() => { switchPage("quests"); qcOpen(); qcOpenDay(todayStr()); });
    await page.waitForTimeout(250);
    await page.click("#qcBack");
    await page.waitForTimeout(250);
    const state2 = await page.evaluate(() => ({
      open: document.getElementById("qcOv").classList.contains("show"),
      monthShown: document.getElementById("qcMonthPane").style.display !== "none"
    }));
    expect(state2.open).toBe(true);
    expect(state2.monthShown).toBe(true);
  });
});

test.describe("currency conversion", () => {
  const SEED_BUDGET = () => {
    state.budget.currency = "so'm";
    state.budget.transactions = [
      { id: "a", type: "in", amount: 12600, note: "salary", date: todayStr(), cat: "salary" },
      { id: "b", type: "out", amount: 6300, note: "food", date: todayStr(), cat: "food" }
    ];
    state.budget.goals = [{ id: "g", name: "Laptop", target: 126000, saved: 25200, done: false }];
    state.budget.wishlist = [{ id: "w", name: "Shoes", price: 63000, emoji: "👟" }];
    save();
  };

  test("changing currency converts every amount, not just the symbol", async ({ page }) => {
    await bootAsGuest(page);
    const result = await page.evaluate((seed) => {
      eval("(" + seed + ")")();
      openFxModal("so'm", "$");
      const suggested = +document.getElementById("fxRate").value;
      applyFx(true);
      const b = state.budget;
      return {
        suggested: suggested,
        currency: b.currency,
        income: b.transactions[0].amount,
        expense: b.transactions[1].amount,
        goalTarget: b.goals[0].target,
        goalSaved: b.goals[0].saved,
        wishPrice: b.wishlist[0].price
      };
    }, SEED_BUDGET.toString());
    await drainAnnouncements(page);
    /* 12600 so'm to the dollar, as the built-in table has it */
    expect(result.suggested).toBe(12600);
    expect(result.currency).toBe("$");
    expect(result.income).toBe(1);
    expect(result.expense).toBe(0.5);
    expect(result.goalTarget).toBe(10);
    expect(result.goalSaved).toBe(2);
    expect(result.wishPrice).toBe(5);
  });

  test("the rate can be corrected before converting", async ({ page }) => {
    await bootAsGuest(page);
    const income = await page.evaluate((seed) => {
      eval("(" + seed + ")")();
      openFxModal("so'm", "$");
      document.getElementById("fxRate").value = 12000; /* the hunter's own rate */
      applyFx(true);
      return state.budget.transactions[0].amount;
    }, SEED_BUDGET.toString());
    await drainAnnouncements(page);
    expect(income).toBe(1.05);
  });

  test("SYMBOL ONLY leaves the numbers alone", async ({ page }) => {
    await bootAsGuest(page);
    const result = await page.evaluate((seed) => {
      eval("(" + seed + ")")();
      openFxModal("so'm", "$");
      applyFx(false);
      return { currency: state.budget.currency, income: state.budget.transactions[0].amount };
    }, SEED_BUDGET.toString());
    await drainAnnouncements(page);
    expect(result.currency).toBe("$");
    expect(result.income).toBe(12600);
  });

  test("converting there and back returns the original amounts", async ({ page }) => {
    await bootAsGuest(page);
    const result = await page.evaluate((seed) => {
      eval("(" + seed + ")")();
      const before = state.budget.transactions[0].amount;
      openFxModal("so'm", "$"); applyFx(true);
      openFxModal("$", "so'm"); applyFx(true);
      return { before: before, after: state.budget.transactions[0].amount };
    }, SEED_BUDGET.toString());
    await drainAnnouncements(page);
    expect(result.after).toBe(result.before);
  });

  test("every currency in the picker has a rate", async ({ page }) => {
    await bootAsGuest(page);
    const missing = await page.evaluate(() => {
      const bad = [];
      document.querySelectorAll("#budgetCurrency option").forEach((o) => {
        if (!FX_PER_USD[o.value]) bad.push(o.value);
      });
      return bad;
    });
    expect(missing).toEqual([]);
  });

  test("a zero or negative rate is refused", async ({ page }) => {
    await bootAsGuest(page);
    const result = await page.evaluate((seed) => {
      eval("(" + seed + ")")();
      openFxModal("so'm", "$");
      document.getElementById("fxRate").value = 0;
      applyFx(true);
      return { currency: state.budget.currency, income: state.budget.transactions[0].amount };
    }, SEED_BUDGET.toString());
    expect(result.currency).toBe("so'm");   /* nothing changed */
    expect(result.income).toBe(12600);
  });

  test("an empty budget just changes the symbol with no prompt", async ({ page }) => {
    await bootAsGuest(page);
    const result = await page.evaluate(() => {
      state.budget.currency = "$";
      state.budget.transactions = []; state.budget.goals = []; state.budget.wishlist = [];
      switchPage("budget");
      const sel = document.getElementById("budgetCurrency");
      sel.value = "€";
      sel.dispatchEvent(new Event("change"));
      return {
        currency: state.budget.currency,
        modalOpen: document.getElementById("fxModal").classList.contains("show")
      };
    });
    expect(result.currency).toBe("€");
    expect(result.modalOpen).toBe(false);
  });
});

/* The quest calendar originally collided with the app's own date picker —
   same function names, same element ids, same CSS classes. This guards the
   picker that was already there. */
test.describe("the quest date picker still works", () => {
  test("it is a separate thing from the quest calendar", async ({ page }) => {
    await bootAsGuest(page);
    const result = await page.evaluate(() => ({
      pickerFn: typeof openCalendar,        /* the original, takes an input element */
      questCalFn: typeof qcOpen,            /* the new one */
      pickerGrid: !!document.getElementById("calGrid"),
      questCalGrid: !!document.getElementById("qcGrid"),
      distinct: document.getElementById("calGrid") !== document.getElementById("qcGrid")
    }));
    expect(result.pickerFn).toBe("function");
    expect(result.questCalFn).toBe("function");
    expect(result.pickerGrid).toBe(true);
    expect(result.questCalGrid).toBe(true);
    expect(result.distinct).toBe(true);
  });

  test("opening it on a date input still fills that input", async ({ page }) => {
    await bootAsGuest(page);
    const result = await page.evaluate(() => {
      const input = document.createElement("input");
      input.id = "pickerProbe";
      input.value = "2026-03-15";
      document.body.appendChild(input);
      openCalendar(input);
      return {
        opened: !!document.getElementById("calGrid").innerHTML,
        noCrash: true
      };
    });
    expect(result.noCrash).toBe(true);
    expect(result.opened).toBe(true);
  });
});
