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
| `smoke.spec.js` | The app opens at all: no JavaScript errors, every page exists, a new hero goes straight in and the Oath is asked after the first finished day (any length accepted), the section order leads with the daily loop. |
| `data-safety.spec.js` | A hero's record. HTML injection through icon fields, a failed save going unnoticed, one error killing the app, an old save losing fields, and the storage key never changing. |
| `progression.spec.js` | The rules that make the game worth playing: rank cannot be bought with banked points, a rank is never taken back, stat points stay scarce, an Academy task becomes a real quest, and the System can no longer seal a quest shut. |
| `reports.spec.js` | Report deadlines (1 / 3 / 7 days), no report ever demanded retroactively, late filings earning nothing, and debt charged exactly once. |
| `quest-view.spec.js` | One quest, full screen: the window opens and closes, it shows that quest's own record and streak, and its interval timer belongs to that quest alone. |
| `pruning.spec.js` | The save cannot grow forever: mechanical rows fold into the archive, all-time totals survive the fold, and nothing the hero wrote is ever deleted. |
| `accessibility.spec.js` | Every control has a name, panels rendered later are repaired by the observer, dialogs say they are dialogs, and announcements are spoken. |
| `calendar-currency.spec.js` | The quest calendar shows the right day and does not collide with the old date picker, and changing currency converts every amount both ways. |
| `budget-days.spec.js` | The separate interval timer is gone for good, one focus window serves quests, challenges, goals and to-dos alike, and money reads a day at a time in both BUDGET and the calendar. |
| `alarm.spec.js` | Laps end the session by themselves; the alarm is scheduled **at the right moment** (measured, not assumed), is cancellable, arms for a stopwatch target as well as a grind phase, and says so when sound is off; uploaded sounds are trimmed to the chosen span and never enter the save. |
| `focus-skin.spec.js` | Focus themes paint, uploaded wallpapers live in the vault and never in the save, they rotate on schedule, and GRIND never logs rest as work. |
| `focus-time.spec.js` | The focus window covers the screen and keeps running when closed, and every tracked second is attributed to its section without losing time logged before the split existed. |
| `todo-money.spec.js` | The to-do list stays out of the game (flat XP paid once, no trophy, no rank), overdue items reach the Hall of Shame, and money fields group thousands while you type without corrupting the saved amount. |
| `focus-trap.spec.js` | Tab and Shift+Tab never leave an open dialog, focus pushed behind it is pulled back, opening does not raise a phone keyboard, closing returns focus to the opener, and the focus window's own panels trap on their own. |
| `chronicle.spec.js` | A chapter per month, newest first; a collapse or a return is named only when the record shows it; the hero's words are quoted and never executed; the Oath is the prologue; reading the Chronicle never writes to the save. |
| `privacy.spec.js` | YOUR DATA & PRIVACY: the panel tells the truth (including that AI is used only when Mentor AI is switched on), export downloads the save, cancelling or a wrong word deletes nothing, DELETE clears the save, the vault and the snapshots, signed in the cloud save and clan profile go first, and offline or a refused cloud deletes nothing anywhere. |
| `break-reminder.spec.js` | The break reminder fires after the chosen active minutes; idle time, a running focus session and Off never count; five minutes away resets it; old saves get the default and keep their data. |
| `premium.spec.js` | The Premium page (MORE → ⭐ PREMIUM, marked SOON) shows the price and the plan, has nothing to pay with, is reachable from SETTINGS, remembers I'M INTERESTED once, obeys the Administrator's locks, and speaks Russian. |
| `hero-home.spec.js` | TODAY's hero card opens the hero's page and TODAY brings you back; the hero's page shows one hero and folds its long parts; TODAY stays short; an old save gets MENTOR and PREMIUM in MORE in their place and keeps its own names; the new places speak Russian and Uzbek. |
| `security.spec.js` | A crafted clan profile or cloud save cannot run script on the leaderboard, the stats card or the admin user list. |
| `themes.spec.js` | A new hero opens in the classic Shadow look with sturdy type and no glow; every solid theme passes 4.5:1 for text, grey text and buttons; no dark card is left on a light theme; the theme choice is remembered and the classic look is still there; a save on Sky goes back to Shadow once and keeps its data, any other chosen theme is kept; an unknown theme falls back to Shadow; theme names speak Russian and Uzbek. |
| `tutorial.spec.js` | A new hero gets the tour after the welcome and is taught by doing (tap steps wait for the highlighted control, other taps are held back); it changes nothing in the record and is not shown again; SKIP and Escape end it, GUIDE replays it; a hero who has already played never gets it; it speaks Russian and Uzbek; GUIDE has the video, every file it points at exists and is phone-sized, and the three subtitle files have the same cues at the same times. |
| `redesign.spec.js` | The five tabs are always on screen; PROGRESS (story, stats, honor), REWARDS and MORE (now with MENTOR and PREMIUM) hold every other section; sealed ones show their level and removed ones disappear; renamed or hidden sections follow the hero; every section is still reachable; TODAY puts the package on the first screen; the calm look is the default and the Effects switch is remembered; START is one tap; tabs speak Russian and Uzbek. |
| `names-and-uzbek.spec.js` | An old save gets the new original names once and loses nothing (the hero's own text is never renamed); no anime-derived name is left in the source or on any page in English, Russian or Uzbek; Uzbek covers every Russian string in correct Latin orthography; DELETE MY DATA accepts OʻCHIRISH. |
| `quest-hub.spec.js` | The four squares on QUESTS: the list is still one tap away, every quest belongs to exactly one square, nothing is stranded off all of them, the counts are live, and a new goal is followed to its square. |
| `mentor.spec.js` | The System Mentor reads the real record (each quest's rate on its due days, the weekly trend, the weak weekday, a streak to protect) without writing to it; a new hero is not scolded for days before they started; it answers in English, Russian and Uzbek and names a quest the hero already has; crisis, eating-distress and diet questions get a fixed careful answer and are never sent; a suggestion becomes a quest only through NEW QUEST and its slot rules; Mentor AI is hidden until deployed, asks first, sends only the question and a short summary (never the name or the Oath) with the sign-in, falls back to the device when limited, offline, signed out or down, obeys the admin locks; old saves keep everything; the page holds no key. |
| `ai-proxy.spec.js` | The Mentor AI Worker (`ai-proxy/worker.mjs`), run in Node with a fake model and KV: only the app's address and a real Google sign-in from this project get in; 3 questions a day per account, more for premium, a cap for everyone; safety replies never reach the model; a failed answer is not counted; bad input is refused; the model gets the safety rules and a clean chat; in agent mode only allowed, clamped, safe actions come back (five at most) and broken JSON is never shown or counted; the Worker logs nothing and needs no package. |
| `agent.spec.js` | The Mentor agent (README 4z): commands in English, Russian and Uzbek become proposed actions and questions stay questions; a card changes nothing until tapped, and then a quest or goal opens NEW QUEST (only SAVE adds it, slot rules kept), a to-do fills the To-Do box for the right day (only ADD saves it), focus starts on the chosen quest for the asked minutes without changing the default, a sealed page stays sealed; health and safety words never become actions; Mentor AI's proposals are checked again (no unknown kinds, names cut, numbers clamped) and never applied by themselves; plain commands are never sent; the Administrator can seal or remove the agent alone; Russian and Uzbek; no new save field. |
| `nightly-report.spec.js` | The nightly system check (README 4aa), run in Node against a fake GitHub: Playwright's results are read (failures with clean messages, flaky tests, a crashed run); a broken night opens one `nightly-tests` issue, the next night updates it without a duplicate and comments only when the failures change, a good night closes it; a down live site is reported; the AI summary is optional, sees only test names and errors and never blocks the report; no secret, no package. |
| `agent-team.spec.js` | The AI dev team (README 6b): every role file in `.claude/agents/` has a valid header, starts from `CLAUDE.md` and the team's knowledge and uses the team's tools; the planner, reviewer and health-safety roles cannot edit; the `/team` playbook names only real roles and keeps the stop-and-ask rules and the learning step; `CLAUDE.md`, the knowledge and the lessons carry no secret. |
| `company-runner.spec.js` | The Agent Company runner (README 6d), in Node with a fake AI service: the plan (also in a code fence), roles in turn, the reviewer and the final report; the call budget and the request size; questions stop the run; unknown roles dropped; broken JSON retried once; 429/5xx retried once, a long wait refused; clear 401/403/404 and network messages; the key never appears; the command line; the workflow's triggers, permissions and injection-safe shell; its issue-comment script. |
| `company.spec.js` | Agent Company (README 6d): the paste-in prompts fit ChatGPT's 1,500-character box, the 8,000 limit of a Custom GPT or Gem, and the chat-starter's 12,000; the roles, rules and deck reader are exactly the master copy; no company file names a Claude-only tool; every version carries the owner's rules and the stop-and-ask list; the memory templates, the README guide and `AGENTS.md` are in place. |
| `portable-team.spec.js` | The portable AI team (README 6c): the source in `portable/ai-team/` is valid for claude.ai, and the built zip, the plugin and the marketplace match it; the zip has the skill folder at its top; the plugin has ten agents and the read-only roles cannot edit; the build check refuses a project-specific leak, a long description, a tag, a missing role and a writing reviewer; the bundled deck reader runs alone. |
| `team-tools.spec.js` | The team's tools (`scripts/team/`) on the real `index.html`: the code map finds sections, functions and save fields; affected-tests picks the right specs (callers included); rules-check catches each of the owner's rules and passes a clean change; i18n-check finds missing languages; office-text reads a generated deck and Word file; every training drill still applies to today's code and the scorer is fair. |
| *(removed)* | `world.spec.js` is gone — the walkable world was removed on 2026-09-16. `smoke.spec.js` now guards that it stays gone. |

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
