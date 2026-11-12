/* FIRST-RUN TUTORIAL AND VIDEO GUIDE (README 4v).
   A new hero is shown around once, game-style: a spotlight, a tapping hand and
   Pixel's speech bubble. Some steps wait for the hero to press the highlighted
   control. The tour only points: it never completes anything for them. The
   one-minute video guide lives in MORE → GUIDE with subtitles in three
   languages. */
const fs = require("fs");
const path = require("path");
const { test, expect } = require("@playwright/test");
const { bootAsGuest } = require("./helpers");

const ROOT = path.resolve(__dirname, "..");
const ready = (page) => page.waitForFunction(() => typeof window.state === "object" && window.state !== null && typeof window.switchPage === "function");
const stepId = (page) => page.evaluate(() => (tourOn ? TOUR[tourIdx].id : null));

/* press NEXT until the step changes (the first press may only finish the typing) */
async function next(page) {
  const before = await page.evaluate(() => tourIdx);
  for (let i = 0; i < 3; i++) {
    await page.click("#tourNext");
    if (await page.evaluate((b) => tourIdx !== b || !tourOn, before)) return;
  }
  throw new Error("NEXT did not advance the tour");
}

async function bootIntoTour(page) {
  await bootAsGuest(page, { keepTour: true });
  await page.waitForSelector("#tourOv.show", { timeout: 10000 });
}

test.describe("the first-run tour", () => {
  test("a new hero is shown around after the welcome, and taught by doing", async ({ page }) => {
    await bootIntoTour(page);
    expect(await stepId(page)).toBe("hello");
    await expect(page.locator("#tourTitle")).toHaveText("Welcome, Hero!");
    await expect(page.locator("#tourIntro")).toBeVisible(); /* the animated mini-demo */
    const before = await page.evaluate(() => ({ xp: state.xp, done: state.totalCompleted }));

    for (const id of ["hero", "daily", "quests", "plus", "tabs", "goprog"]) {
      await next(page);
      expect(await stepId(page)).toBe(id);
    }
    /* a tap step waits for the highlighted control: NEXT is gone, other taps are held back */
    await expect(page.locator("#tourNext")).toBeHidden();
    await expect(page.locator("#tourHand")).toHaveClass(/show/);
    await page.click('#nav .nav-btn[data-tab="quests"]');
    expect(await page.evaluate(() => currentPage)).toBe("home");
    await page.click('#nav .nav-btn[data-tab="progress"]');
    await expect.poll(() => stepId(page)).toBe("prog");
    expect(await page.evaluate(() => currentPage)).toBe("story"); /* the hero lives on TODAY now (README 4y) */

    await next(page);
    expect(await stepId(page)).toBe("gomore");
    await page.click('#nav .nav-btn[data-tab="more"]');
    await expect.poll(() => stepId(page)).toBe("more");
    await expect(page.locator("#moreSheet")).toHaveClass(/show/);

    await next(page);
    expect(await stepId(page)).toBe("done");
    await expect(page.locator("#tourVideoBtn")).toBeVisible();
    await expect(page.locator("#moreSheet")).not.toHaveClass(/show/);
    await next(page); /* START PLAYING */
    await expect(page.locator("#tourOv")).not.toHaveClass(/show/);

    const after = await page.evaluate(() => ({ xp: state.xp, done: state.totalCompleted, flag: state.tutorialDone, page: currentPage }));
    expect(after).toEqual({ xp: before.xp, done: before.done, flag: true, page: "home" });

    /* and it is not shown again */
    await page.reload({ waitUntil: "domcontentloaded" });
    await ready(page);
    await page.waitForTimeout(2600);
    await expect(page.locator("#tourOv")).not.toHaveClass(/show/);
  });

  test("SKIP ends it at once, and GUIDE can replay it from the start", async ({ page }) => {
    await bootIntoTour(page);
    await next(page);
    await page.click("#tourSkip");
    await expect(page.locator("#tourOv")).not.toHaveClass(/show/);
    expect(await page.evaluate(() => state.tutorialDone)).toBe(true);
    await expect(page.locator(".toast").last()).toContainText("Replay it any time");
    await page.evaluate(() => switchPage("guide"));
    await page.click("#tourReplay");
    await expect(page.locator("#tourOv")).toHaveClass(/show/);
    expect(await stepId(page)).toBe("hello");
    expect(await page.evaluate(() => currentPage)).toBe("home");
    await page.keyboard.press("Escape"); /* Escape skips too */
    await expect(page.locator("#tourOv")).not.toHaveClass(/show/);
  });

  test("a hero who has already played never gets the tour", async ({ page }) => {
    await bootAsGuest(page);
    await page.evaluate(() => {
      const old = JSON.parse(JSON.stringify(state));
      delete old.tutorialDone; /* a save from before the tour existed */
      old.history[addDays(todayStr(), -3)] = { xp: 40, count: 2 };
      old.totalCompleted = 2;
      old.saveCount = (state.saveCount || 0) + 500;
      localStorage.setItem("leveluphunter_v1", JSON.stringify(old));
    });
    await page.reload({ waitUntil: "domcontentloaded" });
    await ready(page);
    await page.waitForTimeout(2600);
    expect(await page.evaluate(() => ({ flag: state.tutorialDone, on: tourOn }))).toEqual({ flag: true, on: false });
  });

  test("speaks Russian and Uzbek", async ({ page }) => {
    for (const [lang, hello] of [["ru", "Добро пожаловать, герой!"], ["uz", "Xush kelibsiz, Qahramon!"]]) {
      await bootAsGuest(page);
      await page.evaluate((l) => { state.lang = l; state.tutorialDone = false; save(); }, lang);
      await page.reload({ waitUntil: "domcontentloaded" });
      await ready(page);
      await page.waitForSelector("#tourOv.show", { timeout: 10000 });
      await expect(page.locator("#tourTitle")).toHaveText(hello);
      await page.evaluate(() => endTour(true));
      await page.evaluate(() => { localStorage.clear(); });
      await page.context().clearCookies();
    }
  });
});

test.describe("the video guide", () => {
  test("GUIDE has the video, with subtitles in English, Russian and Uzbek", async ({ page }) => {
    await bootAsGuest(page);
    await page.evaluate(() => switchPage("guide"));
    const v = await page.evaluate(() => {
      const el = document.getElementById("guideVideo");
      return {
        src: el.querySelector("source").getAttribute("src"),
        type: el.querySelector("source").getAttribute("type"),
        poster: el.getAttribute("poster"),
        tracks: Array.from(el.querySelectorAll("track")).map((t) => t.getAttribute("srclang") + ":" + t.getAttribute("src")),
        inline: el.hasAttribute("playsinline"),
        lazy: el.getAttribute("preload")
      };
    });
    expect(v.type).toBe("video/mp4");
    expect(v.inline).toBe(true);
    expect(v.lazy).toBe("none"); /* nothing is downloaded until the hero presses play */
    expect(v.tracks.map((t) => t.split(":")[0])).toEqual(["en", "ru", "uz"]);
    /* every file the page points at is in the repository, and the video is small enough for a phone */
    for (const f of [v.src, v.poster].concat(v.tracks.map((t) => t.split(":")[1]))) {
      expect(fs.existsSync(path.join(ROOT, f)), f).toBe(true);
    }
    expect(fs.statSync(path.join(ROOT, v.src)).size).toBeLessThan(5 * 1024 * 1024);
  });

  test("the three subtitle files have the same cues at the same times", async () => {
    const parse = (lang) => fs.readFileSync(path.join(ROOT, "guide", "level-up-guide." + lang + ".vtt"), "utf8")
      .split(/\n\n+/).filter((b) => b.includes("-->"))
      .map((b) => { const l = b.trim().split("\n"); const t = l.find((x) => x.includes("-->")); return { t: t.split(" line:")[0], text: l[l.indexOf(t) + 1] }; });
    const en = parse("en"), ru = parse("ru"), uz = parse("uz");
    expect(fs.readFileSync(path.join(ROOT, "guide", "level-up-guide.en.vtt"), "utf8").startsWith("WEBVTT")).toBe(true);
    expect(en.length).toBeGreaterThanOrEqual(10);
    expect(ru.map((c) => c.t)).toEqual(en.map((c) => c.t));
    expect(uz.map((c) => c.t)).toEqual(en.map((c) => c.t));
    for (const c of ru.concat(uz)) expect(c.text && c.text.length > 5).toBe(true);
    expect(ru.some((c) => /[А-Яа-я]/.test(c.text))).toBe(true);
    expect(uz.every((c) => !/[А-Яа-я]/.test(c.text))).toBe(true);
  });

  test("the end of the tour can open the video", async ({ page }) => {
    await bootIntoTour(page);
    await page.evaluate(() => { tourIdx = TOUR.length - 1; showTourStep(); });
    await page.click("#tourVideoBtn");
    await expect(page.locator("#tourOv")).not.toHaveClass(/show/);
    expect(await page.evaluate(() => currentPage)).toBe("guide");
    expect(await page.evaluate(() => state.tutorialDone)).toBe(true);
  });
});
