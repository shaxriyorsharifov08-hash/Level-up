/* The to-do list is deliberately outside the game: no tier, no crate, no
   trophy, no rank. And money fields must be readable while you type them. */
const { test, expect } = require("@playwright/test");
const { bootAsGuest, drainAnnouncements } = require("./helpers");

test.describe("money inputs", () => {
  test("typing 12000 shows 12,000 and still saves 12000", async ({ page }) => {
    await bootAsGuest(page);
    await page.evaluate(() => { state.level = 90; save(); switchPage("budget"); });
    await page.waitForTimeout(400);
    await page.type("#txAmount", "12000", { delay: 20 });
    expect(await page.inputValue("#txAmount")).toBe("12,000");
    expect(await page.evaluate(() => moneyNum("txAmount"))).toBe(12000);

    await page.click("#txAddBtn");
    await drainAnnouncements(page);
    const last = await page.evaluate(() => state.budget.transactions[state.budget.transactions.length - 1]);
    expect(last.amount).toBe(12000);
  });

  test("millions, decimals and corrections all group correctly", async ({ page }) => {
    await bootAsGuest(page);
    const cases = await page.evaluate(() => ["2500000", "999", "1234.5", "0.92", "12600", "", "0"]
      .map((v) => [v, moneyGroup(v)]));
    expect(cases).toEqual([
      ["2500000", "2,500,000"], ["999", "999"], ["1234.5", "1,234.5"],
      ["0.92", "0.92"], ["12600", "12,600"], ["", ""], ["0", "0"]
    ]);
  });

  test("a decimal a hunter typed is never truncated", async ({ page }) => {
    await bootAsGuest(page);
    /* the FX rate needs more than 2 places; silently cutting it would be data loss */
    expect(await page.evaluate(() => moneyGroup("12634.5678"))).toBe("12,634.5678");
  });

  test("the caret stays where the hunter put it", async ({ page }) => {
    await bootAsGuest(page);
    await page.evaluate(() => { state.level = 90; save(); switchPage("budget"); });
    await page.waitForTimeout(400);
    await page.type("#txAmount", "12345", { delay: 20 });
    /* typing left to right must leave the caret at the end, not jump home */
    expect(await page.evaluate(() => document.getElementById("txAmount").selectionStart)).toBe(6);
    expect(await page.inputValue("#txAmount")).toBe("12,345");
  });

  test("the suggested FX rate survives being read back", async ({ page }) => {
    await bootAsGuest(page);
    /* this is the exact bug the change could cause: +"12,600" is NaN, so any
       code still reading a money field raw would silently ruin the budget */
    const r = await page.evaluate(() => {
      openFxModal("so'm", "$");
      return { shown: document.getElementById("fxRate").value, parsed: moneyNum("fxRate"), raw: +document.getElementById("fxRate").value };
    });
    expect(r.shown).toBe("12,600");
    expect(r.parsed).toBe(12600);
    expect(Number.isNaN(r.raw)).toBe(true);   /* proof the raw read is the trap */
  });

  test("every money field is a grouped text field, not a bare number box", async ({ page }) => {
    await bootAsGuest(page);
    const fields = await page.evaluate(() =>
      ["txAmount", "txmAmount", "goalTarget", "wishPrice", "fxRate"].map((id) => {
        const el = document.getElementById(id);
        return { id: id, money: el.hasAttribute("data-money"), mode: el.getAttribute("inputmode") };
      }));
    fields.forEach((f) => {
      expect(f.money).toBe(true);
      expect(f.mode).toBe("decimal");   /* still a numeric keypad on a phone */
    });
  });
});

test.describe("the to-do list", () => {
  test("a to-do is written and ticked without a single choice being made", async ({ page }) => {
    await bootAsGuest(page);
    await page.evaluate(() => { qTab = "todo"; switchPage("quests"); });
    await page.waitForTimeout(300);
    await page.fill("#tdInput", "Call the bank");
    await page.press("#tdInput", "Enter");
    await page.waitForTimeout(200);

    const td = await page.evaluate(() => state.todos[0]);
    expect(td.text).toBe("Call the bank");
    expect(td.date).toBe(await page.evaluate(() => todayStr()));
    /* nothing from the quest economy leaked in */
    expect(td.tier).toBe(undefined);
    expect(td.link).toBe(undefined);
    expect(td.target).toBe(undefined);
    expect(await page.locator("#tdList .td-row").count()).toBe(1);
  });

  test("ticking pays flat XP once, and it cannot be farmed by ticking twice", async ({ page }) => {
    await bootAsGuest(page);
    const r = await page.evaluate(() => {
      state.xpDebt = 0; state.todos = [makeTodo("Buy strings", todayStr())];
      qTab = "todo"; switchPage("quests");
      const before = state.totalXp;
      const id = state.todos[0].id;
      toggleTodo(id);
      const afterFirst = state.totalXp;
      toggleTodo(id); toggleTodo(id); toggleTodo(id); toggleTodo(id);
      return { gained: afterFirst - before, total: state.totalXp - before, done: state.todos[0].done };
    });
    await drainAnnouncements(page);
    expect(r.gained).toBe(10);
    expect(r.total).toBe(10);   /* four more toggles paid nothing */
  });

  test("a to-do never becomes a trophy and never counts toward rank", async ({ page }) => {
    await bootAsGuest(page);
    const r = await page.evaluate(() => {
      state.honors = []; state.history = {};
      state.todos = [makeTodo("Buy milk", todayStr())];
      const clearedBefore = rkCleared();
      toggleTodo(state.todos[0].id);
      return { honors: state.honors.length, clearedBefore: clearedBefore, clearedAfter: rkCleared() };
    });
    await drainAnnouncements(page);
    expect(r.honors).toBe(0);
    expect(r.clearedAfter).toBe(r.clearedBefore);
  });

  test("a to-do whose day passed lands in the Hall of Shame", async ({ page }) => {
    await bootAsGuest(page);
    const r = await page.evaluate(() => {
      state.todos = [
        makeTodo("Renew the passport", addDays(todayStr(), -9)),
        makeTodo("Book the dentist", addDays(todayStr(), -3)),
        makeTodo("Today's thing", todayStr()),
        makeTodo("Next week", addDays(todayStr(), 7))
      ];
      state.todos[1].done = true;          /* done, so not shameful */
      switchPage("honor");
      openShame();
      return {
        overdue: todosOverdue().map((x) => x.text),
        rows: document.querySelectorAll("#shList .sh-row").length,
        btn: document.getElementById("shameBtn").textContent
      };
    });
    await drainAnnouncements(page);
    expect(r.overdue).toEqual(["Renew the passport"]);
    expect(r.rows).toBe(1);
    expect(r.btn).toContain("1");
  });

  test("shame is escaped by doing the thing, and the oldest is listed first", async ({ page }) => {
    await bootAsGuest(page);
    const r = await page.evaluate(() => {
      state.todos = [
        makeTodo("Newer miss", addDays(todayStr(), -2)),
        makeTodo("Oldest miss", addDays(todayStr(), -20))
      ];
      openShame();
      const order = todosOverdue().map((x) => x.text);
      todoToToday(state.todos[1].id);
      return { order: order, left: todosOverdue().map((x) => x.text), movedTo: state.todos[1].date };
    });
    await drainAnnouncements(page);
    expect(r.order).toEqual(["Oldest miss", "Newer miss"]);
    expect(r.left).toEqual(["Newer miss"]);
    expect(r.movedTo).toBe(await page.evaluate(() => todayStr()));
  });

  test("the calendar shows a day's to-dos behind their own button", async ({ page }) => {
    await bootAsGuest(page);
    await page.evaluate(() => {
      state.todos = [makeTodo("Pick up parcel", todayStr()), makeTodo("Write letter", todayStr())];
      state.todos[0].done = true;
      save();
      switchPage("quests");
      qcOpen();
      qcOpenDay(todayStr());
    });
    await page.waitForTimeout(300);
    expect(await page.textContent("#qcTdBtn")).toContain("1 / 2");
    /* it is behind the button, not dumped into the day */
    expect(await page.locator("#qcTdList").isVisible()).toBe(false);
    await page.click("#qcTdBtn");
    await page.waitForTimeout(200);
    expect(await page.locator("#qcTdList").isVisible()).toBe(true);
    const rows = await page.evaluate(() =>
      Array.from(document.querySelectorAll("#qcTdList .qc-row")).map((r) => r.className));
    expect(rows.length).toBe(2);
    expect(rows.some((c) => c.includes("done"))).toBe(true);
  });

  test("one-time goals went back to the quest log and are not to-dos", async ({ page }) => {
    await bootAsGuest(page);
    const r = await page.evaluate(() => {
      state.quests = [makeQuest("🎸", "Buy a guitar", "d", "longterm", [], "epic", "END", "", false, 1)];
      qTab = "quests";
      renderQuests();
      return {
        inLog: Array.from(document.querySelectorAll("#questList .quest-card .q-name")).map((e) => e.textContent.trim()),
        tabs: Array.from(document.querySelectorAll("#qTabs .qtab")).map((b) => b.getAttribute("data-tab"))
      };
    });
    expect(r.inLog).toContain("Buy a guitar");
    expect(r.tabs).toEqual(["quests", "calendar", "todo", "challenges"]);
  });

  test("an older save with no to-do list at all still opens", async ({ page }) => {
    await bootAsGuest(page);
    const r = await page.evaluate(() => {
      const old = JSON.parse(localStorage.getItem(SKEY));
      delete old.todos;
      localStorage.setItem(SKEY, JSON.stringify(old));
      load();
      return { isArray: Array.isArray(state.todos), len: state.todos.length };
    });
    expect(r.isArray).toBe(true);
    expect(r.len).toBe(0);
  });
});
