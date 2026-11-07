/* THE MENTOR AGENT (README 4z).
   The agent turns a request into proposed actions (a quest, a goal, a to-do,
   a focus session, a page to open). Plain commands are understood on the
   device in English, Russian and Uzbek; Mentor AI may propose actions too.
   Every action is a card, and nothing changes until the hero taps it and
   confirms in the app's usual window. Health and safety words never become
   actions, the Administrator can seal the agent on its own, and nothing new
   is saved. The Worker's side has its own tests in ai-proxy.spec.js. */
const { test, expect } = require("@playwright/test");
const { bootAsGuest } = require("./helpers");

const CORS = { "access-control-allow-origin": "*", "access-control-allow-headers": "Authorization, Content-Type", "access-control-allow-methods": "POST, OPTIONS" };

async function fakeWorker(page, reply) {
  const seen = [];
  await page.route("https://mentor.test/**", async (route) => {
    const req = route.request();
    if (req.method() === "OPTIONS") return route.fulfill({ status: 204, headers: CORS });
    seen.push({ body: req.postDataJSON() });
    return route.fulfill({ status: 200, headers: Object.assign({ "content-type": "application/json" }, CORS), body: JSON.stringify(reply) });
  });
  return seen;
}
async function aiReady(page) {
  await page.evaluate(() => {
    AI_PROXY_URL = "https://mentor.test/chat";
    cloudUser = { uid: "u1", getIdToken: () => Promise.resolve("tok-123") };
    state.aiConsent = "yes";
    save();
    switchPage("mentor");
  });
}
async function ask(page, q) {
  await page.fill("#mentorQ", q);
  await page.click("#mentorAsk");
}
const cards = (page) => page.locator("#mentorAnswer .ag-card");

test.describe("the Mentor agent", () => {
  test.beforeEach(async ({ page }) => { await page.clock.setSystemTime(new Date("2026-06-17T12:00:00")); });

  test("understands plain commands in English, Russian and Uzbek; questions stay questions", async ({ page }) => {
    await bootAsGuest(page);
    const r = await page.evaluate(() => {
      const c = (s) => agentParse(s);
      return {
        focus: c("focus 25 min on reading"), timer: c("set a timer for 10 minutes"), hour: c("pomodoro 1 hour"), start: c("start focus"),
        quest: c("add quest: read 20 pages every day"), weekly: c("new weekly habit: call grandma"),
        todo: c("add todo tomorrow: buy a notebook"), goal: c("goal: pass IELTS in 10 steps"), open: c("open stats"),
        ruFocus: c("фокус 25 минут на чтение"), ruQuest: c("добавь квест: читать 20 страниц каждый день"),
        ruTodo: c("задача на завтра: купить тетрадь"), ruGoal: c("цель: сдать IELTS"), ruOpen: c("открой статистику"),
        uzFocus: c("kitob oʻqishga 25 daqiqa fokus"), uzQuest: c("kvest qoʻsh: har kuni 20 bet kitob oʻqish"),
        uzEnd: c("suv ichish odatini qoʻsh"), uzTodo: c("vazifa ertaga: daftar sotib olish"), uzGoal: c("maqsad: IELTS topshirish"), uzOpen: c("statistikani och"),
        two: c("focus 25 min; add todo: email teacher"),
        questions: ["how do I focus", "focus", "I can't focus for 10 minutes", "show me how to focus", "add quest: what?", "как мне сосредоточиться", "kitob oʻqishni qanday odat qilaman"].map((q) => c(q).length)
      };
    });
    expect(r.focus).toEqual([{ t: "focus", min: 25, on: "reading" }]);
    expect(r.timer[0].min).toBe(10);
    expect(r.hour[0].min).toBe(60);
    expect(r.start).toEqual([{ t: "focus", min: 25, on: "" }]);
    expect(r.quest).toEqual([{ t: "quest", name: "Read 20 pages", stat: "INT", freq: "daily" }]);
    expect(r.weekly).toEqual([{ t: "quest", name: "Call grandma", stat: "CON", freq: "weekly" }]);
    expect(r.todo).toEqual([{ t: "todo", text: "Buy a notebook", day: "tomorrow" }]);
    expect(r.goal).toEqual([{ t: "goal", name: "Pass IELTS", stat: "INT", target: 10 }]);
    expect(r.open).toEqual([{ t: "open", page: "stats" }]);
    expect(r.ruFocus).toEqual([{ t: "focus", min: 25, on: "чтение" }]);
    expect(r.ruQuest).toEqual([{ t: "quest", name: "Читать 20 страниц", stat: "INT", freq: "daily" }]);
    expect(r.ruTodo).toEqual([{ t: "todo", text: "Купить тетрадь", day: "tomorrow" }]);
    expect(r.ruGoal[0].name).toBe("Сдать IELTS");
    expect(r.ruOpen).toEqual([{ t: "open", page: "stats" }]);
    expect(r.uzFocus).toEqual([{ t: "focus", min: 25, on: "kitob o'qish" }]);
    expect(r.uzQuest).toEqual([{ t: "quest", name: "20 bet kitob oʻqish", stat: "INT", freq: "daily" }]);
    expect(r.uzEnd).toEqual([{ t: "quest", name: "Suv ichish", stat: "END", freq: "daily" }]);
    expect(r.uzTodo).toEqual([{ t: "todo", text: "Daftar sotib olish", day: "tomorrow" }]);
    expect(r.uzGoal[0].name).toBe("IELTS topshirish");
    expect(r.uzOpen).toEqual([{ t: "open", page: "stats" }]);
    expect(r.two.map((a) => a.t)).toEqual(["focus", "todo"]);
    expect(r.questions).toEqual([0, 0, 0, 0, 0, 0, 0]);
    /* a question still gets the Mentor's answer */
    await page.evaluate(() => switchPage("mentor"));
    await ask(page, "how do I focus?");
    await expect(page.locator("#mentorAnswer")).toContainText("To improve focus");
    await expect(cards(page)).toHaveCount(0);
  });

  test("a quest command shows a card; only NEW QUEST and SAVE add it, within the slot rules", async ({ page }) => {
    await bootAsGuest(page);
    await page.evaluate(() => { state.questSlots = 3; save(); switchPage("mentor"); });
    const before = await page.evaluate(() => JSON.stringify(state));
    await ask(page, "add quest: read 20 pages every day");
    await expect(page.locator("#mentorAnswer .m-src")).toContainText("On-device agent");
    await expect(page.locator("#mentorAnswer")).toContainText("Nothing changes until you tap a button");
    await expect(cards(page)).toHaveCount(1);
    await expect(cards(page).first()).toContainText("Read 20 pages");
    await expect(cards(page).first()).toContainText("Daily quest · Intelligence");
    expect(await page.evaluate(() => JSON.stringify(state))).toBe(before); /* a card changes nothing */
    await cards(page).first().locator("[data-mq='agent']").click();
    await expect(page.locator("#questModal")).toHaveClass(/show/);
    const m = await page.evaluate(() => ({ name: document.getElementById("qmName").value, freq: qmSel.freq, stat: qmSel.stat, emoji: qmSel.emoji }));
    expect(m).toEqual({ name: "Read 20 pages", freq: "daily", stat: "INT", emoji: "📖" });
    expect(await page.evaluate(() => JSON.stringify(state))).toBe(before); /* the window changes nothing either */
    await page.click("#qmSave");
    const q = await page.evaluate(() => state.quests[state.quests.length - 1]);
    expect([q.name, q.freq, q.stat]).toEqual(["Read 20 pages", "daily", "INT"]);
    /* a hero with no free slot gets it as a 7-step goal, as with the Mentor's suggestions */
    await page.evaluate(() => { state.questSlots = 0; save(); switchPage("mentor"); });
    await ask(page, "add quest: walk 5000 steps every day");
    await cards(page).first().locator("[data-mq='agent']").click();
    expect(await page.evaluate(() => [qmSel.freq, document.getElementById("qmTarget").value])).toEqual(["longterm", "7"]);
  });

  test("a goal opens NEW QUEST as a goal with its steps; a to-do fills the To-Do box for the right day", async ({ page }) => {
    await bootAsGuest(page);
    await page.evaluate(() => switchPage("mentor"));
    await ask(page, "goal: pass IELTS in 10 steps");
    await cards(page).first().locator("[data-mq='agent']").click();
    expect(await page.evaluate(() => [document.getElementById("qmName").value, qmSel.freq, document.getElementById("qmTarget").value, qmSel.emoji]))
      .toEqual(["Pass IELTS", "longterm", "10", "🎯"]);
    await page.click("#qmCancel");
    const n = await page.evaluate(() => state.quests.length);
    await page.evaluate(() => switchPage("mentor"));
    await ask(page, "todo tomorrow: buy a notebook");
    await expect(cards(page).first()).toContainText("To-do for tomorrow");
    const todos = await page.evaluate(() => state.todos.length);
    await cards(page).first().locator("[data-mq='agent']").click();
    const r = await page.evaluate(() => ({ page: currentPage, tab: qTab, text: document.getElementById("tdInput").value, day: document.getElementById("tdDate").value, tomorrow: addDays(todayStr(), 1), n: state.todos.length }));
    expect(r).toEqual({ page: "quests", tab: "todo", text: "Buy a notebook", day: r.tomorrow, tomorrow: "2026-06-18", n: todos });
    await page.click("#tdAdd");
    const td = await page.evaluate(() => state.todos[state.todos.length - 1]);
    expect([td.text, td.date]).toEqual(["Buy a notebook", r.tomorrow]);
    expect(await page.evaluate(() => state.quests.length)).toBe(n); /* the cancelled goal was never added */
  });

  test("focus picks the matching quest, starts only on START, for the asked minutes", async ({ page }) => {
    await bootAsGuest(page);
    await page.evaluate(() => {
      const read = makeQuest("📖", "Read 10 pages", "", "daily", [], "easy", "INT", "", false, 30);
      state.quests.push(read);
      state.todos.push(makeTodo("Email the teacher", todayStr()));
      save();
      switchPage("mentor");
    });
    await ask(page, "focus 40 min on reading");
    await expect(cards(page).first()).toContainText("Focus for 40 min");
    const sel = cards(page).first().locator("select.ag-sel");
    await expect(sel).toBeVisible();
    expect(await sel.evaluate((s) => s.options[s.selectedIndex].text)).toBe("📖 Read 10 pages");
    expect(await page.evaluate(() => state.activeTimer)).toBe(null);
    /* the hero may choose something else to time */
    await sel.selectOption({ label: "✅ Email the teacher" });
    await cards(page).first().locator("[data-mq='agent']").click();
    const tm = await page.evaluate(() => ({ name: state.activeTimer.name, goal: state.activeTimer.goalMin, mode: state.activeTimer.mode, dflt: fo().goalMin }));
    expect(tm).toEqual({ name: "Email the teacher", goal: 40, mode: "stopwatch", dflt: 25 }); /* the hero's default is untouched */
    await expect(page.locator("#focusOv")).toHaveClass(/show/);
    /* nothing to time, or the timer sealed: the card says so and has no button */
    const h = await page.evaluate(() => {
      const keep = [state.quests, state.todos];
      state.quests = []; state.todos = [];
      const empty = agentCardHtml({ t: "focus", min: 25, on: "" }, 0);
      state.quests = keep[0]; state.todos = keep[1];
      remoteSystemLocks = { timer: -1 };
      const sealed = agentCardHtml({ t: "focus", min: 25, on: "" }, 0);
      remoteSystemLocks = null;
      return { empty, sealed };
    });
    expect(h.empty).toContain("Nothing to time yet");
    expect(h.empty).not.toContain("data-mq");
    expect(h.sealed).toContain("The Focus Timer is not open yet");
    expect(h.sealed).not.toContain("data-mq");
  });

  test("open goes to the page, and a sealed page stays sealed", async ({ page }) => {
    await bootAsGuest(page);
    await page.evaluate(() => switchPage("mentor"));
    await ask(page, "open stats");
    await cards(page).first().locator("[data-mq='agent']").click();
    expect(await page.evaluate(() => currentPage)).toBe("mentor"); /* STATS opens at Level 4 */
    await page.evaluate(() => { remoteSystemLocks = { stats: 0 }; switchPage("mentor"); });
    await ask(page, "open stats");
    await cards(page).first().locator("[data-mq='agent']").click();
    expect(await page.evaluate(() => currentPage)).toBe("stats");
    await page.evaluate(() => switchPage("mentor"));
    await ask(page, "open my to-do");
    await cards(page).first().locator("[data-mq='agent']").click();
    expect(await page.evaluate(() => [currentPage, qTab])).toEqual(["quests", "todo"]);
  });

  test("health and safety words never become actions", async ({ page }) => {
    await bootAsGuest(page);
    await page.evaluate(() => switchPage("mentor"));
    await ask(page, "add quest: count calories every day");
    await expect(page.locator("#mentorAnswer")).toContainText("I don't give numbers or diets");
    await expect(cards(page)).toHaveCount(0);
    await ask(page, "add todo: starve myself");
    await expect(page.locator("#mentorAnswer .m-ans.m-care")).toBeVisible();
    await expect(cards(page)).toHaveCount(0);
    const cleaned = await page.evaluate(() => agentClean([
      { t: "quest", name: "Skip meals" }, { t: "todo", text: "ничего не ем весь день" }, { t: "goal", name: "Lose weight fast" },
      { t: "focus", on: "kill myself" }, { t: "quest", name: "Drink water" }
    ]));
    expect(cleaned).toEqual([{ t: "quest", name: "Drink water", stat: "END", freq: "daily" }]);
  });

  test("Mentor AI's proposals are checked again, shown as cards, and never applied by themselves", async ({ page }) => {
    await bootAsGuest(page);
    const seen = await fakeWorker(page, { answer: "Start with words, then one practice test a week.", left: 2, limit: 3, actions: [
      { t: "quest", name: "Learn 20 IELTS words", freq: "daily", stat: "INT" },
      { t: "delete", name: "all quests" },
      { t: "open", page: "admin" },
      { t: "quest", name: "y".repeat(300), freq: "weekly", stat: "STR" },
      { t: "focus", min: 9999 },
      { t: "todo", text: "Book the exam date", day: "today" },
      { t: "goal", name: "Pass IELTS", target: 12 }
    ] });
    await aiReady(page);
    const before = await page.evaluate(() => JSON.stringify(state));
    await ask(page, "Help me prepare for IELTS");
    await expect(page.locator("#mentorAnswer")).toContainText("Start with words");
    await expect(page.locator("#mentorAnswer .m-src")).toContainText("Mentor AI · AI can be wrong.");
    await expect(cards(page)).toHaveCount(5);
    const kinds = await cards(page).evaluateAll((els) => els.map((e) => e.getAttribute("data-ag")));
    expect(kinds).toEqual(["quest", "quest", "focus", "todo", "goal"]); /* no "delete", no admin page */
    expect(await page.evaluate(() => mentorLast.actions[1].name.length)).toBe(60);
    expect(await page.evaluate(() => mentorLast.actions[2].min)).toBe(120);
    expect(seen[0].body.mode).toBe("agent");
    expect(await page.evaluate(() => JSON.stringify(state))).toBe(before);
    /* a plain command is free: it is handled on the device and never sent */
    await ask(page, "focus 25 min");
    await expect(page.locator("#mentorAnswer .m-src")).toContainText("On-device agent");
    expect(seen.length).toBe(1);
  });

  test("a proposed name is shown as text, never run as HTML", async ({ page }) => {
    /* found by the reviewer's training drill (README 6b): nothing proved the cards escape their titles */
    await bootAsGuest(page);
    await page.evaluate(() => {
      switchPage("mentor");
      mentorShow({ kind: "ai", text: "Here is a plan.", q: "x", src: "ai", actions: agentClean([
        { t: "quest", name: "<img src=x onerror=window.__agentXss=1>" },
        { t: "todo", text: "fix the <div> bug" }
      ]) });
    });
    await expect(cards(page)).toHaveCount(2);
    await expect(cards(page).first()).toContainText("<img src=x onerror=window.__agentXss=1>");
    await expect(cards(page).nth(1)).toContainText("fix the <div> bug");
    expect(await page.locator("#mentorAnswer .ag-card img, #mentorAnswer .ag-card div div").count()).toBe(0);
    expect(await page.evaluate(() => window.__agentXss)).toBeUndefined();
  });

  test("the Administrator can seal or remove the agent on its own", async ({ page }) => {
    await bootAsGuest(page);
    expect(await page.evaluate(() => featureConf("mentorAgent") && featureConf("mentorAgent").def)).toBe(0);
    const seen = await fakeWorker(page, { answer: "Here is a plan.", left: 2, limit: 3, actions: [{ t: "quest", name: "Read", stat: "INT" }] });
    await page.evaluate(() => switchPage("mentor"));
    await expect(page.locator('.m-sec[data-sec="agent"]')).toBeVisible();
    for (const lock of [-1, 30]) {
      await page.evaluate((v) => { remoteSystemLocks = { mentorAgent: v }; renderMentor(); }, lock);
      await expect(page.locator("#mentorPanel")).toBeVisible(); /* the Mentor stays */
      await expect(page.locator('.m-sec[data-sec="agent"]')).toHaveCount(0);
      expect(await page.locator("#mentorQ").getAttribute("placeholder")).toContain("Ask: how to focus");
      await ask(page, "focus 25 min");
      await expect(page.locator("#mentorAnswer .m-src")).toContainText("On-device Mentor");
      await expect(cards(page)).toHaveCount(0);
    }
    /* with the agent sealed, Mentor AI is asked for a plain answer and its actions are ignored */
    await aiReady(page);
    await ask(page, "Help me read more");
    await expect(page.locator("#mentorAnswer")).toContainText("Here is a plan.");
    await expect(cards(page)).toHaveCount(0);
    expect(seen[0].body.mode).toBe("chat");
  });

  test("speaks Russian and Uzbek, the examples work, and nothing new is saved", async ({ page }) => {
    await bootAsGuest(page);
    const keys = await page.evaluate(() => Object.keys(state).sort().join());
    await page.evaluate(() => { state.lang = "ru"; save(); switchPage("mentor"); });
    await ask(page, "добавь квест: читать 20 страниц каждый день");
    await expect(cards(page).first()).toContainText("Ежедневный квест · Интеллект");
    await expect(cards(page).first().locator("[data-mq='agent']")).toHaveText("＋ ДОБАВИТЬ КВЕСТ");
    await page.evaluate(() => { state.lang = "uz"; save(); renderMentor(); });
    await expect(cards(page).first().locator("[data-mq='agent']")).toHaveText("＋ KVEST QOʻSHISH"); /* the card follows the language */
    await page.click('.m-sec[data-sec="agent"] > summary');
    await page.locator('.m-sec[data-sec="agent"] [data-mq="ex"]').nth(2).click(); /* "vazifa ertaga: daftar sotib olish" */
    await expect(cards(page).first()).toContainText("Ertangi vazifa");
    await page.evaluate(() => { state.lang = "en"; save(); });
    expect(await page.evaluate(() => Object.keys(state).sort().join())).toBe(keys);
  });
});
