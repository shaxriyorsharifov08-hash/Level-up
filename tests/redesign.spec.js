/* THE LIGHTER LAYOUT (README 4t).
   Five tabs always on screen instead of a hidden "+1%" dock, a TODAY page that
   shows today's work first, a calm look by default, and nothing lost: every
   section is still reachable and the Administrator's locks still decide what
   is open. */
const { test, expect } = require("@playwright/test");
const { bootAsGuest } = require("./helpers");

const tabs = (page) => page.$$eval("#nav .nav-btn", (els) => els.map((e) => e.getAttribute("data-tab")));

test.describe("the tab bar", () => {
  test("five tabs are always on screen, with TODAY open on start", async ({ page }) => {
    await bootAsGuest(page);
    expect(await tabs(page)).toEqual(["today", "quests", "progress", "rewards", "more"]);
    await expect(page.locator("#nav")).toBeVisible();
    await expect(page.locator('#nav .nav-btn[data-tab="today"]')).toHaveClass(/active/);
    expect(await page.locator("#navToggle").count()).toBe(0); /* the hidden dock is gone */
    expect(await page.locator("#quickGrid").count()).toBe(0); /* and so is the Command Center */
    /* every tab fits on a phone */
    const fits = await page.$$eval("#nav .nav-btn", (els) => els.every((e) => {
      const r = e.getBoundingClientRect();
      return r.left >= 0 && r.right <= window.innerWidth && r.height >= 44;
    }));
    expect(fits).toBe(true);
  });

  test("PROGRESS holds the profile, the story road, stats and honor; sealed ones show their level", async ({ page }) => {
    await bootAsGuest(page);
    await page.click('#nav .nav-btn[data-tab="progress"]');
    expect(await page.evaluate(() => currentPage)).toBe("profile");
    const subs = await page.$$eval("#subnav .sub-btn", (els) => els.map((e) => [e.getAttribute("data-page"), e.getAttribute("data-locklv")]));
    expect(subs).toEqual([["profile", null], ["story", null], ["stats", "4"], ["honor", "8"]]);
    await page.click('#subnav .sub-btn[data-page="stats"]');
    expect(await page.evaluate(() => currentPage)).toBe("profile"); /* sealed: stays put */
    await expect(page.locator(".toast").last()).toContainText("Reach Level");
    await page.click('#subnav .sub-btn[data-page="story"]');
    expect(await page.evaluate(() => currentPage)).toBe("story");
    /* the tab remembers where the hero was */
    await page.click('#nav .nav-btn[data-tab="today"]');
    await page.click('#nav .nav-btn[data-tab="progress"]');
    expect(await page.evaluate(() => currentPage)).toBe("story");
  });

  test("REWARDS is sealed until its level, then opens", async ({ page }) => {
    await bootAsGuest(page);
    await expect(page.locator('#nav .nav-btn[data-tab="rewards"]')).toHaveAttribute("data-locklv", "6");
    await page.click('#nav .nav-btn[data-tab="rewards"]');
    expect(await page.evaluate(() => currentPage)).toBe("home");
    await page.evaluate(() => { state.level = 6; save(); renderNav(); });
    await page.click('#nav .nav-btn[data-tab="rewards"]');
    expect(await page.evaluate(() => currentPage)).toBe("rewards");
    expect(await page.$$eval("#subnav .sub-btn", (els) => els.map((e) => e.getAttribute("data-page")))).toEqual(["rewards", "inventory"]);
  });

  test("MORE lists every other section in the hero's order; sealed ones show their level", async ({ page }) => {
    await bootAsGuest(page);
    await page.click('#nav .nav-btn[data-tab="more"]');
    await expect(page.locator("#moreSheet")).toHaveClass(/show/);
    const rows = await page.$$eval("#moreList .more-row", (els) => els.map((e) => [e.getAttribute("data-page"), e.getAttribute("data-locklv")]));
    expect(rows).toEqual([["learn", null], ["guild", "12"], ["budget", "15"], ["guide", null], ["admin", null]]);
    await page.click('#moreList .more-row[data-page="admin"]');
    expect(await page.evaluate(() => currentPage)).toBe("admin");
    await expect(page.locator("#moreSheet")).not.toHaveClass(/show/);
    await expect(page.locator('#nav .nav-btn[data-tab="more"]')).toHaveClass(/active/);
    /* Escape closes it too */
    await page.click('#nav .nav-btn[data-tab="more"]');
    await page.keyboard.press("Escape");
    await expect(page.locator("#moreSheet")).not.toHaveClass(/show/);
  });

  test("the Administrator's locks still rule: a removed section disappears, a reopened one is open", async ({ page }) => {
    await bootAsGuest(page);
    const r = await page.evaluate(() => {
      remoteSystemLocks = { guild: -1, stats: 0, rewards: -1, inventory: -1 };
      renderNav(); switchPage("profile");
      const more = tabPages(TABS[4]);
      const subs = Array.from(document.querySelectorAll("#subnav .sub-btn")).map((e) => [e.getAttribute("data-page"), e.getAttribute("data-locklv")]);
      const tabsNow = Array.from(document.querySelectorAll("#nav .nav-btn")).map((e) => e.getAttribute("data-tab"));
      remoteSystemLocks = null;
      return { more, subs, tabsNow };
    });
    expect(r.more).not.toContain("guild");
    expect(r.subs).toContainEqual(["stats", null]);
    expect(r.tabsNow).toEqual(["today", "quests", "progress", "more"]); /* both reward pages removed */
  });

  test("a section the hero renamed or hid in SETTINGS follows them into the menus", async ({ page }) => {
    await bootAsGuest(page);
    const r = await page.evaluate(() => {
      navEntry("learn").label = "MY STUDY";
      navEntry("guide").hidden = true;
      navEntry("admin").hidden = true; /* SETTINGS can never be hidden */
      save(); renderNav();
      return Array.from(document.querySelectorAll("#moreList .more-row")).map((e) => e.textContent);
    });
    expect(r.join("|")).toContain("MY STUDY");
    expect(r.join("|")).not.toContain("GUIDE");
    expect(r.join("|")).toContain("SETTINGS");
  });

  test("every section can still be reached from the menus", async ({ page }) => {
    await bootAsGuest(page);
    const unreachable = await page.evaluate(() => {
      state.level = 100; save(); renderNav();
      const reach = {};
      TABS.forEach((t) => tabPages(t).forEach((p) => { reach[p] = true; }));
      return PAGES.filter((p) => !reach[p]);
    });
    expect(unreachable).toEqual([]);
  });
});

test.describe("TODAY", () => {
  test("today's package is on the first screen, and the page is short", async ({ page }) => {
    await bootAsGuest(page);
    const m = await page.evaluate(() => {
      switchPage("home"); scrollTo(0, 0);
      return {
        pkgTop: document.getElementById("pkgList").getBoundingClientRect().top,
        screen: innerHeight,
        height: document.documentElement.scrollHeight,
        mentorHere: !!document.querySelector("#page-home #mentorPanel"),
        artHere: !!document.querySelector("#page-home #heroArt")
      };
    });
    expect(m.pkgTop).toBeLessThan(m.screen / 2);
    expect(m.height).toBeLessThan(m.screen * 1.5);
    expect(m.mentorHere).toBe(false); /* moved to PROGRESS → PROFILE */
    expect(m.artHere).toBe(false);
    expect(await page.locator("#page-profile #mentorPanel").count()).toBe(1);
  });

  test("the + button adds a quest from TODAY, and the quest row leads to QUESTS", async ({ page }) => {
    await bootAsGuest(page);
    await expect(page.locator("#fab")).toBeVisible();
    await page.click("#fab");
    await expect(page.locator("#questModal")).toHaveClass(/show/);
    await page.evaluate(() => document.getElementById("questModal").classList.remove("show"));
    await expect(page.locator("#todayQuests")).toContainText("quests done today");
    await page.click("#todayQuests");
    expect(await page.evaluate(() => currentPage)).toBe("quests");
  });

  test("first steps are one tip that can be closed", async ({ page }) => {
    await bootAsGuest(page);
    await expect(page.locator("#firstSteps .today-tip")).toHaveCount(1);
    await expect(page.locator("#firstSteps")).toContainText("Create your first quest");
    await page.click("#fsDismiss");
    await expect(page.locator("#firstSteps .today-tip")).toHaveCount(0);
    expect(await page.evaluate(() => state.firstStepsDismissed)).toBe(true);
  });
});

test.describe("the calm look", () => {
  test("is the default: no particles and no glow", async ({ page }) => {
    await bootAsGuest(page);
    const r = await page.evaluate(() => ({
      calm: document.body.classList.contains("calm"),
      particles: getComputedStyle(document.getElementById("particles")).display,
      headerGlow: getComputedStyle(document.querySelector("header")).boxShadow,
      titleGlow: getComputedStyle(document.querySelector(".panel-title")).textShadow,
      effects: state.effects
    }));
    expect(r).toEqual({ calm: true, particles: "none", headerGlow: "none", titleGlow: "none", effects: false });
  });

  test("SETTINGS → Effects brings the full look back, and it is remembered", async ({ page }) => {
    await bootAsGuest(page);
    await page.evaluate(() => switchPage("admin"));
    await page.selectOption("#admEffects", "on");
    expect(await page.evaluate(() => document.body.classList.contains("calm"))).toBe(false);
    await page.reload({ waitUntil: "domcontentloaded" });
    await page.waitForFunction(() => typeof window.state === "object" && window.state !== null && typeof window.switchPage === "function");
    expect(await page.evaluate(() => ({ effects: state.effects, calm: document.body.classList.contains("calm") })))
      .toEqual({ effects: true, calm: false });
  });

  test("an older save without the setting gets the calm look and keeps its data", async ({ page }) => {
    await bootAsGuest(page);
    await page.evaluate(() => {
      const old = JSON.parse(JSON.stringify(state));
      delete old.effects;
      old.hunterName = "Old Save";
      old.saveCount = (state.saveCount || 0) + 500; /* newer than the vault copy */
      localStorage.setItem("leveluphunter_v1", JSON.stringify(old));
    });
    await page.reload({ waitUntil: "domcontentloaded" });
    await page.waitForFunction(() => typeof window.state === "object" && window.state !== null && typeof window.switchPage === "function");
    expect(await page.evaluate(() => ({ effects: state.effects, name: state.hunterName })))
      .toEqual({ effects: false, name: "Old Save" });
  });
});

test.describe("first run", () => {
  test("START is one tap: no USER step, and the admin door stays hidden", async ({ page }) => {
    await page.route(/^https?:\/\//, (route) => route.abort());
    await page.goto("file://" + require("path").resolve(__dirname, "..", "index.html"), { waitUntil: "domcontentloaded" });
    await page.waitForFunction(() => typeof window.state === "object" && window.state !== null);
    await expect(page.locator("#entGuestBtn")).toBeVisible();
    await expect(page.locator("#entGoogleBtn")).toBeVisible();
    await expect(page.locator("#entAdminBtn")).toBeHidden();
    expect(await page.locator("#entUserBtn").count()).toBe(0);
  });

  test("speaks Russian and Uzbek", async ({ page }) => {
    await bootAsGuest(page);
    for (const [lang, today, progress] of [["ru", "СЕГОДНЯ", "ПРОГРЕСС"], ["uz", "BUGUN", "TARAQQIYOT"]]) {
      await page.evaluate((l) => { state.lang = l; save(); }, lang);
      await page.reload({ waitUntil: "domcontentloaded" });
      await page.waitForFunction(() => typeof window.state === "object" && window.state !== null && typeof window.switchPage === "function");
      await expect(page.locator('#nav .nav-btn[data-tab="today"]')).toContainText(today);
      await expect(page.locator('#nav .nav-btn[data-tab="progress"]')).toContainText(progress);
    }
  });
});
