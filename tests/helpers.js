/* Shared setup for every spec.
   The app is opened from disk in a fresh browser context, so these tests can
   never touch a real hunter's save. Waits are condition-driven rather than
   fixed sleeps — the whole suite has to stay fast enough to run on every push. */
const path = require("path");

const APP_URL = "file://" + path.resolve(__dirname, "..", "index.html");

/* The System speaks in queued announcements; most tests need them out of the way. */
async function drainAnnouncements(page) {
  for (let i = 0; i < 25; i++) {
    const wasOpen = await page.evaluate(() => {
      const ov = document.getElementById("announceOv");
      if (!ov || !ov.classList.contains("show")) return false;
      document.getElementById("annOk").click();
      return true;
    });
    if (!wasOpen) return;
    await page.waitForTimeout(60);
  }
}

/* Boot the app as a guest hunter with the Oath already sworn, which is the
   state every test other than the first-run ones cares about. */
async function bootAsGuest(page, opts) {
  opts = opts || {};
  const errors = [];
  page.on("pageerror", (e) => errors.push("pageerror: " + e.message));

  /* The app pulls Chart.js and Firebase from CDNs. Tests must never depend on
     a third party being up, so those requests are blocked: the run is fast,
     deterministic, and doubles as proof the app still works offline. */
  await page.route(/^https?:\/\//, (route) => route.abort());

  await page.goto(APP_URL, { waitUntil: "domcontentloaded" });
  await page.waitForFunction(
    () => typeof window.state === "object" && window.state !== null && typeof window.switchPage === "function",
    null, { timeout: 20000 }
  );

  await page.click("#entUserBtn");
  await page.click("#entGuestBtn");

  /* the Oath is raised a moment after the gate opens */
  await page.waitForSelector("#oathOv.show", { timeout: 10000 }).catch(() => {});

  if (!opts.keepOath) {
    await page.evaluate(() => {
      state.oath = {
        running: "r".repeat(25), failed: "f".repeat(25),
        become: "b".repeat(25), words: "w".repeat(25),
        signed: "Tester", sworn: "2026-01-01", prev: []
      };
      save();
      document.getElementById("oathOv").classList.remove("show");
    });
  }
  await drainAnnouncements(page);
  return errors;
}

module.exports = { APP_URL, bootAsGuest, drainAnnouncements };
