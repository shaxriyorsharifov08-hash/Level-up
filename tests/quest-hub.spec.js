/* QUESTS opens on four squares. The rule they must never break: the squares
   are a selector, not a doorway — the quest list is already underneath, so
   the daily case is still one tap from the dock. */
const { test, expect } = require("@playwright/test");
const { bootAsGuest } = require("./helpers");

/* three recurring quests, two goals (one achieved), one challenge */
async function seed(page) {
  await page.evaluate(() => {
    state.quests = [];
    const mk = (name, freq, days) => {
      const q = makeQuest("⚔", name, "d", freq, days || [], "easy", "END", "", false, 1);
      state.quests.push(q);
      return q;
    };
    mk("Run", "daily");
    mk("Review", "weekly");
    mk("Gym", "custom", [0, 1, 2, 3, 4, 5, 6]);
    mk("Buy a guitar", "longterm");
    mk("Pass the exam", "longterm").done = true;
    mk("30 days sober", "challenge").streak = 9;
    state.questSlots = 10;
    save();
    switchPage("quests");
  });
  await page.waitForTimeout(300);
}

test.describe("the quest hub", () => {
  test("four squares, and QUESTS is the one already open", async ({ page }) => {
    await bootAsGuest(page);
    await seed(page);
    const tabs = await page.evaluate(() =>
      Array.from(document.querySelectorAll("#qTabs .qtab")).map((b) => ({
        key: b.getAttribute("data-tab"),
        name: b.querySelector(".qtab-name").textContent,
        active: b.classList.contains("active")
      })));
    expect(tabs.map((t) => t.key)).toEqual(["quests", "calendar", "goals", "challenges"]);
    expect(tabs.find((t) => t.key === "quests").active).toBe(true);
    expect(tabs.filter((t) => t.active).length).toBe(1);
  });

  test("the quest list is rendered underneath, not behind another tap", async ({ page }) => {
    await bootAsGuest(page);
    await seed(page);
    /* no click at all: the recurring quests are already on screen */
    const names = await page.evaluate(() =>
      Array.from(document.querySelectorAll("#questList .quest-card .q-name")).map((e) => e.textContent.trim()));
    expect(names).toContain("Run");
    expect(names).toContain("Review");
    expect(names).toContain("Gym");
    expect(await page.locator("#questList").isVisible()).toBe(true);
  });

  test("one-time goals are out of the quest log and live on their own square", async ({ page }) => {
    await bootAsGuest(page);
    await seed(page);
    const onQuests = await page.evaluate(() =>
      Array.from(document.querySelectorAll("#questList .quest-card .q-name")).map((e) => e.textContent.trim()));
    expect(onQuests).not.toContain("Buy a guitar");
    expect(onQuests).not.toContain("Pass the exam");
    expect(onQuests).not.toContain("30 days sober");

    await page.click('#qTabs .qtab[data-tab="goals"]');
    await page.waitForTimeout(250);
    const onGoals = await page.evaluate(() =>
      Array.from(document.querySelectorAll("#questList .quest-card .q-name")).map((e) => e.textContent.trim()));
    expect(onGoals).toContain("Buy a guitar");
    expect(onGoals).toContain("Pass the exam");
    expect(onGoals).not.toContain("Run");
  });

  test("challenges have their own square too", async ({ page }) => {
    await bootAsGuest(page);
    await seed(page);
    await page.click('#qTabs .qtab[data-tab="challenges"]');
    await page.waitForTimeout(250);
    const names = await page.evaluate(() =>
      Array.from(document.querySelectorAll("#questList .quest-card .q-name")).map((e) => e.textContent.trim()));
    expect(names).toEqual(["30 days sober"]);
  });

  test("every quest in the log is reachable from exactly one square", async ({ page }) => {
    await bootAsGuest(page);
    await seed(page);
    const seen = await page.evaluate(() => {
      const found = {};
      ["quests", "goals", "challenges"].forEach((t) => {
        qTab = t;
        renderQuests();
        document.querySelectorAll("#questList .quest-card[data-qid]").forEach((c) => {
          const id = c.getAttribute("data-qid");
          found[id] = (found[id] || 0) + 1;
        });
      });
      return { counts: Object.values(found), total: Object.keys(found).length, quests: state.quests.length };
    });
    expect(seen.total).toBe(seen.quests);          /* nothing is stranded */
    expect(seen.counts.every((c) => c === 1)).toBe(true); /* and nothing is duplicated */
  });

  test("a quest with an unexpected frequency is never stranded off every square", async ({ page }) => {
    await bootAsGuest(page);
    await seed(page);
    /* the app has been reshaped before and will be again; a quest carrying a
       frequency no square claims must still be findable, not silently lost */
    const shown = await page.evaluate(() => {
      const q = makeQuest("\u2753", "Written by a future version", "d", "fortnightly",
        [], "easy", "END", "", false, 1);
      state.quests.push(q);
      save();
      qTab = "quests";
      renderQuests();
      return Array.from(document.querySelectorAll("#questList .quest-card .q-name")).map((e) => e.textContent.trim());
    });
    expect(shown).toContain("Written by a future version");
  });

  test("the squares carry live counts, not decoration", async ({ page }) => {
    await bootAsGuest(page);
    await seed(page);
    const before = await page.textContent('#qTabs .qtab[data-tab="goals"] .qtab-meta');
    expect(before).toContain("1 open");
    expect(before).toContain("1 achieved");

    await page.evaluate(() => {
      state.quests.filter((q) => q.freq === "longterm").forEach((q) => { q.done = true; });
      save();
      renderQuests();
    });
    await page.waitForTimeout(200);
    const after = await page.textContent('#qTabs .qtab[data-tab="goals"] .qtab-meta');
    expect(after).toContain("0 open");
    expect(after).toContain("2 achieved");
  });

  test("the calendar square opens the calendar and does not become a tab", async ({ page }) => {
    await bootAsGuest(page);
    await seed(page);
    await page.click('#qTabs .qtab[data-tab="calendar"]');
    await page.waitForSelector("#qcOv.show");
    await page.click("#qcClose");
    await page.waitForTimeout(250);
    /* QUESTS is still the selected square — the calendar never steals it */
    expect(await page.evaluate(() => qTab)).toBe("quests");
  });

  test("a new goal is followed to its square instead of vanishing", async ({ page }) => {
    await bootAsGuest(page);
    await seed(page);
    const landed = await page.evaluate(() => {
      openQuestModal();
      qmSel.freq = "longterm";
      document.getElementById("qmName").value = "Learn to swim";
      document.getElementById("qmSave").click();
      return { tab: qTab, shown: Array.from(document.querySelectorAll("#questList .quest-card .q-name")).map((e) => e.textContent.trim()) };
    });
    expect(landed.tab).toBe("goals");
    expect(landed.shown).toContain("Learn to swim");
  });

  test("the frequency chips only appear where they mean something", async ({ page }) => {
    await bootAsGuest(page);
    await seed(page);
    const onQuests = await page.evaluate(() =>
      Array.from(document.querySelectorAll("#freqFilters .f-chip")).map((b) => b.getAttribute("data-f")));
    expect(onQuests).toEqual(["all", "daily", "weekly", "custom"]);
    expect(onQuests).not.toContain("longterm");

    await page.click('#qTabs .qtab[data-tab="goals"]');
    await page.waitForTimeout(250);
    expect(await page.locator("#freqFilters").isVisible()).toBe(false);
  });

  test("switching squares clears a filter that would hide everything", async ({ page }) => {
    await bootAsGuest(page);
    await seed(page);
    await page.click('#freqFilters .f-chip[data-f="weekly"]');
    await page.waitForTimeout(200);
    await page.click('#qTabs .qtab[data-tab="goals"]');
    await page.waitForTimeout(250);
    const names = await page.evaluate(() =>
      Array.from(document.querySelectorAll("#questList .quest-card .q-name")).map((e) => e.textContent.trim()));
    expect(names.length).toBeGreaterThan(0);
    expect(await page.evaluate(() => freqFilter)).toBe("all");
  });
});
