/* Untrusted cloud data. Clan profiles and other hunters' saves are written by
   OTHER people's devices; a crafted one must show up as text and never run.
   These guard the November 2026 security fixes. Do not delete them. */
const { test, expect } = require("@playwright/test");
const { bootAsGuest } = require("./helpers");

const PROBE = (n) => '<img src=x onerror="window.__p' + n + '=1">';

test.describe("security: untrusted clan and cloud data", () => {
  test("a crafted clan profile cannot run script on the leaderboard or the stats card", async ({ page }) => {
    await bootAsGuest(page);
    const ran = await page.evaluate((p) => {
      cloudAvailable = true;
      cloudUser = { uid: "me" };
      state.guildId = "g1";
      gInfo = { name: "Probe clan", code: "ABCDEF" };
      const evilUid = 'x"><img src=x onerror="window.__p1=1">';
      gMembers = {};
      gMembers[evilUid] = {
        name: p[0], rank: 'E"><img src=x onerror="window.__p2=1">', level: p[3],
        activeDays7: p[4], streak: p[5], focusMin7: p[6],
        stats: { INT: p[7], STR: 1, CON: 1, END: 1 }, titles: [p[8]]
      };
      renderGuild();
      openWatchStats(evilUid);
      return null;
    }, [PROBE(0), "", "", PROBE(3), PROBE(4), PROBE(5), PROBE(6), PROBE(7), PROBE(8)]);
    await page.waitForTimeout(600);
    const flags = await page.evaluate(() => [0, 1, 2, 3, 4, 5, 6, 7, 8].filter((n) => window["__p" + n]));
    expect(flags).toEqual([]);
    /* the hostile values are neutralised, not just hidden */
    const row = await page.locator("#guildMembers .gmem").first().innerText();
    expect(row).toContain("LV.1");
    expect(await page.locator("#guildMembers .rank-badge").first().innerText()).toBe("E");
    expect(await page.locator("#watchBody").innerText()).toContain("INT 0");
  });

  test("a crafted save cannot run script in the Administrator's user list", async ({ page }) => {
    await bootAsGuest(page);
    await page.evaluate((p) => {
      adminMode = true;
      cloudAvailable = true;
      const save = { hunterName: "Probe", level: p, totalCompleted: p };
      fbDb = {
        ref: function () {
          return { once: function (type, cb) { cb({ val: function () { return { u1: { json: JSON.stringify(save) } }; } }); } };
        }
      };
      document.getElementById("acLoadUsers").click();
      adminMode = false;
    }, PROBE(9));
    await page.waitForTimeout(600);
    expect(await page.evaluate(() => !!window.__p9)).toBe(false);
    expect(await page.locator("#acUsers").innerText()).toContain("LV.1 · 0 done");
  });
});
