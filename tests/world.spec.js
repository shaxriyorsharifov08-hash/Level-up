/* The world is the front door. A broken door link or a stuck spawn point
   locks a hunter out of a whole section. */
const { test, expect } = require("@playwright/test");
const { bootAsGuest, drainAnnouncements } = require("./helpers");

test.describe("the world", () => {
  test("every building leads somewhere that exists", async ({ page }) => {
    await bootAsGuest(page);
    const result = await page.evaluate(() => {
      const broken = [];
      worldRooms().forEach((n) => {
        const target = n.map || (n.go && (n.go.map || n.go.page)) || n.page;
        const isOath = !!(n.go && n.go.oath);
        if (isOath) return;
        if (!target) { broken.push(n.name + " -> nothing"); return; }
        if (n.map || (n.go && n.go.map)) {
          if (!WMAPS[n.map || n.go.map]) broken.push(n.name + " -> missing map");
        } else if (PAGES.indexOf(target) === -1) {
          broken.push(n.name + " -> unknown page " + target);
        }
      });
      return { broken: broken, count: worldRooms().length };
    });
    expect(result.broken).toEqual([]);
    expect(result.count).toBeGreaterThan(5);
  });

  test("every map spawns the hunter somewhere they are not stuck inside a wall", async ({ page }) => {
    await bootAsGuest(page);
    const stuck = await page.evaluate(() => {
      const bad = [];
      Object.keys(WMAPS).forEach((key) => {
        worldTravel(key);
        if (worldSolid(wPlayer.x, wPlayer.y)) bad.push(key);
      });
      worldTravel("city");
      return bad;
    });
    expect(stuck).toEqual([]);
  });

  test("every interior has a way back out", async ({ page }) => {
    await bootAsGuest(page);
    const result = await page.evaluate(() => {
      const noExit = [];
      Object.keys(WMAPS).forEach((key) => {
        const m = WMAPS[key];
        if (m.kind !== "room") return;
        const exits = m.nodes.filter((n) => n.go && n.go.map);
        if (exits.length === 0) noExit.push(key);
      });
      return noExit;
    });
    expect(result).toEqual([]);
  });

  test("entering the Academy and leaving it returns you to its door", async ({ page }) => {
    await bootAsGuest(page);
    const result = await page.evaluate(() => {
      worldTravel("academy");
      const inside = { map: wMap, name: curMap().name };
      const exit = worldRooms().filter((n) => n.name === "EXIT")[0];
      worldEnterNode(exit);
      wNear = worldNearest();
      return { inside: inside, backOn: wMap, standingAt: wNear && wNear.name };
    });
    expect(result.inside.map).toBe("academy");
    expect(result.backOn).toBe("city");
    expect(result.standingAt).toBe("ACADEMY");
  });

  test("a sealed room refuses entry and does not change the page", async ({ page }) => {
    await bootAsGuest(page);
    const result = await page.evaluate(() => {
      state.level = 1;              /* BUDGET unlocks at 15 by default */
      worldTravel("treasury");
      const budget = worldRooms().filter((n) => n.page === "budget")[0];
      const lock = sectionLockLevel(budget.page);
      const pageBefore = currentPage;
      worldEnterNode(budget);
      return { lock: lock, changed: currentPage !== pageBefore };
    });
    expect(result.lock).toBeGreaterThan(0);
    expect(result.changed).toBe(false);
  });

  test("the walking position and current map survive a reload", async ({ page }) => {
    await bootAsGuest(page);
    await page.evaluate(() => {
      worldTravel("academy");
      wPlayer.x = 300; wPlayer.y = 500;
      worldSave();
    });
    await page.reload({ waitUntil: "domcontentloaded" });
    await page.waitForFunction(() => typeof window.state === "object" && window.state !== null);
    await page.waitForTimeout(1200);
    await drainAnnouncements(page);
    const after = await page.evaluate(() => ({
      map: wMap, x: Math.round(wPlayer.x), y: Math.round(wPlayer.y)
    }));
    expect(after.map).toBe("academy");
    expect(after.x).toBe(300);
    expect(after.y).toBe(500);
  });

  test("3D falls back to the flat renderer when Three.js cannot load", async ({ page }) => {
    await page.route("**/three.min.js", (route) => route.abort());
    await bootAsGuest(page);
    await page.evaluate(() => worldTravel("academy"));
    await page.waitForTimeout(1600);
    const result = await page.evaluate(() => ({
      state: G3.state,
      glVisible: document.getElementById("worldGl").classList.contains("on"),
      isoFallback: !!curMap().iso,
      stillWalkable: !worldSolid(wPlayer.x, wPlayer.y)
    }));
    expect(result.glVisible).toBe(false);
    expect(result.isoFallback).toBe(true);
    expect(result.stillWalkable).toBe(true);
  });
});

test.describe("one quest, full screen", () => {
  test("opens with the quest's real record and its own timer", async ({ page }) => {
    await bootAsGuest(page);
    const result = await page.evaluate(() => {
      const q = state.quests[0];
      q.completions = [];
      for (let i = 1; i <= 40; i += 2) q.completions.push(addDays(todayStr(), -i));
      q.streak = 4; q.bestStreak = 11; q.timeSpent = 5400; q.target = 7; q.progress = 3;
      save();
      openQuestView(q.id);
      return {
        open: document.getElementById("questView").classList.contains("show"),
        numbers: Array.from(document.querySelectorAll("#qvNums .qv-num b")).map((x) => x.textContent),
        cells: document.querySelectorAll("#qvGrid .qv-cell").length,
        lit: document.querySelectorAll("#qvGrid .qv-cell.on").length,
        logRows: document.querySelectorAll("#qvLog .qv-log-row").length
      };
    });
    expect(result.open).toBe(true);
    expect(result.cells).toBe(84);          /* 12 weeks */
    expect(result.lit).toBe(20);            /* every other day for 40 days */
    expect(result.numbers[0]).toBe("4");    /* current streak */
    expect(result.numbers[1]).toBe("11");   /* best streak */
    expect(result.logRows).toBeGreaterThan(0);
  });

  test("its interval rounds are remembered per quest", async ({ page }) => {
    await bootAsGuest(page);
    const saved = await page.evaluate(() => {
      const q = state.quests[0];
      openQuestView(q.id);
      document.getElementById("qvWork").value = 45;
      document.getElementById("qvRest").value = 20;
      document.getElementById("qvRounds").value = 6;
      closeQuestView();
      return questById(q.id).iv;
    });
    expect(saved).toEqual({ w: 45, r: 20, c: 6 });
  });
});
