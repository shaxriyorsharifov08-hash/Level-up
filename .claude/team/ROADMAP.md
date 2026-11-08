# LEVEL UP: the build roadmap (draft, 8 November 2026)

Six phases. Phases 1–4 are planned as **missions**: one mission is about one long working day for the AI team, and one phase is 2–3 days. Phases 5–6 are outlined and get planned in detail when we reach them. Sources: the team review (`.claude/team/reviews/2026-11-08-level-up-review.md`, items #1–#13).

**How to start work in a new cloud session:** type `/team mission next` (or `/team mission 2.1` for a specific one). The lead reads this file and `MISSION-LOG.md`, takes the next open mission, and keeps working mission after mission through the phase (see "Mission mode" in the playbook). **The phase stops at a 🚦 gate**: a decision only the owner can make.

| Phase | Name | Goal | Missions | Gate before it starts |
|---|---|---|---|---|
| **1** | Safe & Solid | No unsafe answer, no lost progress, no exploit | 1.1–1.4 | none: start now |
| **2** | Speaks Your Language | Every screen right in EN/RU/UZ; the main screens clear on a phone | 2.1–2.3 | none |
| **3** | Fair & Sticky | Humane game rules that keep players coming back | 3.1–3.4 | 🚦 decisions D2, D4, D5, D6 |
| **4** | Premium Ready | Mentor AI live, diet calculator, nutritionists, payments | 4.1–4.4 | 🚦 decisions D1, D3, D7 + owner accounts |
| 5 | Launch | Offline app, Android, beta with real users | outline | 🚦 D3 |
| 6 | Grow | Nutritionist service, schools, content, partners | outline | after launch data |

## 🚦 Owner decisions (the team cannot make these)
| # | Decision | Needed for |
|---|---|---|
| D1 | Premium price: **37,500 soʻm or $7 (~83,000 soʻm)**? Yearly and student tiers? | Phase 4 (and the deck now) |
| D2 | Punishments for teens: soften (no exercise as punishment, no shame copy, a rest day), or keep the hard edge? | Phase 3 |
| D3 | Offline: a cache scoped to `/Level-up/`, or a custom domain? | Phases 4–5 |
| D4 | An optional age band in the save (needed for any rule for minors)? | Phase 3 |
| D5 | A non-sport Daily Quest option for day one? | Phase 3 |
| D6 | Privacy-safe usage counters (changes the "no tracking" promise)? | Phase 3 |
| D7 | New paid or external services: Cloudflare D1, Click/Payme merchant accounts | Phase 4 |

---

## Phase 1: Safe & Solid (about 3 days, no decisions needed)

### Mission 1.1: Safety walls 2.0 (review #1)
**Goal:** a crisis, eating-distress or diet message is recognised however it is written, in all three languages, and nothing unsafe reaches an AI or becomes an action.
- [ ] health-safety: build a phrase corpus test fixture, at least 100 per language: EN, RU and UZ (Latin and Cyrillic), slang, typos, no apostrophes, indirect wording; plus 60 normal questions that must NOT trigger.
- [ ] coder: rebuild `MENTOR_CRISIS` / `MENTOR_EATING` / `MENTOR_DIET` and the Worker's copies. `mNorm` also turns Uzbek Cyrillic into Latin. Any food or body word routes to "diet" before the library.
- [ ] coder: `agUnsafe` refuses food restriction and body numbers, and caps reps at 100 and distance at 10 km. `mentorSummary` leaves out unsafe quest names.
- [ ] coder: filter the AI's answer, `ctx` and `turns` in the Worker and the app; a safe reply on a hit.
- [ ] translator: the crisis text names 112 (UZ ambulance 103), in EN/RU/UZ.
- [ ] tester: a test that the app's and Worker's lists are identical; the corpus test runs in `mentor.spec.js` and `ai-proxy.spec.js`.
- [ ] reviewer ‖ health-safety: final review.

**Done when:**
- at least 95% of corpus phrases are caught in each language;
- 0 of the 60 normal questions trigger;
- the agent never makes a card for an unsafe command;
- the full suite is green.

### Mission 1.2: Sync that never loses progress (review #2)
**Goal:** opening the app on an old device can never erase newer work, and a shared phone never mixes two accounts.
- [ ] planner: map every path that adopts or pushes a save (`setupAuthListener`, `cloudPush`, `cloudAdopt`, import, restore, delete).
- [ ] coder: a pure `pickWinner(local, remote)` by real change time (`updatedAt`), not save count; a snapshot to IndexedDB before any adopt or overwrite; a "which copy do you keep?" window when both changed.
- [ ] coder: store the owner uid in the save (versioned migration); a different account signing in is asked before any sync or clan publish.
- [ ] coder: import and restore raise the count; deletion leaves a cloud marker that every device obeys.
- [ ] tester: Firebase stubbed with `page.route`; tests for two devices, offline then online, a shared phone, restore, delete.
- [ ] reviewer: final review against owner rule 1.

**Done when:** every scenario in the tests keeps the newest work or asks, and an old save loads unchanged.

### Mission 1.3: Exact undo and a real migration system (review #3, #8)
- [ ] coder: completion records what it gave (tickets, statProg, stats, level, xp, statPoints); `undoToday` restores exactly that.
- [ ] coder: `state.schemaVersion` with ordered, numbered migration steps. Each existing one-time flag becomes a step. This fixes `roadSpV3`, which never ran for old saves.
- [ ] tester: old-save fixtures (one per era since launch) loaded through `load()`, not `migrateState()`; the complete/undo farm test from the review.

**Done when:** 5 complete/undo cycles change nothing; every fixture loads with nothing lost.

### Mission 1.4: Hardening and the clock suite (review #7, #9, #10)
- [ ] coder: the unregister loop keeps `notify-sw.js` (reminders fire again).
- [ ] coder: Firebase rules get `.validate` size and shape limits; the Worker adds to its counter **before** calling the model and gives it back on failure.
- [ ] coder: guests read broadcast, season and locks once, not with live listeners.
- [ ] tester: a clock suite (00:00, the 01:00 daily package, Sunday→Monday, month end, DST, a 60-day absence) asserting streaks, penalties, the package and reports.

**Done when:** the clock suite passes; the rules file has limits for every written path.

---

## Phase 2: Speaks Your Language (about 2–3 days, no decisions needed)

### Mission 2.1: Russian and Uzbek complete (review #4)
- [ ] translator ‖ coder: route the QUESTS hub, RANK EVALUATION, STORY road, the GUIDE gaps and the starter quests through `tr()`, with RU and UZ; the 38 `tr()` gaps; fix the `" more power"` key.
- [ ] translator: about 42 Russian "ты" → "вы"; "Rolllar" → "Rollar"; separate terms for Level and Tier; one name for the story road.
- [ ] tester: a test that opens every main page in RU and UZ and fails on visible English words (a small allow-list for names).

**Done when:** `i18n-check --all` shows 0 on main screens and the visible-English test passes.

### Mission 2.2: QUESTS and NEW QUEST that fit a phone (review #6)
- [ ] designer: the quest list first; the four hub tiles become one compact row; filter chips are hidden until there are more than 5 quests; the + never covers text.
- [ ] designer: NEW QUEST short form (name + frequency; "more options" folds the rest); chips wrap in RU/UZ; tap targets at least 36 px; grey text at least 0.78 rem.
- [ ] tester: screenshots in EN/RU/UZ; the theme and accessibility specs.

**Done when:** nothing is clipped in RU/UZ at 360 px; the list is visible without scrolling.

### Mission 2.3: First minute and SETTINGS (review #6)
- [ ] designer ‖ coder: SYSTEM INITIALIZED merges into the tour's first step; FIRST STEPS opens NEW QUEST on the one-time goal.
- [ ] designer ‖ coder: SETTINGS opens on language and theme; the overview folds into one line; the timer's buttons get labels and `aria-label`.
- [ ] tester: a first-run test counts taps from the gate to the first quest done.

**Done when:** the first quest takes 3 or fewer taps after START.

---

## Phase 3: Fair & Sticky (about 3 days, 🚦 needs D2, D4, D5, D6)

### Mission 3.1: Forgiving streaks (review #5, #12)
- [ ] coder: an earned streak freeze, a streak repair, a "welcome back" quest instead of frozen XP after an absence, and N rest or sick days a month (migration).
- [ ] analyst: set the numbers (how many freezes and rest days) from the evidence.

### Mission 3.2: Humane game rules (per D2)
- [ ] health-safety → coder: replace exercise-as-punishment and shame scripts; never quote the Oath at a failure; screen the Oath with the safety lists; a safe "Dawn March"; age-aware presets (no 5AM for teens, per D4).

### Mission 3.3: A habit on day one, friends earlier (review #12, per D5)
- [ ] coder: one recurring habit slot from day one; a non-sport starter Daily Quest (per D5); invite a friend before Level 12; a friend streak; "after X" cue reminders.
- [ ] coder: an optional age band (per D4), with privacy text, export and delete.

### Mission 3.4: Measure what matters, privately (per D6)
- [ ] analyst ‖ coder: opt-in aggregate counters in the Worker (D1/D7/D30, activation, streak survival, interest → paid), no ID for minors; the privacy text updated in the same change; a small report script.

---

## Phase 4: Premium Ready (about 3 days, 🚦 needs D1, D3, D7 and the owner's accounts)

### Mission 4.1: Mentor AI live
- [ ] coder: deploy the Worker (the owner connects Cloudflare), set `AI_PROXY_URL`, a Premium record in the Worker (D1 per D7), `isPremium()` with an offline grace period; monitoring.

### Mission 4.2: Diet calculator v1 (adults) (review #13)
- [ ] health-safety → coder:
  - Mifflin–St Jeor in code, with an activity table;
  - floors and a maximum deficit; refuse goals under BMI 18.5;
  - SCOFF screening first;
  - a birth year before any output, and nothing under 18;
  - its own consent;
  - health data on the device by default, exportable and deletable;
  - a `FEATURES` entry; citations confirmed.
- [ ] tester: a formula test against published worked examples.

### Mission 4.3: Nutritionist workflow
- [ ] planner → coder: Firebase `dietCases` with nutritionist roles and rules, draft → approved, a nutritionist console, an audit log; flagged cases go straight to a professional.

### Mission 4.4: Payments and one price (per D1, D7)
- [ ] coder: Click/Payme web checkout through the Worker (webhook), the Premium page live, yearly and student tiers.
- [ ] analyst → deck-editor: the model and every finance slide at the chosen price.

**Owner, before Phase 4:** choose D1; open Cloudflare, Click/Payme merchant accounts and nutritionist partners; a legal check on consent for minors and data storage in Uzbekistan.

---

## Phase 5: Launch (outline)
- An offline app (per D3).
- Speed: portraits to IndexedDB; load the outside scripts later.
- Android through a trusted web app (Play Store); a landing page.
- A beta with 50–100 real users and an in-app feedback button.
- Merge to `main` (the owner opens the pull request).

## Phase 6: Grow (outline)
- Booking nutritionist consultations.
- A schools / B2B pilot.
- Seasons and events in UZ/RU; LEARN & GROW in RU/UZ.
- Partners (for example 1Fit).
- Kazakh or Tajik if the beta asks for them.
