/* THE SYSTEM MENTOR (README 4x).
   On the device, the Mentor reads the hero's real record and answers in three
   languages; it suggests habits that become quests only through the normal
   NEW QUEST window. Mentor AI is optional: it asks first, sends only a short
   summary, needs Google sign-in, falls back to the device whenever anything
   is off, and never sees a health or safety question. The Worker itself has
   its own spec (ai-proxy.spec.js). */
const fs = require("fs");
const path = require("path");
const { test, expect } = require("@playwright/test");
const { bootAsGuest } = require("./helpers");

const AI_URL = "https://mentor.test/chat";
const CORS = { "access-control-allow-origin": "*", "access-control-allow-headers": "Authorization, Content-Type", "access-control-allow-methods": "POST, OPTIONS" };
const ready = (page) => page.waitForFunction(() => typeof window.state === "object" && window.state !== null && typeof window.switchPage === "function");

/* a fake Worker: records what the app sends and answers as told */
async function fakeWorker(page, reply) {
  const seen = [];
  await page.route("https://mentor.test/**", async (route) => {
    const req = route.request();
    if (req.method() === "OPTIONS") return route.fulfill({ status: 204, headers: CORS });
    seen.push({ headers: req.headers(), body: req.postDataJSON() });
    const r = typeof reply === "function" ? reply(seen.length) : reply;
    if (r === "abort") return route.abort();
    return route.fulfill({ status: r.status || 200, headers: Object.assign({ "content-type": "application/json" }, CORS), body: JSON.stringify(r.body) });
  });
  return seen;
}
/* the Worker is "deployed" and the hero is signed in with Google */
async function aiReady(page, consent) {
  await page.evaluate((c) => {
    AI_PROXY_URL = "https://mentor.test/chat";
    cloudUser = { uid: "u1", getIdToken: () => Promise.resolve("tok-123") };
    state.aiConsent = c || "";
    save();
    switchPage("mentor");
  }, consent);
}
async function ask(page, q) {
  await page.fill("#mentorQ", q);
  await page.click("#mentorAsk");
}

/* a hero with six weeks of history: a strong reading habit, a shaky gym habit,
   empty Sundays, and a worse last week than the one before */
async function seedRecord(page) {
  await page.evaluate(() => {
    const t = todayStr();
    state.created = addDays(t, -40);
    state.history = {};
    for (let d = 1; d <= 40; d++) {
      const ds = addDays(t, -d), sun = new Date(ds + "T00:00:00").getDay() === 0;
      const c = sun ? 0 : (d <= 6 ? 1 : 4);
      if (c) state.history[ds] = { xp: c * 10, count: c };
    }
    const read = makeQuest("📖", "Read 10 pages", "", "daily", [], "easy", "INT", "", false, 30);
    const gym = makeQuest("💪", "Gym", "", "daily", [], "medium", "STR", "", false, 30);
    read.created = gym.created = state.created;
    for (let d = 1; d <= 14; d++) {
      const ds = addDays(t, -d);
      if (d !== 5) read.completions.push(ds);
      if (d % 5 === 0) gym.completions.push(ds);
    }
    read.completions.sort(); gym.completions.sort();
    read.streak = 4; read.lastCompleted = addDays(t, -1);
    state.quests.push(read, gym);
    state.stats = { INT: 12, STR: 4, CON: 8, END: 9 };
    save();
  });
}

test.describe("the on-device Mentor", () => {
  test.beforeEach(async ({ page }) => { await page.clock.setSystemTime(new Date("2026-06-17T12:00:00")); });

  test("reads the hero's real record: rates on due days, the weekly trend, the weak weekday, a streak to protect", async ({ page }) => {
    await bootAsGuest(page);
    await seedRecord(page);
    const r = await page.evaluate(() => ({
      plan: mentorPlan().map((x) => x.text),
      ins: mentorInsights().map((x) => x.text),
      rates: mQuests().filter((x) => !x.q.system).map((x) => x.q.name + " " + x.done + "/" + x.due),
      week: [mWeek(0).done, mWeek(1).done]
    }));
    expect(r.rates).toEqual(["Read 10 pages 13/14", "Gym 2/14"]);
    expect(r.week).toEqual([5, 24]);
    expect(r.plan[0]).toBe("Protect your 4-day streak on “Read 10 pages”. The smallest version counts.");
    expect(r.plan).toContain("Do “Gym” today, even a small version. It is your shakiest quest (2 of 14 days).");
    expect(r.ins).toContain("“Gym” was done on 2 of the 14 days it was due. Make it easier for a week (a smaller target, a fixed time) instead of skipping it.");
    expect(r.ins).toContain("5 quests in the last 7 days, down from 24. Pick one quest to protect this week.");
    expect(r.ins.some((s) => s.indexOf("your weakest is Sunday") !== -1)).toBe(true);
    /* the panel shows it, and the folded sections open with one tap */
    await page.evaluate(() => switchPage("mentor"));
    await expect(page.locator("#mentorInsights")).toContainText("TODAY'S PLAN");
    await expect(page.locator("#mentorInsights")).toContainText("Protect your 4-day streak");
    await expect(page.locator('.m-sec[data-sec="ins"] .m-sec-body')).toBeHidden();
    await page.click('.m-sec[data-sec="ins"] > summary');
    await expect(page.locator('.m-sec[data-sec="ins"] .m-sec-body')).toBeVisible();
    await expect(page.locator('.m-sec[data-sec="ins"]')).toContainText("down from 24");
    /* reading the record never writes to it */
    const before = await page.evaluate(() => JSON.stringify(state));
    await page.evaluate(() => { mentorPlan(); mentorInsights(); mentorSummary(); renderMentor(); });
    expect(await page.evaluate(() => JSON.stringify(state))).toBe(before);
  });

  test("a brand-new hero is not scolded for days before they started", async ({ page }) => {
    await bootAsGuest(page);
    const ins = await page.evaluate(() => mentorInsights().map((x) => x.text).join(" | "));
    expect(ins).not.toContain("were empty");
    expect(ins).toContain("I learn from your record");
  });

  test("answers in English, Russian and Uzbek, and names a quest the hero already has", async ({ page }) => {
    await bootAsGuest(page);
    await seedRecord(page);
    const r = await page.evaluate(() => {
      const out = {};
      out.en = mentorAnswer("How do I read more books?");
      out.focus = mentorAnswer("I get distracted all the time").text;
      out.review = mentorAnswer("how am I doing?").text.split("\n")[0];
      out.plan = mentorAnswer("what should I do today").kind;
      state.lang = "ru";
      out.ru = mentorAnswer("как мне лучше спать?").text;
      out.ruReview = mentorAnswer("как у меня дела?").text.split("\n")[0];
      state.lang = "uz";
      out.uz = mentorAnswer("Kitob oʻqishni qanday odat qilaman?").text;
      out.uzApos = mentorAnswer("kitob o'qish").kind;
      out.none = mentorAnswer("zxqv").kind;
      state.lang = "en";
      return out;
    });
    expect(r.en.kind).toBe("kb");
    expect(r.en.text).toContain("To read more");
    expect(r.en.text).toContain("You already have “Read 10 pages”: done on 13 of the last 14 due days.");
    expect(r.en.quest).toBe(null); /* no second reading quest is offered */
    expect(r.focus.startsWith("To improve focus: (1)")).toBe(true);
    expect(r.review).toBe("Last 7 days: 5 quests on 5 of 7 days, 50 XP, 0 focus minutes.");
    expect(r.plan).toBe("plan");
    expect(r.ru.startsWith("Чтобы лучше спать: (1)")).toBe(true);
    expect(r.ruReview).toBe("За 7 дней: 5 квестов в 5 из 7 дней, 50 XP, 0 мин фокуса.");
    expect(r.uz.startsWith("Koʻproq oʻqish uchun: (1)")).toBe(true);
    expect(r.uzApos).toBe("kb"); /* o' typed with a plain apostrophe still matches */
    expect(r.none).toBe("none");
  });

  test("safety comes first: crisis, eating distress and diet questions get a careful fixed answer", async ({ page }) => {
    await bootAsGuest(page);
    const r = await page.evaluate(() => [
      "I want to kill myself", "i don't want to live anymore and want to die", "I've been starving myself",
      "how many calories to lose weight?", "хочу умереть", "сколько калорий в день", "oʻzimni oʻldirmoqchiman", "parhez kerak",
      "how do I sleep better"
    ].map((q) => mentorAnswer(q).kind));
    expect(r).toEqual(["crisis", "crisis", "eating", "diet", "crisis", "diet", "crisis", "diet", "kb"]);
    const txt = await page.evaluate(() => ({ crisis: mentorAnswer("suicide").text, diet: mentorAnswer("diet plan").text }));
    expect(txt.crisis).toContain("emergency number");
    expect(txt.crisis).toContain("findahelpline.com");
    expect(txt.diet).toContain("I don't give numbers or diets");
    expect(txt.diet).not.toMatch(/\d+\s*(kcal|calories|kg)/i);
    /* the crisis answer names the emergency number in Uzbekistan, in every language */
    const t112 = await page.evaluate(() => ["en", "ru", "uz"].map((l) => { state.lang = l; return MT("crisis"); }));
    await page.evaluate(() => { state.lang = "en"; });
    expect(t112[0]).toContain("In Uzbekistan, call 112 (ambulance: 103).");
    expect(t112[1]).toContain("В Узбекистане звоните 112 (скорая помощь: 103).");
    expect(t112[2]).toContain("Oʻzbekistonda 112 ga qoʻngʻiroq qiling (tez yordam: 103).");
    t112.forEach((x) => expect(x).toContain("findahelpline.com"));
    /* the on-screen crisis answer is marked, and offers no quest */
    await page.evaluate(() => switchPage("mentor"));
    await ask(page, "I want to hurt myself");
    await expect(page.locator("#mentorAnswer .m-ans.m-care")).toBeVisible();
    await expect(page.locator("#mentorAnswer [data-mq='ans']")).toHaveCount(0);
  });

  test("the safety walls read Uzbek in Cyrillic, missing apostrophes, food restriction and body numbers", async ({ page }) => {
    await bootAsGuest(page);
    const r = await page.evaluate(() => {
      const kinds = (list) => list.map((q) => mentorAnswer(q).kind);
      return {
        unsafe: kinds([
          "Ўзимни ўлдирмоқчиман", "ozimni oldirmoqchiman", "o`zimni o`ldiraman", "Men olmoqchiman", "ozimga zarar yetkazdim", "uyda zoravonlik bor",
          "Овқат емаяпман, оч қоляпман", "ПАРҲЕЗ керак", "vaznni qanday tashlash", "I weigh 45 kg, is that ok?", "is it ok to skip dinner", "сколько ккал: 1200 ккал"
        ]),
        safe: kinds(["IELTSdan 7 ball olmoqchiman", "dam olmoqchiman", "maslahat olmoqchiman", "мне есть чем заняться вечером", "how do I run 5 km?", "kitob oʻqishni qanday odat qilaman", "how do I sleep better"]),
        norm: [mSafeNorm("  Ўзимни   ЎЛДИРМОҚЧИМАН "), mSafeNorm("Ёлка, o‘zim ‘o’ʼ`´"), mSafeNorm("Привет, ёж")]
      };
    });
    expect(r.unsafe).toEqual(["crisis", "crisis", "crisis", "crisis", "crisis", "crisis", "eating", "diet", "diet", "diet", "diet", "diet"]);
    r.safe.forEach((k) => expect(["crisis", "eating", "diet"]).not.toContain(k));
    /* Uzbek Cyrillic becomes Latin, apostrophes go, Russian stays Russian */
    expect(r.norm).toEqual(["ozimni oldirmoqchiman", "елка, ozim o", "привет, еж"]);
  });

  test("a suggested habit becomes a quest only through NEW QUEST, within the slot rules", async ({ page }) => {
    await bootAsGuest(page);
    await page.evaluate(() => switchPage("mentor"));
    await page.click('.m-sec[data-sec="try"] > summary');
    const btn = page.locator('.m-sec[data-sec="try"] [data-mq="habit"]').first();
    await expect(btn).toBeVisible();
    const count = await page.evaluate(() => state.quests.length);
    await btn.click();
    await expect(page.locator("#questModal")).toHaveClass(/show/);
    const m = await page.evaluate(() => ({ name: document.getElementById("qmName").value, freq: qmSel.freq, target: document.getElementById("qmTarget").value, n: state.quests.length }));
    expect(m.name.length).toBeGreaterThan(3);
    expect(m.freq).toBe("longterm"); /* a new hero has no recurring slot yet, so it starts as a 7-step goal */
    expect(m.target).toBe("7");
    expect(m.n).toBe(count); /* nothing was added by opening the window */
    await page.click("#qmSave");
    const q = await page.evaluate(() => state.quests[state.quests.length - 1]);
    expect(q.name).toBe(m.name);
    expect(q.freq).toBe("longterm");
    expect(q.target).toBe(7);
    /* with a free slot it is a daily quest */
    await page.evaluate(() => { state.questSlots = 3; save(); mentorMakeQuest(MENTOR_HABITS[0]); });
    expect(await page.evaluate(() => qmSel.freq)).toBe("daily");
    await page.evaluate(() => document.getElementById("questModal").classList.remove("show"));
    /* and an answer offers its own quest */
    await ask(page, "how do I sleep better?");
    await page.click("#mentorAnswer [data-mq='ans']");
    expect(await page.evaluate(() => document.getElementById("qmName").value)).toBe("No screens 1 hour before bed");
  });

  test("TODAY shows the Mentor's first step once FIRST STEPS is out of the way", async ({ page }) => {
    await bootAsGuest(page);
    await expect(page.locator("#todayMentor")).toBeHidden(); /* one tip at a time */
    await page.evaluate(() => { state.firstStepsDismissed = true; save(); renderHome(); });
    await expect(page.locator("#todayMentor")).toBeVisible();
    await expect(page.locator("#todayMentor")).toContainText("Mentor:");
    await page.click("#todayMentor");
    expect(await page.evaluate(() => currentPage)).toBe("mentor");
  });

  test("every Mentor sentence exists in English, Russian and Uzbek, in the right script", async ({ page }) => {
    await bootAsGuest(page);
    const r = await page.evaluate(() => {
      const items = [];
      Object.keys(MENTOR_TXT).forEach((k) => items.push(["txt." + k, MENTOR_TXT[k]]));
      MENTOR_KB.forEach((e, i) => { if (e.a) items.push(["kb." + i, e.a]); if (e.q) items.push(["kbq." + i, e.q.n]); });
      MENTOR_HABITS.forEach((h, i) => { items.push(["habit." + i, h.n]); items.push(["habitd." + i, h.d]); });
      Object.keys(MENTOR_STAT).forEach((k) => items.push(["stat." + k, MENTOR_STAT[k]]));
      const bad = [];
      items.forEach(([id, o]) => {
        ["en", "ru", "uz"].forEach((l) => { if (typeof o[l] !== "string" || !o[l].trim()) bad.push(id + " missing " + l); });
        if (/[OoGg]['‘’`]/.test(o.uz || "")) bad.push(id + " uz apostrophe");
        if (/[Ѐ-ӿ]/.test(o.uz || "")) bad.push(id + " uz cyrillic");
        if (/[Ѐ-ӿ]/.test(o.en || "")) bad.push(id + " en cyrillic");
        const vars = (s) => (String(s).match(/\{\w+\}/g) || []).sort().join();
        if (vars(o.ru) !== vars(o.en) || vars(o.uz) !== vars(o.en)) bad.push(id + " placeholders differ");
      });
      return { n: items.length, bad };
    });
    expect(r.n).toBeGreaterThan(120);
    expect(r.bad).toEqual([]);
  });
});

test.describe("Mentor AI", () => {
  test("stays hidden until the Worker is deployed, and nothing is sent", async ({ page }) => {
    await bootAsGuest(page);
    const seen = await fakeWorker(page, { body: { answer: "x", left: 2, limit: 3 } });
    await page.evaluate(() => { cloudUser = { uid: "u1", getIdToken: () => Promise.resolve("t") }; state.aiConsent = "yes"; switchPage("mentor"); });
    expect(await page.evaluate(() => AI_PROXY_URL)).toBe("");
    await expect(page.locator("#mentorMode")).toContainText("Nothing leaves this device");
    await expect(page.locator("#mentorMode button")).toHaveCount(0);
    await ask(page, "how do I focus?");
    await expect(page.locator("#mentorAnswer")).toContainText("To improve focus");
    expect(seen.length).toBe(0);
  });

  test("asks first, says exactly what is sent, and NO keeps everything on the device", async ({ page }) => {
    await bootAsGuest(page);
    const seen = await fakeWorker(page, { body: { answer: "x", left: 2, limit: 3 } });
    await aiReady(page, "");
    await expect(page.locator("#mentorMode")).toContainText("TURN ON MENTOR AI");
    await ask(page, "how do I focus?");
    await expect(page.locator("#aiConsentModal")).toHaveClass(/show/);
    const body = await page.locator("#aiConsentBody").innerText();
    expect(body).toContain("Never sent: your name, the Oath");
    expect(body).toContain("Gemma");
    expect(body).toContain("3 questions a day");
    expect(body).toContain("not medical advice");
    expect(body).toContain("under 18");
    await expect(page.locator("#mentorAnswer")).toContainText("To improve focus"); /* the device answered meanwhile */
    await page.click("#aiConsentNo");
    expect(await page.evaluate(() => state.aiConsent)).toBe("no");
    await ask(page, "how do I sleep?");
    await expect(page.locator("#aiConsentModal")).not.toHaveClass(/show/);
    expect(seen.length).toBe(0);
  });

  test("YES sends only the question and a short summary, with the sign-in, and shows the answer with its warning", async ({ page }) => {
    await bootAsGuest(page);
    await seedRecord(page);
    await page.evaluate(() => {
      state.hunterName = "Zebra Secretname";
      state.oath.words = "my private oath words";
      save();
    });
    const seen = await fakeWorker(page, { body: { answer: "**Read** after dinner.\n- Keep the book on your desk.", left: 2, limit: 3 } });
    await aiReady(page, "");
    await ask(page, "How can I keep my reading going?");
    await page.click("#aiConsentYes");
    await expect(page.locator("#mentorAnswer")).toContainText("Read after dinner.");
    await expect(page.locator("#mentorAnswer")).toContainText("• Keep the book on your desk.");
    await expect(page.locator("#mentorAnswer .m-src")).toContainText("Mentor AI · AI can be wrong. Not medical advice.");
    await expect(page.locator("#mentorMode")).toContainText("2 of 3 questions left today");
    expect(seen.length).toBe(1);
    const s = seen[0];
    expect(s.headers.authorization).toBe("Bearer tok-123");
    expect(Object.keys(s.body).sort()).toEqual(["ctx", "lang", "mode", "q", "turns"]);
    expect(s.body.mode).toBe("agent"); /* the Mentor agent is open by default (README 4z) */
    expect(s.body.q).toBe("How can I keep my reading going?");
    expect(s.body.lang).toBe("en");
    expect(s.body.ctx).toContain('"Read 10 pages" daily, INT, easy, 13/14');
    expect(s.body.ctx.length).toBeLessThanOrEqual(1500);
    const all = JSON.stringify(s.body);
    expect(all).not.toContain("Zebra");
    expect(all).not.toContain("my private oath words");
    expect(all).not.toContain("u1");
    /* the next question carries this exchange, so the AI can follow along */
    await ask(page, "And on weekends?");
    await expect.poll(() => seen.length).toBe(2);
    expect(seen[1].body.turns.map((t) => t.r)).toEqual(["u", "a"]);
    expect(seen[1].body.turns[0].t).toBe("How can I keep my reading going?");
    /* the conversation itself is never saved */
    expect(await page.evaluate(() => JSON.stringify(state).indexOf("weekends"))).toBe(-1);
  });

  test("when anything is off, the device answers: limit, server down, offline, signed out", async ({ page }) => {
    await bootAsGuest(page);
    let mode = "limit";
    const seen = await fakeWorker(page, () => mode === "limit" ? { status: 429, body: { error: "limit", left: 0, limit: 3 } }
      : mode === "busy" ? { status: 503, body: { error: "busy" } } : "abort");
    await aiReady(page, "yes");
    await ask(page, "how do I focus?");
    await expect(page.locator("#mentorAnswer")).toContainText("To improve focus");
    await expect(page.locator("#mentorAnswer .m-note")).toContainText("Today's AI questions are used up");
    await expect(page.locator("#mentorMode")).toContainText("0 of 3 questions left today");
    await ask(page, "how do I sleep?"); /* known to be used up: not even sent */
    await expect(page.locator("#mentorAnswer")).toContainText("To sleep better");
    expect(seen.length).toBe(1);

    await page.evaluate(() => { aiQuota = { day: "", left: null, limit: 0 }; });
    mode = "busy";
    await ask(page, "how do I read more?");
    await expect(page.locator("#mentorAnswer .m-note")).toContainText("busy or today's free allowance is used up");
    mode = "down";
    await ask(page, "how do I read more?");
    await expect(page.locator("#mentorAnswer .m-note")).toContainText("could not be reached");
    await expect(page.locator("#mentorAnswer")).toContainText("To read more");
    const sent = seen.length;

    await page.context().setOffline(true);
    await ask(page, "how do I focus?");
    await expect(page.locator("#mentorAnswer .m-note")).toContainText("You are offline");
    await page.context().setOffline(false);

    await page.evaluate(() => { cloudUser = null; renderMentorMode(); });
    await expect(page.locator("#mentorMode")).toContainText("needs Google sign-in");
    await ask(page, "how do I focus?");
    await expect(page.locator("#mentorAnswer [data-mq='signin']")).toBeVisible();
    expect(seen.length).toBe(sent);
  });

  test("health and safety questions never leave the device, even with AI on", async ({ page }) => {
    await bootAsGuest(page);
    const seen = await fakeWorker(page, { body: { answer: "x", left: 2, limit: 3 } });
    await aiReady(page, "yes");
    for (const q of ["I want to kill myself", "how many calories should I eat", "I keep skipping meals", "сколько белка мне нужно"]) {
      await ask(page, q);
      await expect(page.locator("#mentorAnswer .m-src")).toContainText("On-device");
    }
    await expect(page.locator("#mentorAnswer .m-note")).toContainText("never sent");
    expect(seen.length).toBe(0);
  });

  test("an unsafe Mentor AI answer is replaced by the on-device safety answer, with no actions", async ({ page }) => {
    await bootAsGuest(page);
    let reply = { body: { answer: "Easy: eat 800 kcal a day and you will feel light.", left: 2, limit: 3, actions: [{ t: "quest", name: "Drink water" }] } };
    const seen = await fakeWorker(page, () => reply);
    await aiReady(page, "yes");
    await ask(page, "How do I get more energy?");
    await expect(page.locator("#mentorAnswer")).toContainText("I don't give numbers or diets");
    await expect(page.locator("#mentorAnswer")).not.toContainText("800");
    await expect(page.locator("#mentorAnswer .m-src")).toContainText("On-device");
    await expect(page.locator("#mentorAnswer .ag-card")).toHaveCount(0);
    expect(await page.evaluate(() => mentorChat.length)).toBe(0); /* never carried into the next question */
    reply = { body: { answer: "Ба'зан ўзимни ўлдирмоқчиман деган фикр келади.", left: 1, limit: 3 } };
    await ask(page, "How do I stay calm before exams?");
    await expect(page.locator("#mentorAnswer .m-ans.m-care")).toBeVisible();
    await expect(page.locator("#mentorAnswer")).toContainText("112");
    /* a safe answer is still shown as it came */
    reply = { body: { answer: "Walk 2 km after school and read before bed.", left: 0, limit: 3 } };
    await ask(page, "How do I relax?");
    await expect(page.locator("#mentorAnswer")).toContainText("Walk 2 km after school");
    expect(seen.length).toBe(3);
  });

  test("the summary sent to Mentor AI leaves out unsafe quest and goal names", async ({ page }) => {
    await bootAsGuest(page);
    const s = await page.evaluate(() => {
      state.quests.push(
        makeQuest("🎯", "No food until 45 kg", "", "longterm", [], "easy", "END", "", false, 7),
        makeQuest("🎯", "Pass IELTS", "", "longterm", [], "easy", "INT", "", false, 7),
        makeQuest("💪", "300 push-ups", "", "daily", [], "easy", "STR", "", false, 30),
        makeQuest("🍽️", "Skip dinner", "", "daily", [], "easy", "END", "", false, 30),
        makeQuest("📖", "Read 10 pages", "", "daily", [], "easy", "INT", "", false, 30)
      );
      return mentorSummary();
    });
    expect(s).toContain('"Pass IELTS"');
    expect(s).toContain('"Read 10 pages"');
    for (const bad of ["45 kg", "No food", "push-ups", "Skip dinner"]) expect(s).not.toContain(bad);
  });

  test("TURN OFF stops sending at once", async ({ page }) => {
    await bootAsGuest(page);
    const seen = await fakeWorker(page, { body: { answer: "x", left: 2, limit: 3 } });
    await aiReady(page, "yes");
    await page.click("#mentorMode [data-mq='ai-off']");
    expect(await page.evaluate(() => state.aiConsent)).toBe("no");
    await ask(page, "how do I focus?");
    await expect(page.locator("#mentorAnswer .m-src")).toContainText("On-device");
    expect(seen.length).toBe(0);
  });

  test("the Administrator can seal or remove Mentor AI on its own", async ({ page }) => {
    await bootAsGuest(page);
    const seen = await fakeWorker(page, { body: { answer: "x", left: 2, limit: 3 } });
    await aiReady(page, "yes");
    expect(await page.evaluate(() => featureConf("mentorAI") && featureConf("mentorAI").def)).toBe(0);
    for (const lock of [-1, 30]) {
      await page.evaluate((v) => { remoteSystemLocks = { mentorAI: v }; renderMentor(); }, lock);
      await expect(page.locator("#mentorPanel")).toBeVisible(); /* the on-device Mentor stays */
      await expect(page.locator("#mentorMode")).toContainText("Nothing leaves this device");
      await ask(page, "how do I focus?");
      await expect(page.locator("#mentorAnswer .m-src")).toContainText("On-device");
    }
    /* sealing the Mentor itself seals its page in MORE and hides the panel, AI included */
    await page.evaluate(() => { remoteSystemLocks = { mentor: 30 }; renderNav(); renderMentor(); });
    await expect(page.locator("#mentorPanel")).toBeHidden();
    await expect(page.locator('#moreList .more-row[data-page="mentor"]')).toHaveAttribute("data-locklv", "30");
    await page.evaluate(() => { state.firstStepsDismissed = true; switchPage("home"); renderHome(); });
    await expect(page.locator("#todayMentor")).toBeHidden(); /* and TODAY does not point at a sealed page */
    expect(seen.length).toBe(0);
  });

  test("the consent window speaks Russian and Uzbek", async ({ page }) => {
    await bootAsGuest(page);
    for (const [lang, title, no] of [["ru", "🤖 ИИ-НАСТАВНИК: ПРЕЖДЕ ЧЕМ НАЧАТЬ", "НЕТ, ТОЛЬКО НА УСТРОЙСТВЕ"], ["uz", "🤖 SI-MURABBIY: BOSHLASHDAN OLDIN", "YOʻQ, FAQAT QURILMADA"]]) {
      await page.evaluate((l) => { state.lang = l; save(); }, lang);
      await page.reload({ waitUntil: "domcontentloaded" });
      await ready(page);
      await page.evaluate(() => { document.getElementById("entranceOv").classList.remove("show"); AI_PROXY_URL = "https://mentor.test/chat"; switchPage("mentor"); openAiConsent(); });
      await expect(page.locator("#aiConsentTitle")).toHaveText(title);
      await expect(page.locator("#aiConsentNo")).toHaveText(no);
      await page.evaluate(() => closeAiConsent());
    }
  });

  test("an old save gets the new field and keeps everything", async ({ page }) => {
    await bootAsGuest(page);
    await page.evaluate(() => {
      const old = JSON.parse(JSON.stringify(state));
      delete old.aiConsent;
      old.hunterName = "Old Mentor Save";
      old.totalXp = 777;
      old.saveCount = (state.saveCount || 0) + 500;
      localStorage.setItem("leveluphunter_v1", JSON.stringify(old));
    });
    await page.reload({ waitUntil: "domcontentloaded" });
    await ready(page);
    expect(await page.evaluate(() => ({ c: state.aiConsent, n: state.hunterName, x: state.totalXp })))
      .toEqual({ c: "", n: "Old Mentor Save", x: 777 });
  });

  test("the public page holds no key: only the Worker's address, which is not a secret", async () => {
    const src = fs.readFileSync(path.resolve(__dirname, "..", "index.html"), "utf8");
    expect(src).toMatch(/var AI_PROXY_URL = "(https:\/\/[a-z0-9.-]+\.workers\.dev\/?[a-z0-9/-]*)?";/);
    expect(src).not.toMatch(/sk-ant-|api\.anthropic\.com|api\.cloudflare\.com|CLOUDFLARE_API|x-api-key|Bearer [A-Za-z0-9_-]{12,}/i);
    expect(src).not.toMatch(/@cf\/[a-z]/); /* the model is chosen by the Worker, not by the page */
  });
});
