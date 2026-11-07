# LEVEL UP: rules for every Claude session and every agent on the team

**What this is.** LEVEL UP is a habit-building game. The whole app is one file, `index.html` (CSS at the top, HTML in the middle, plain JavaScript at the bottom; no framework, no build step), served by GitHub Pages at `https://shaxriyorsharifov08-hash.github.io/Level-up/`. The optional Mentor AI server is `ai-proxy/worker.mjs` (a Cloudflare Worker, no packages). Tests are Playwright specs in `tests/`. `README.md` is the manual: every feature has a numbered section (4x Mentor, 4z Mentor agent, 4aa nightly check, 6b the AI dev team…). Read the section for the area you touch.

## The owner's rules (never break these)
1. **Never break existing user data.** Any change to the save schema needs a versioned migration that works with existing localStorage, IndexedDB and cloud (Firebase) saves, and a test that loads an old save.
2. **No API keys or secrets in client-side code.** The site is public. AI calls go through the Worker; explain cost and rate-limit risks.
3. **Diet calculator:** deterministic, standard formulas in code (name and cite the formula). AI may explain results, never compute them.
4. **Health safety:** clear "not medical advice" disclaimers, no extreme calorie targets, safeguards for minors and for signs of disordered eating, and a way to skip the feature.
5. **Privacy:** height, weight and age are personal health data. Store minimally, make it optional, allow export and deletion, and say exactly what is sent to any AI service.
6. **Offline, three languages, admin locks.** The app keeps working offline. New text exists in English, Russian and Uzbek (Uzbek in Latin script with `ʻ`: `oʻ`, `gʻ`), or falls back gracefully. Every new section or function is in the admin feature registry (`FEATURES`) so the Administrator can seal or remove it.
7. **No protected anime or game names or art.** Flag anything that looks risky.
8. **Working style:** before each change, say what will change and why; after it, explain what changed. Write or update tests. Prefer simple solutions. **Ask before adding any dependency.** If something is ambiguous, ask.
9. **Decks and documents** (PowerPoint, Word): when the owner only asks for a check, report the problems and do not remake the file. Never change words they wrote by hand, pictures, charts, or finance wording unless a number is wrong.

## Git
- Work on the branch the session names. Commit with clear messages. Never push to `main` or open a pull request unless the owner asks.
- Never put model names or IDs in commits, code or docs.

## Handy facts about the code
- **Project rules (README section 6):** no template literals (backticks) anywhere in the app's JavaScript, for old devices; keep `index.html` one file; never rename the storage key `leveluphunter_v1` or the IndexedDB name `leveluphunter_db`; `notify-sw.js` must never cache.
- Save: the global `state`, written by `save()`; new fields get defaults from `defaultState()` (the defaults merge). Old saves must load unchanged.
- Navigation: `switchPage(p)` (it respects locks); pages are listed in `PAGES` and `NAV_ORDER`.
- Locks: `FEATURES`, `FEATURE_GUIDE`, `featureRemoved(k)`, `featureSealedLv(k)`, `mFeatureOn(k)`.
- Text: Mentor text lives in `MENTOR_TXT` (each entry `{en, ru, uz}`, read with `MT(key, vars)`); other UI text is translated by `tr()` from the RU and UZ dictionaries.
- Quests: `openQuestModal(id, preset)`, `questCreationBlock(freq)`, `makeQuest(...)`; focus: `startTimer(id)`; to-dos: `makeTodo`, `addTodo`.
- Health and safety word lists: `MENTOR_CRISIS`, `MENTOR_EATING`, `MENTOR_DIET` (the Worker has its own copies).
- Tests: `npx playwright test --trace off` runs everything (about 6 minutes); one file: `npx playwright test tests/<name>.spec.js --trace off`. New specs boot the app with `bootAsGuest(page)` from `tests/helpers.js`; tests never touch the network.
