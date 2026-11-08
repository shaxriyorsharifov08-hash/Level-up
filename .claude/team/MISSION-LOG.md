# Mission log

The team's memory between sessions. The lead updates it after **every** task: what is done, what is next, what is blocked. A new session (or a session after a restart or a long pause) reads this first and continues from "NEXT". Newest entries on top.

## Status board
| Mission | Status | Last update |
|---|---|---|
| 1.1 Safety walls 2.0 | 🔄 in progress | 2026-11-08 |
| 1.2 Sync that never loses progress | ⬜ not started | — |
| 1.3 Exact undo + migrations | ⬜ not started | — |
| 1.4 Hardening + clock suite | ⬜ not started | — |
| 2.1 Russian and Uzbek complete | ⬜ not started | — |
| 2.2 QUESTS and NEW QUEST | ⬜ not started | — |
| 2.3 First minute + SETTINGS | ⬜ not started | — |
| 3.1 Forgiving streaks | 🚦 waiting for D2, D4, D5, D6 | — |
| 3.2 Humane game rules | 🚦 waiting for D2, D4 | — |
| 3.3 A habit on day one, friends earlier | 🚦 waiting for D4, D5 | — |
| 3.4 Measure what matters, privately | 🚦 waiting for D6 | — |
| 4.1 Mentor AI live | 🚦 waiting for D7 + Cloudflare account | — |
| 4.2 Diet calculator v1 (adults) | 🚦 waiting for D1 (Premium) | — |
| 4.3 Nutritionist workflow | 🚦 waiting for nutritionist partners | — |
| 4.4 Payments and one price | 🚦 waiting for D1, D7 + merchant accounts | — |

Status: ⬜ not started · 🔄 in progress · ✅ done · ⏸ parked (blocked; reason in the log) · 🚦 waiting for the owner

## NEXT
Mission 1.1, task 2 in progress: the coder rebuilds the lists against the corpus (the corpus and health-safety notes are in the session scratchpad; the coder copies the corpus to tests/fixtures/safety-corpus.json). Then: translator (112 sentence, eating reply) → tester (full suite) → reviewer ‖ health-safety with FRESH unseen phrases.

## Log
- 2026-11-08: 1.1 task done: phrase corpus (health-safety): 121–124 dangerous phrasings per language, 39 Cyrillic Uzbek, 113 normal, 32 unsafe and 26 safe agent commands. Today's walls catch 12–25% of crisis and 8–14% of eating phrasings.
- 2026-11-08: 1.1 task done: safety plumbing (coder). `mSafeNorm` (Uzbek Cyrillic, no apostrophes), one shared safety check, AI answer/ctx/turns filtered in the Worker and the app, agent refuses food restriction, body numbers, >100 reps and >10 km, summary drops unsafe names, 112/103 in the crisis text. Lead verified: 54 tests pass, unsafe agent cards gone; the lists themselves still miss most phrasings (next task).
- 2026-11-08: Mission 1.1 started (owner: "Start"). Plan: corpus ‖ plumbing → rebuild the lists against the corpus → translator → tester → reviewer ‖ health-safety.
- 2026-11-08: roadmap drafted from the team review; nothing started.
