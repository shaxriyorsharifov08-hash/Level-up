# Tests — the safety net for `index.html`

`index.html` is one very large file with no build step, so the only thing standing between an edit and a broken app is this folder. **These tests run automatically on GitHub every time you commit. You do not have to run anything yourself.**

---

## Reading the result on your phone

1. Commit your change (github.com pencil icon, or github.dev).
2. Open the repo → the **Actions** tab.
3. The newest run shows a ✅ or a ❌ next to your commit.
   - ✅ — you did not break anything the tests know about.
   - ❌ — open the run, click the failing test, and read the line that says `Expected` / `Received`. It names the file and the line.

A ❌ is not a disaster. Your commit is still in git; open **History** for `index.html` and revert it, or fix and commit again.

---

## Running them on a computer (optional)

```bash
npm install                       # once
npx playwright install chromium   # once
npm test                          # every time
```

`npm run test:headed` opens a visible browser so you can watch it click through the app.

The tests open `index.html` straight from disk in a throwaway browser profile, so **they can never touch your real save.**

---

## What each file protects

| File | What breaks if it fails |
|---|---|
| `smoke.spec.js` | The app opens at all: no JavaScript errors, every page exists, the Oath cannot be skipped, the dock leads with the daily loop. |
| `data-safety.spec.js` | A hunter's record. HTML injection through icon fields, a failed save going unnoticed, one error killing the app, an old save losing fields, and the storage key never changing. |
| `progression.spec.js` | The rules that make the game worth playing: rank cannot be bought with banked points, a rank is never taken back, stat points stay scarce, and an Academy task becomes a real quest. |
| `reports.spec.js` | Report deadlines (1 / 3 / 7 days), no report ever demanded retroactively, late filings earning nothing, and debt charged exactly once. |
| `world.spec.js` | The world as a front door: every building leads somewhere real, no spawn point is inside a wall, every interior has an exit, sealed rooms refuse entry, position survives a reload, and 3D falls back to flat when Three.js cannot load. |

---

## Adding a test when you add a feature

Copy the shape of an existing one:

```js
const { test, expect } = require("@playwright/test");
const { bootAsGuest, drainAnnouncements } = require("./helpers");

test("the thing I just built does what I claim", async ({ page }) => {
  await bootAsGuest(page);              // opens the app as a guest, Oath already sworn
  const result = await page.evaluate(() => {
    // you are inside the real app here: state, save(), switchPage()
    // and every other function in index.html are available by name
    return somethingIWantToCheck();
  });
  expect(result).toBe(whatItShouldBe);
});
```

Two rules that keep the suite honest:

- **Assert on `state`, not on pixels.** Layout changes constantly; the rules underneath should not.
- **Write the test for the bug *before* you fix it**, and watch it fail. A test that has never failed has never proven anything.
