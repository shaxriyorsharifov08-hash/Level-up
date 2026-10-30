/* YOUR DATA & PRIVACY: export and DELETE MY DATA.
   The promise on the Society slide is "consent, export and deletion of your
   data". These tests hold the app to it, including the rule that a failed cloud
   deletion deletes nothing at all. */
const { test, expect } = require("@playwright/test");
const { bootAsGuest } = require("./helpers");

/* Leave a recognisable mark in every place a save lives. */
async function markSave(page) {
  await page.evaluate(() => {
    state.hunterName = "Wipe Probe";
    state.quests.push(makeQuest("📚", "Probe quest", "", "daily", [], "easy", "INT", "", false, 1));
    save();
    switchPage("admin");
  });
}

async function storedName(page) {
  return page.evaluate(() => {
    const raw = localStorage.getItem("leveluphunter_v1");
    return raw ? JSON.parse(raw).hunterName : null;
  });
}

/* A stand-in for Firebase, recording what was removed in sessionStorage,
   which survives the reload that ends a successful deletion. */
async function fakeCloud(page, opts) {
  await page.evaluate((o) => {
    sessionStorage.setItem("removed", "[]");
    cloudAvailable = true;
    cloudUser = { uid: "u1" };
    cloudRef = null;
    state.guildId = "g1";
    fbDb = {
      ref: function (p) {
        return {
          once: function () { return Promise.resolve({ val: function () { return o.online; } }); },
          remove: function () {
            if (o.refuse) return Promise.reject(new Error("PERMISSION_DENIED"));
            const r = JSON.parse(sessionStorage.getItem("removed"));
            r.push(p);
            sessionStorage.setItem("removed", JSON.stringify(r));
            return Promise.resolve();
          },
          off: function () {}, on: function () {}, set: function () { return Promise.resolve(); }
        };
      }
    };
    fbAuth = { signOut: function () { sessionStorage.setItem("signedOut", "1"); return Promise.resolve(); } };
  }, opts);
}

test.describe("your data & privacy", () => {
  test("the panel says plainly where data is kept and who can see it", async ({ page }) => {
    await bootAsGuest(page);
    await page.evaluate(() => switchPage("admin"));
    const text = await page.locator("#privacyPanel").innerText();
    expect(text).toContain("On this device");
    expect(text).toContain("administrator can open cloud saves");
    expect(text).toContain("clan");
    expect(text).toContain("nothing is sent to any AI service");
    await expect(page.locator("#privacyExport")).toBeVisible();
    await expect(page.locator("#privacyDelete")).toBeVisible();
  });

  test("EXPORT MY DATA downloads the whole save", async ({ page }) => {
    await bootAsGuest(page);
    await markSave(page);
    const [download] = await Promise.all([
      page.waitForEvent("download"),
      page.click("#privacyExport")
    ]);
    expect(download.suggestedFilename()).toMatch(/^levelup-backup-\d{4}-\d{2}-\d{2}\.json$/);
  });

  test("cancelling keeps everything", async ({ page }) => {
    await bootAsGuest(page);
    await markSave(page);
    page.once("dialog", (d) => d.dismiss());
    await page.click("#privacyDelete");
    await page.waitForTimeout(400);
    expect(await storedName(page)).toBe("Wipe Probe");
  });

  test("anything but the confirmation word deletes nothing", async ({ page }) => {
    await bootAsGuest(page);
    await markSave(page);
    page.once("dialog", (d) => d.accept("yes"));
    await page.click("#privacyDelete");
    await page.waitForTimeout(400);
    expect(await storedName(page)).toBe("Wipe Probe");
    expect(await page.evaluate(() => dataWiping)).toBe(false);
  });

  test("typing DELETE wipes this device: storage, vault and snapshots", async ({ page }) => {
    await bootAsGuest(page);
    await markSave(page);
    /* make sure the vault really holds the marked save before we delete */
    await expect.poll(() => page.evaluate(() => new Promise((res) => idbGet("kv", "state", (raw) => res(!!raw && raw.indexOf("Wipe Probe") !== -1))))).toBe(true);
    page.once("dialog", (d) => d.accept("DELETE"));
    await Promise.all([page.waitForEvent("load"), page.click("#privacyDelete")]);
    await page.waitForFunction(() => typeof window.state === "object" && window.state !== null && typeof window.idbGet === "function");
    /* the vault recovery runs on load: if any copy survived it would come back now */
    await page.waitForTimeout(1200);
    expect(await page.evaluate(() => state.hunterName)).not.toBe("Wipe Probe");
    expect(await storedName(page)).not.toBe("Wipe Probe");
    const vault = await page.evaluate(() => new Promise((res) => idbGet("kv", "state", (raw) => res(raw || ""))));
    expect(vault).not.toContain("Wipe Probe");
    const snaps = await page.evaluate(() => new Promise((res) => idbAllKeys("snapshots", (keys) => {
      let pending = keys.length, found = false;
      if (!pending) return res(false);
      keys.forEach((k) => idbGet("snapshots", k, (raw) => {
        if (raw && raw.indexOf("Wipe Probe") !== -1) found = true;
        if (--pending === 0) res(found);
      }));
    })));
    expect(snaps).toBe(false);
  });

  test("signed in: the cloud save and clan profile go first, then this device", async ({ page }) => {
    await bootAsGuest(page);
    await markSave(page);
    await fakeCloud(page, { online: true, refuse: false });
    page.once("dialog", (d) => d.accept("delete"));
    await Promise.all([page.waitForEvent("load"), page.click("#privacyDelete")]);
    await page.waitForFunction(() => typeof window.state === "object" && window.state !== null);
    const removed = await page.evaluate(() => JSON.parse(sessionStorage.getItem("removed") || "[]"));
    expect(removed).toEqual(["guilds/g1/members/u1", "hunters/u1"]);
    expect(await page.evaluate(() => sessionStorage.getItem("signedOut"))).toBe("1");
    expect(await storedName(page)).not.toBe("Wipe Probe");
  });

  test("offline: nothing is deleted anywhere", async ({ page }) => {
    await bootAsGuest(page);
    await markSave(page);
    await fakeCloud(page, { online: false, refuse: false });
    page.once("dialog", (d) => d.accept("DELETE"));
    await page.click("#privacyDelete");
    await page.waitForTimeout(500);
    expect(await page.evaluate(() => JSON.parse(sessionStorage.getItem("removed")))).toEqual([]);
    expect(await storedName(page)).toBe("Wipe Probe");
    expect(await page.evaluate(() => dataWiping)).toBe(false);
  });

  test("if the cloud refuses, this device keeps its data and can still save", async ({ page }) => {
    await bootAsGuest(page);
    await markSave(page);
    await fakeCloud(page, { online: true, refuse: true });
    page.once("dialog", (d) => d.accept("DELETE"));
    await page.click("#privacyDelete");
    await page.waitForTimeout(500);
    expect(await storedName(page)).toBe("Wipe Probe");
    expect(await page.evaluate(() => dataWiping)).toBe(false);
    await page.evaluate(() => { state.hunterName = "Still Saving"; save(); });
    expect(await storedName(page)).toBe("Still Saving");
  });

  test("the Russian confirmation word works too", async ({ page }) => {
    await bootAsGuest(page);
    await markSave(page);
    page.once("dialog", (d) => d.accept("удалить"));
    await Promise.all([page.waitForEvent("load"), page.click("#privacyDelete")]);
    await page.waitForFunction(() => typeof window.state === "object" && window.state !== null);
    expect(await storedName(page)).not.toBe("Wipe Probe");
  });
});
