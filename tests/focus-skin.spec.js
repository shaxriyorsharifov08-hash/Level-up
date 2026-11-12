/* Themes, uploaded wallpapers and the GRIND cycle. The rules that matter:
   image bytes never enter the save, and resting is never logged as work. */
const { test, expect } = require("@playwright/test");
const { bootAsGuest, drainAnnouncements } = require("./helpers");

async function startOn(page, mode) {
  await page.evaluate((m) => {
    state.quests = [makeQuest("🏃", "Morning run", "d", "daily", [], "easy", "END", "", false, 1)];
    state.focus.mode = m;
    save();
    startTimer(state.quests[0].id);
  }, mode);
  await page.waitForSelector("#focusOv.show");
}

/* build a real image file in the page and push it through the real upload path */
async function upload(page, n) {
  return page.evaluate(async (count) => {
    const files = [];
    for (let i = 0; i < count; i++) {
      const c = document.createElement("canvas");
      c.width = 400; c.height = 600;
      const cx = c.getContext("2d");
      cx.fillStyle = ["#ff7a18", "#1e3a8a", "#a82cdc"][i % 3];
      cx.fillRect(0, 0, 400, 600);
      const blob = await new Promise((r) => c.toBlob(r, "image/png"));
      files.push(new File([blob], "art-" + i + ".png", { type: "image/png" }));
    }
    wpAddFiles(files);
    await new Promise((r) => setTimeout(r, 300 + 200 * count));
    return state.focus.wallpapers.length;
  }, n);
}

test.describe("focus themes", () => {
  test("every theme is selectable and paints the window", async ({ page }) => {
    await bootAsGuest(page);
    await startOn(page, "stopwatch");
    const r = await page.evaluate(() => {
      const out = [];
      FOCUS_THEMES.forEach((t) => {
        fo().theme = t.k;
        applyFocusSkin(true);
        const ov = document.getElementById("focusOv");
        out.push({
          k: t.k,
          attr: ov.getAttribute("data-fx"),
          bg: getComputedStyle(ov).backgroundImage
        });
      });
      return out;
    });
    expect(r.length).toBeGreaterThanOrEqual(7);
    r.forEach((t) => {
      expect(t.attr).toBe(t.k);
      /* each theme actually draws something, rather than falling through to flat */
      expect(t.bg).toContain("gradient");
    });
  });

  test("the settings swatch wears the real theme, not a grey box", async ({ page }) => {
    await bootAsGuest(page);
    await startOn(page, "stopwatch");
    await page.click("#foCfgBtn");
    await page.waitForTimeout(300);
    const swatches = await page.evaluate(() =>
      Array.from(document.querySelectorAll("#foThemes .fo-th i")).map((i) => ({
        fx: i.getAttribute("data-fx"),
        bg: getComputedStyle(i).backgroundImage
      })));
    expect(swatches.length).toBe(7);
    swatches.forEach((s) => expect(s.bg).toContain("gradient"));
    /* two different themes must not look identical */
    expect(swatches[0].bg).not.toBe(swatches[1].bg);
  });

  test("the chosen theme survives a reload", async ({ page }) => {
    await bootAsGuest(page);
    await page.evaluate(() => { fo().theme = "sakura"; save(); });
    await page.reload({ waitUntil: "domcontentloaded" });
    await page.waitForFunction(() => typeof window.state === "object" && window.state !== null);
    expect(await page.evaluate(() => state.focus.theme)).toBe("sakura");
  });
});

test.describe("uploaded wallpapers", () => {
  test("an upload is stored in the vault and NEVER in the save", async ({ page }) => {
    await bootAsGuest(page);
    await startOn(page, "stopwatch");
    expect(await upload(page, 1)).toBe(1);
    const r = await page.evaluate(() => ({
      entry: state.focus.wallpapers[0],
      saveHasImage: JSON.stringify(state).indexOf("data:image") !== -1,
      localHasImage: (localStorage.getItem(SKEY) || "").indexOf("data:image") !== -1,
      on: state.focus.wpOn
    }));
    /* the save carries a name and an id, and not one byte of the picture */
    expect(r.entry.name).toContain("art-0");
    expect(r.entry.id).toBeTruthy();
    expect(Object.keys(r.entry).sort()).toEqual(["id", "name"]);
    expect(r.saveHasImage).toBe(false);
    expect(r.localHasImage).toBe(false);
    expect(r.on).toBe(true);   /* uploading turns them on, so something happens */
  });

  test("the picture itself is readable back out of the vault", async ({ page }) => {
    await bootAsGuest(page);
    await startOn(page, "stopwatch");
    await upload(page, 1);
    const data = await page.evaluate(() => new Promise((res) => {
      wpCache = {};                        /* force a real vault read */
      wpLoad(state.focus.wallpapers[0].id, res);
    }));
    expect(data.slice(0, 11)).toBe("data:image/");
    expect(data.length).toBeGreaterThan(500);
  });

  test("removing a wallpaper clears it from the vault too", async ({ page }) => {
    await bootAsGuest(page);
    await startOn(page, "stopwatch");
    await upload(page, 2);
    const r = await page.evaluate(async () => {
      const id = state.focus.wallpapers[0].id;
      wpRemove(id);
      await new Promise((res) => setTimeout(res, 200));
      const gone = await new Promise((res) => { wpCache = {}; wpLoad(id, res); });
      return { left: state.focus.wallpapers.length, gone: !gone };
    });
    expect(r.left).toBe(1);
    expect(r.gone).toBe(true);
  });

  test("removing the last one turns wallpapers back off", async ({ page }) => {
    await bootAsGuest(page);
    await startOn(page, "stopwatch");
    await upload(page, 1);
    const off = await page.evaluate(() => {
      wpRemove(state.focus.wallpapers[0].id);
      return state.focus.wpOn;
    });
    expect(off).toBe(false);
  });

  test("wallpapers rotate on the chosen interval and wrap around", async ({ page }) => {
    await bootAsGuest(page);
    await startOn(page, "stopwatch");
    await upload(page, 3);
    const seq = await page.evaluate(() => {
      fo().rotateMin = 25;
      const at = (min) => { state.activeTimer.accumulated = min * 60; return wpIndexNow(); };
      return [at(0), at(24), at(25), at(50), at(74), at(75)];
    });
    /* 3 pictures, one every 25 minutes: 0,0,1,2,2,0 */
    expect(seq).toEqual([0, 0, 1, 2, 2, 0]);
  });

  test("NEVER means never", async ({ page }) => {
    await bootAsGuest(page);
    await startOn(page, "stopwatch");
    await upload(page, 3);
    const seq = await page.evaluate(() => {
      fo().rotateMin = 0;
      const at = (min) => { state.activeTimer.accumulated = min * 60; return wpIndexNow(); };
      return [at(0), at(60), at(600)];
    });
    expect(seq).toEqual([0, 0, 0]);
  });
});

test.describe("GRIND mode", () => {
  test("25/5 runs work, then rest, then work again", async ({ page }) => {
    await bootAsGuest(page);
    await startOn(page, "grind");
    const r = await page.evaluate(() => {
      const at = (min) => {
        state.activeTimer.accumulated = min * 60;
        const g = grindState(state.activeTimer);
        return { phase: g.phase, cycle: g.cycles, worked: Math.round(g.worked) };
      };
      return [at(0), at(24), at(25), at(29.5), at(30), at(55)];
    });
    expect(r[0].phase).toBe("work");
    expect(r[1].phase).toBe("work");
    expect(r[2].phase).toBe("rest");      /* 25 min in: rest begins */
    expect(r[3].phase).toBe("rest");
    expect(r[4].phase).toBe("work");      /* 30 min in: cycle 2 */
    expect(r[4].cycle).toBe(1);
    expect(r[5].phase).toBe("rest");
  });

  test("rest is never logged as focus time", async ({ page }) => {
    await bootAsGuest(page);
    await startOn(page, "grind");
    const r = await page.evaluate(() => {
      const at = (min) => {
        state.activeTimer.accumulated = min * 60;
        return Math.round(focusWorkedSec(state.activeTimer));
      };
      return { mid: at(10), endWork: at(25), inRest: at(28), nextWork: at(35) };
    });
    expect(r.mid).toBe(600);        /* 10 min of work */
    expect(r.endWork).toBe(1500);   /* a full 25 */
    expect(r.inRest).toBe(1500);    /* three minutes of rest added nothing */
    expect(r.nextWork).toBe(1800);  /* 25 + 5 more minutes of work */
  });

  test("FINISH logs the worked time only, not the wall clock", async ({ page }) => {
    await bootAsGuest(page);
    await startOn(page, "grind");
    const r = await page.evaluate(() => {
      state.timeHistory = {}; state.timeBy = {};
      state.activeTimer.accumulated = 28 * 60;   /* 25 worked + 3 resting */
      stopTimer(true);
      return { day: state.timeHistory[todayStr()], quest: state.quests[0].timeSpent };
    });
    await drainAnnouncements(page);
    expect(r.day).toBe(1500);
    expect(r.quest).toBe(1500);
  });

  test("a phone asleep through three cycles wakes in the right phase", async ({ page }) => {
    await bootAsGuest(page);
    await startOn(page, "grind");
    /* nothing ticks while the tab is backgrounded, so the phase must be derived
       from the clock rather than counted up */
    const g = await page.evaluate(() => {
      state.activeTimer.accumulated = 97 * 60;   /* 3 full cycles + 7 min of work */
      const s = grindState(state.activeTimer);
      return { phase: s.phase, cycles: s.cycles, worked: Math.round(s.worked) };
    });
    expect(g.phase).toBe("work");
    expect(g.cycles).toBe(3);
    expect(g.worked).toBe(3 * 1500 + 7 * 60);
  });

  test("the cycle is editable and the choice is remembered", async ({ page }) => {
    await bootAsGuest(page);
    await startOn(page, "grind");
    await page.click("#foCfgBtn");
    await page.waitForTimeout(250);
    await page.click('#foGrindChips [data-grind="50/10"]');
    await page.waitForTimeout(150);
    let r = await page.evaluate(() => ({ w: fo().work, r: fo().rest, tw: state.activeTimer.work }));
    expect(r).toEqual({ w: 50, r: 10, tw: 50 });

    /* and a custom value that is not a preset */
    await page.fill("#foWork", "37");
    await page.dispatchEvent("#foWork", "change");
    await page.waitForTimeout(150);
    r = await page.evaluate(() => ({ w: fo().work, r: fo().rest }));
    expect(r).toEqual({ w: 37, r: 10 });

    /* absurd values are clamped rather than breaking the cycle maths */
    await page.fill("#foWork", "9999");
    await page.dispatchEvent("#foWork", "change");
    await page.waitForTimeout(150);
    expect(await page.evaluate(() => fo().work)).toBe(180);
  });

  test("switching modes mid-session does not lose the session", async ({ page }) => {
    await bootAsGuest(page);
    await startOn(page, "stopwatch");
    const r = await page.evaluate(() => {
      state.activeTimer.accumulated = 600;
      document.getElementById("foCfgBtn").click();
      document.querySelector('#foModeChips [data-mode="grind"]').click();
      const g = state.activeTimer;
      return { running: !!g, mode: g.mode, elapsed: Math.round(timerElapsedSec()) };
    });
    expect(r.running).toBe(true);
    expect(r.mode).toBe("grind");
    expect(r.elapsed).toBeGreaterThanOrEqual(600);
  });
});

test.describe("older saves", () => {
  test("a save with no focus settings at all still opens", async ({ page }) => {
    await bootAsGuest(page);
    const r = await page.evaluate(() => {
      const old = JSON.parse(localStorage.getItem(SKEY));
      delete old.focus;
      old.focusGoalMin = 50;
      localStorage.setItem(SKEY, JSON.stringify(old));
      load();
      return { theme: state.focus.theme, mode: state.focus.mode,
               goal: state.focus.goalMin, wps: state.focus.wallpapers.length };
    });
    expect(r.theme).toBe("void");
    expect(r.mode).toBe("stopwatch");
    expect(r.wps).toBe(0);
  });

  test("wallpapers cannot be on with nothing to show", async ({ page }) => {
    await bootAsGuest(page);
    const on = await page.evaluate(() => {
      const old = JSON.parse(localStorage.getItem(SKEY));
      old.focus = { wpOn: true, wallpapers: [] };
      localStorage.setItem(SKEY, JSON.stringify(old));
      load();
      return state.focus.wpOn;
    });
    expect(on).toBe(false);
  });
});
