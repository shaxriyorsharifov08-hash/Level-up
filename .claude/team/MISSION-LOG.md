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
Mission 1.1, closing: (a) the coder's small round 2 (5 held-out benign false alarms: "haven't eaten yet" and "I'm hungry" in EN/UZ/UZ-Cyrillic; ordinary nutrition questions route to diet) ‖ (b) the reviewer re-reviews the committed fix round 80f28da. Then the whole suite, the benign held-out probe again (`scratchpad/lead/benign-probe.js`), mark 1.1 ✅ if clean, and start Mission 1.2.
🚦 Owner (D8): people write the held-out distress phrases; that gate stays before `AI_PROXY_URL` is set (Mission 4.1). Keep `AI_PROXY_URL` empty.

## Log
- 2026-11-09 04:40 UTC: the coder (round 2) and the reviewer (re-review) both stopped on the 5-hour usage limit at about 15:00 UTC on 8 Nov (reset 18:50 UTC); the session then sat idle overnight. Round 2's edits were in the working tree, both blocks still identical. Both agents resumed with SendMessage.
- 2026-11-08 14:55 UTC: fix round done (coder) and committed as 80f28da after lead checks: corpus 100% in every group (fresh 191/191 positives), 0 of 699 normals, 55/55 unsafe commands refused, 32/32 safe ones work, 164 old terms keep their kind, 20/20 typical AI answers pass the answer check; 62/62 in the four specs, whole suite 338/338 (coder's run). Translator: the soft text is OK in RU/UZ. Lead's held-out benign probe (196 phrases the coder never saw): 0 fasting or negation false alarms; 5/169 everyday phrases still fire eating (HEAD: 9), all "haven't eaten yet" or "I'm hungry"; 23/60 nutrition questions get no kind. Both sent to the coder.
- 2026-11-08 14:20 UTC: reviewer's final review of HEAD 7c4c48e: 5 blocking findings, all reproduced. (1) Abuse disclosures the old lists caught ("someone hurts me", "насилие") now get no kind. (2) The Uzbek "-dan oz…" strip hides "Bugundan ozishni boshlayman", and those phrases became cards. (3) About 25 everyday false alarms ("repeat lessons", "bodyweight workouts", "вредные привычки", "tegishli"). (4) The AI-answer check uses RESTRICT, so "don't eat a heavy meal before sleep" would be replaced (a new `mSafetyKindAnswer`). (5) Health-safety's proposals add 31 new false alarms unless tightened. Every fix was sent to the coder's running round, with an old-terms regression test. 54/54 specs, speed and display checks clean.
- 2026-11-08 14:10 UTC: blind round 2 (a fresh health-safety agent that has not seen the patterns) wrote only the benign half: 196 diet/normal/safe-command phrases in 4 languages, hashed. A safety classifier stopped it writing crisis and eating phrases; not retried or routed around. The distress held-out set becomes an owner step (people write it), gating the Worker going live.
- 2026-11-08 14:05 UTC: health-safety's blind fresh-phrase round (304 phrases written before reading any pattern): 74.9% caught (en 81.7, ru 68.5, uz 67.9, uzCyr 90.5); 30 misses got no safety kind and 17 command-shaped misses became agent cards; 14 everyday phrases fired "eating" (negation, Ramadan fasting, "won't eat pork", "haven't eaten yet"). Verdict: the roadmap bar is met on the corpus, not on fresh wording. A fix round started; 1.1 stays open. The reviewer hit the usage limit (reset 13:50 UTC) and was resumed.
- 2026-11-08: whole suite after the list rebuild: 316 passed, 0 failed (6.4 min). Waiting for health-safety's fresh-phrase test and the reviewer.
- 2026-11-08: 1.1 task done: word lists rebuilt (coder). One SAFETY WALLS block shared word for word by the app and the Worker; corpus 100% in every group and language (EN/RU/UZ/UZ-Cyrillic), 0 of 445 normal questions trigger, 32/32 unsafe agent commands refused, 26/26 safe ones work. Coder's own fresh rounds caught ~70–90% before widening, so health-safety tests unseen phrases next. Lead verified: 54 specs pass; the 9-phrase probe is now all correct. Consent text c3 made honest ("questions the Mentor recognises").
- 2026-11-08 09:05 UTC: Agent HQ opened (owner's request): a 3D office showing each role's live status, https://claude.ai/artifact/NFeVzS2xSDRzVMYeqquYLu. Mission mode now updates it after every task.
- 2026-11-08 08:53 UTC: the coder hit the plan's 5-hour usage limit during task 2 (reset 08:40 UTC) and the session's worker restarted; no edits were lost (none had been saved). The check-in fired as planned and the coder was resumed with the same brief.
- 2026-11-08: 1.1 task done: phrase corpus (health-safety): 121–124 dangerous phrasings per language, 39 Cyrillic Uzbek, 113 normal, 32 unsafe and 26 safe agent commands. Today's walls catch 12–25% of crisis and 8–14% of eating phrasings.
- 2026-11-08: 1.1 task done: safety plumbing (coder). `mSafeNorm` (Uzbek Cyrillic, no apostrophes), one shared safety check, AI answer/ctx/turns filtered in the Worker and the app, agent refuses food restriction, body numbers, >100 reps and >10 km, summary drops unsafe names, 112/103 in the crisis text. Lead verified: 54 tests pass, unsafe agent cards gone; the lists themselves still miss most phrasings (next task).
- 2026-11-08: Mission 1.1 started (owner: "Start"). Plan: corpus ‖ plumbing → rebuild the lists against the corpus → translator → tester → reviewer ‖ health-safety.
- 2026-11-08: roadmap drafted from the team review; nothing started.
