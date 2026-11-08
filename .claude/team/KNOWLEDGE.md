# What the team knows about LEVEL UP

Read this once per task, after `CLAUDE.md`. It explains how the project fits together. Line numbers change every day, so this file names functions and sections; get exact lines from `node scripts/team/codemap.mjs <name>`.

## 1. Find things in seconds, not minutes

| Need | Command |
|---|---|
| The app's layout (regions, ~90 sections, pages) | `node scripts/team/codemap.mjs` |
| Where a function, var, section or HTML id is | `node scripts/team/codemap.mjs <word>` |
| A function's source with line numbers | `node scripts/team/codemap.mjs --show <fn>` |
| Every use of a name, and the tests that mention it | `node scripts/team/codemap.mjs --refs <name>` |
| The specs a change touches (callers included) | `node scripts/team/affected-tests.mjs` (add `--base main` for a whole branch) |
| The owner's rules checked on a change | `node scripts/team/rules-check.mjs` (exit 1 on a rule break) |
| Missing Russian or Uzbek in a change | `node scripts/team/i18n-check.mjs` (`--all`: the whole app; about 38 old texts still fall back to English) |
| A deck or Word file as text, numbers, charts, notes | `python3 scripts/team/office-text.py <file> [--slide N] [--numbers] [--find text]` |
| Practice drills | `node scripts/team/drill.mjs list` |

Use the tools before reading big parts of `index.html`; read only the functions they point to.

**Agent HQ**, the team's office: https://claude.ai/artifact/NFeVzS2xSDRzVMYeqquYLu. A 3D blocky office where each role sits at its desk and acts out its live status. The page reads its data store: `agents/<role>` and `office/state`; only the owner (and Claude acting for the owner) can write it. The source is `.claude/team/office/agent-hq.html`; republish to the same URL with the Artifact tool's `url`. Mission mode updates it after every task (playbook section 9).

## 2. The shape of the app
- `index.html` has three regions: CSS (top, ~1,600 lines), HTML (pages as `<section id="page-…">`, modals and overlays), and one big `<script>` (~11,800 lines). The script is split by banner comments such as `/* ---------------- focus timer (per-task time tracking) ---------------- */`; `codemap` lists them all.
- Navigation: five fixed tabs (TODAY, QUESTS, PROGRESS, REWARDS, MORE; `TABS`), pages in `PAGES`, the order in `NAV_ORDER`; `switchPage(p)` checks locks first; `renderAll()` dispatches to `renderHome`, `renderQuests`, `renderMentor`, …
- Rendering is plain string HTML: build a string, escape every user or AI text with `esc()`, set `innerHTML`, and handle clicks by event delegation on the panel (`data-…` attributes). There is no framework.

## 3. The game, in one screen
- **Quests:** frequencies `daily`, `weekly`, `longterm` (a one-time goal with a target of steps), `custom` (chosen weekdays) and `challenge` (days in a row). Tiers `easy` to `legendary` pay XP and, when fully completed, rolls. Attributes `INT STR CON END`. Created with `makeQuest`, edited in the NEW QUEST modal (`openQuestModal(id, preset)`). `completedThisPeriod(q)` says whether a quest is done for its period.
- **Story path:** levels grant features (`FEATURES` with a default level, `def`) and rights: recurring quest slots (`state.questSlots`, 0 until Level 10), one-time goals per week (`state.goalCapWeekly`, 10). `questCreationBlock(freq)` enforces both.
- **Daily package:** four system quests every day (`state.dailyPackage`).
- **Punishments and locks:** penalty quests, XP debt, priority locks (`activeBlockers()`).
- **Rank:** being eligible is not being promoted (README 4j).
- **Focus timer:** `startTimer(id)` on a quest or to-do; `state.activeTimer`; modes `stopwatch` (with `goalMin`) and `grind` (work and rest); time goes to `timeHistory` and `timeBy`.
- **To-dos:** plain items with a day (`makeTodo`), flat 10 XP, missed ones go to the Hall of Shame.
- **Also:** calendar, monthly reports, chronicle, Finalize the Day, the Oath, rewards, crates, inventory, collections, Hall of Honor, clan (Firebase), budget, store and currency, LEARN & GROW, themes (Shadow default), the first-run tour, notifications, the break reminder.
- **Mentor (README 4x, 4z):** on-device analysis and answers (`MENTOR_KB`, `MENTOR_HABITS`), optional Mentor AI through the Worker, and the agent (`agentParse`, `agentClean`, cards, `agentApply`). Safety lists: `MENTOR_CRISIS`, `MENTOR_EATING`, `MENTOR_DIET`.
- **Admin:** `adminMode` (the Administrator never plays), the admin console, live locks from Firebase `systemLocks` (`remoteSystemLocks`) that override `FEATURES` defaults; -1 means removed.

## 4. Where data lives (README 4)
- `state` is the whole save. `save()` writes localStorage (`leveluphunter_v1`), IndexedDB (`kv` store, plus a daily snapshot), and pushes to the cloud when signed in (`cloudPush`). On load, `load()` / `adoptState()` fill missing fields from `defaultState()` and run `migrateState()`.
- **A new field** goes into `defaultState()`. A changed meaning needs a step in `migrateState()` that is safe to run twice. Always add a test that loads an old save without the field.
- Pictures and sounds live in IndexedDB; the save holds only their ids.
- Privacy: SETTINGS → YOUR DATA & PRIVACY exports the save and deletes everything (`dataWiping` blocks saves during it).

## 5. Languages
- English is in the code. Russian and Uzbek: `tr("English text")` looks the text up in `I18N_RU` / `I18N_UZ` (keys are the exact English), and visible HTML text is translated by `trTree`. Mentor text uses `{en, ru, uz}` entries read by `MT(key, vars)`.
- Uzbek is Latin with `ʻ` (U+02BB): `oʻ`, `gʻ`. The app's terms: kvest, murabbiy, SAQLASH, QOʻSHISH, KOʻPROQ (MORE), BUGUN (TODAY); Russian: квест, наставник, СОХРАНИТЬ, ДОБАВИТЬ, ЕЩЁ, СЕГОДНЯ.

## 6. Tests and CI
- Playwright, one worker, phone viewport 420×900. A spec boots the app from disk with `bootAsGuest(page)` (external network blocked, tour and Oath out of the way), often fixes the clock with `page.clock.setSystemTime`, and drives the app through `page.evaluate` and real clicks.
- Node-only specs test the Worker (`ai-proxy.spec.js`), the nightly reporter (`nightly-report.spec.js`), the team's files (`agent-team.spec.js`) and tools (`team-tools.spec.js`).
- Whole suite: about 6 minutes, ~290 tests. While working, run the specs from `affected-tests`; run the whole suite once before the commit.
- CI: `.github/workflows/tests.yml` on every push; `.github/workflows/nightly.yml` every night opens, updates or closes one `nightly-tests` issue (README 4aa).

## 7. AI and the Worker (README 4x, 4z, `ai-proxy/README.md`)
- `ai-proxy/worker.mjs` is a Cloudflare Worker with a Google sign-in check, 3 questions a day (20 for Premium, 200 for everyone), safety replies, and agent mode with `cleanActions`. Model: Gemma 3 12B on Workers AI, free tier.
- `AI_PROXY_URL` in the page is empty until the Worker is deployed, so Mentor AI is hidden.
- The page never holds a key. Consent: `state.aiConsent`. What is sent: `mentorSummary()` (never the name, the Oath or notes).

## 8. The business side
- Decks and documents live in `.work/` (local, not in git): `Level_up_presentation_77_A_checked.pptx`, `…_B_with_nutritionists.pptx`, `LEVEL_UP_Distribution_of_Work.docx` and older versions. Read them with `office-text.py`.
- Nutritionists are the company's biggest strength. The workflow: the AI drafts an answer, a nutritionist checks, adjusts and approves it before it is sent, and complex cases go to a doctor or nutritionist directly. Premium users always have a nutritionist; free users can pay for one.
- Premium preview price in the app: 37,500 soʻm a month. Financial model v7 (Nov 2026; check against the latest deck before quoting): lowest cash $22,307 in month 9; running profit lowest −$47,004 in month 8; payback in month 28 ($86,200); +$190,589 at month 36.
- The deck rules are in `CLAUDE.md` rule 9: a check means a list of problems, not a remade file.
