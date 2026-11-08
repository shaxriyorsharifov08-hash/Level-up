# LEVEL UP: whole-app review by the team (8 November 2026)

Seven roles reviewed the app at the same time, read-only. The lead re-checked every headline finding before writing it here; each one is marked **✔ verified** with how. This file is the team's backlog: `/team` tasks can point to its items by number.

| Role | Looked at | Headline |
|---|---|---|
| 🧭 planner | architecture, growth, data safety | Cloud sync picks the winner by save count, not by time; the app deletes its own service workers on every load |
| 🔎 reviewer | bugs and security, 7 areas | 3 blocking: sync overwrite, a save not tied to the account, an undo exploit |
| 🛡 health-safety | safety walls, game mechanics, diet plan | Only ~15% of realistic crisis/eating phrasings are caught; the agent makes "Skip dinner" cards |
| 🎨 designer | phone UX, 18 screenshots in EN/RU/UZ | Russian text clipped in NEW QUEST; QUESTS shows the list last; two pop-ups before the first action |
| 🌐 translator | Russian and Uzbek quality | RU 7/10, UZ 8/10; whole screens never reach `tr()`; ~42 RU lines use "ты" |
| 🧪 tester | the suite and coverage | 296/296 pass; cloud sync, daily reset, season events, notifications have no test |
| 📊 analyst | competitors, retention, money | The app's price (37,500 soʻm) and the deck's ($7) differ; at the app's price the plan runs out of cash |

## P0: fix first (safety and data)

1. **Safety walls miss most real phrasing** (health-safety). ✔ verified: lead probe, 8 of 9 phrasings slipped; "i want to sleep and never wake up" → a morning tip; "боюсь есть" → "do one thing that scares you"; `agentParse` makes "Skip dinner" and "Eat only 800 kcal" cards.
   Fix: rebuild `MENTOR_CRISIS` / `MENTOR_EATING` / `MENTOR_DIET` and the Worker copies from a 100+ phrase corpus in three languages (Cyrillic Uzbek included, apostrophes optional); route any food or body word to "diet" before the library; filter AI output, `ctx`, `turns`, agent actions and `mentorSummary` names; a test that the app and Worker lists match; name 112 (UZ ambulance 103) in the crisis text. Effort M.
2. **Cloud sync can overwrite newer progress** (planner + reviewer). ✔ verified: `setupAuthListener` lines with `remoteState.saveCount > state.saveCount`; every app open adds saves.
   Also: the save is not tied to the Google account (shared phone: B's cloud save replaced by A's, A's clan profile published under B); import and snapshot restore keep the old count and are undone by the other device; deleted data comes back from another device.
   Fix: store the owner uid in the save; snapshot to IndexedDB before any adopt or overwrite; compare real change times; ask "which copy?" when both changed; raise the count on restore; a "deleted" marker in the cloud. Effort M.
3. **Undo is not exact** (reviewer). ✔ verified: reviewer's script re-run by the lead: 5 complete/undo cycles → 0→5 roll tickets, STR 5→7; an honest undo across a level-up loses stat points (6→3).
   Fix: `undoToday` restores exactly what completion recorded (tickets, statProg, stats, level, xp, statPoints). Effort S–M.

## P1: what players see every day

4. **Russian and Uzbek on screen** (designer + translator). ✔ verified on screenshots and in code.
   - NEW QUEST in Russian: frequency and tier chips clipped/overflowing ("ЕЖЕДНЕВН…", "МИФИЧЕСКИЙ" past the edge).
   - Uzbek QUESTS hub in English: "CALENDAR", "TO DO LIST", "done today", tiers EPIC/MYTHIC/LEGENDARY (hard-coded around `qTabSquare`).
   - Untranslated: RANK EVALUATION, STORY road text, GUIDE half, LEARN & GROW, starter quests ("30 Push-ups", "3 km Run"), 38 `tr()` texts.
   - Key mismatch: the dictionaries hold `" more power"` (leading space) but the code asks `tr("more power")`.
   - ~42 RU lines use "ты" (tour, Oath, penalties, reflections) while the Mentor uses "вы"; UZ "Rolllar" ×6; RU/UZ use the same word for Level and Tier.
   Effort S–M; the translator's suggested texts are in its report.
5. **Game mechanics and minors** (health-safety + analyst).
   - Exercise as punishment (`PENALTY_TASKS`: 100 squats, planks, cold water), shame scripts, "Dawn March" alone with no phone.
   - The Oath quoted back at failures and never screened.
   - No rest or sick day; XP frozen after a miss; the 5AM preset; every new hero gets a 3 km run + 90 reps a day.
   - Evidence: broken streaks make people quit; forgiveness and repair keep them (Silverman & Barasch 2023). Streak freeze and repair, a welcome-back quest and a rest day would help safety **and** retention.
   **Owner decision**: punishments are part of the game's identity.
6. **First run and layout** (designer).
   - Two interruptions before the first action (SYSTEM INITIALIZED, then the tour); FIRST STEPS repeats the tour.
   - QUESTS puts four big tiles first and the list below the fold, behind 11 filter chips; the + covers text.
   - NEW QUEST is a long form where only the name is needed.
   - SETTINGS opens on a dashboard of 11 tiles; language and theme are far down.
   - Tap targets of 28–34 px; grey 11–12 px text.

## P1: under the hood

7. **Service workers** (planner + reviewer). ✔ verified: the end of `index.html` unregisters every service worker and clears every cache on load. It also removes `notify-sw.js`, so background reminders never fire, and nothing lets the app start offline from a cold start.
   Fix: skip `notify-sw.js`; decide the offline approach (**owner decision**: a cache scoped to `/Level-up/` despite the old cross-project incident, or a custom domain).
8. **A migration that never runs** (planner). ✔ verified: `defaultState()` sets `roadSpV3:true` and the defaults merge runs before `migrateState()`, so saves from before 3 Sep 2026 never get the reduced road payout.
   Fix: a `schemaVersion` with ordered steps, tested through `load()` with old-save fixtures. Effort M.
9. **Firebase and the Worker** (planner + reviewer).
   - No size or shape limits in `database.rules.json` (anyone signed in can fill the free 1 GB; 1,000 RESPECT pop-ups).
   - 4 live listeners for every guest (free plan: 100 connections).
   - Admin LOAD USERS downloads every full save.
   - Health data in `dossier` syncs to the cloud where the admin can read it.
   - Worker counters can be raced by parallel requests (add before calling the model).

## P2: the safety net (tester)

10. Tests for cloud merge (a pure `pickWinner` plus a stubbed Firebase), a clock-driven rollover suite (00:00, the 01:00 package, Sunday→Monday, month end, DST, a 60-day absence), and old/large-save fixtures with snapshot restore. Today 296/296 pass, but these areas have no tests.

## Business (analyst) — owner decisions

11. **One price.** The app shows 37,500 soʻm; the deck and model use $7 (≈ 83,000 soʻm). ✔ verified: the analyst's script reproduces the deck exactly (lowest cash $22,307, payback month 28) and, at 37,500 soʻm, gives break-even in month 31 and cash down to −$82,239.
    Add Click/Payme checkout; consider yearly (375,000) and student/parent (24,900) tiers. Label "payback" vs "losses recovered" (month 28 vs month 19).
12. **Retention.**
    - A friend or clan before Level 12.
    - A daily habit from day 1 (recurring quests unlock at Level 5).
    - Streak freeze/repair; cue-based reminders ("after X").
    - Privacy-safe KPI counters (D1/D7/D30, activation, streak survival, interest → paid): the app's "no tracking" sentence must change with them. Uzbek law needs written consent for minors.
13. **Diet calculator must-haves before launch** (health-safety):
    - Mifflin–St Jeor in code, adults only.
    - Floors and a maximum deficit; refuse goals under BMI 18.5.
    - SCOFF screening first.
    - A birth year before any output; nothing under 18.
    - Its own consent; health data on the device by default, exportable and deletable.
    - The nutritionist approval flow server-side.
    - Citations to confirm before launch.

## Owner decisions needed
1. Premium price: 37,500 soʻm or $7?
2. Punishments: soften for minors (no exercise as punishment, no shame copy, a rest day), or keep the hard edge?
3. Offline: a scoped cache, or a custom domain?
4. An optional age band (needed for any minors' rule; a new save field with a migration).
5. Should the Daily Quest offer a non-sport starter set?

## Suggested order
- **Phase 1 (safety and data):** 1, 2, 3, plus the tests for them.
- **Phase 2 (daily experience):** 4, 6, the `notify-sw.js` part of 7, and 8.
- **Phase 3 (after the decisions):** 5, 9, 11, 12, 13.

Each is a `/team` task.
