# Mission log

The team's memory between sessions. The lead updates it after **every** task: what is done, what is next, what is blocked. A new session (or a session after a restart or a long pause) reads this first and continues from "NEXT". Newest entries on top.

## Status board
| Mission | Status | Last update |
|---|---|---|
| 1.1 Safety walls 2.0 | ✅ done | 2026-11-12 |
| 1.2 Sync that never loses progress | 🔄 in progress | 2026-11-12 |
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
Mission 1.2, round A (running in parallel): coder steps 1–3 of the planner's plan (`changedAt` + the numbered `upgradeSave` runner with step 1, a pure `pickWinner` with a unit table, `vaultSnapshot` before overwrites) ‖ tester step 8a (`tests/fake-firebase.js`, an old-save fixture, `tests/sync.spec.js` reproducing today's data-loss paths with `test.fail`). Then round B: coder step 4 (one `cloudSync`, a push transaction, clan publish only after the owner check) on the fake. Steps 5–6 wait for the owner's answers to D9–D11.
🚦 Owner (D8): people write the held-out crisis and eating-distress phrases; that test (≥90% per language) gates setting `AI_PROXY_URL` (Mission 4.1). Keep `AI_PROXY_URL` empty and do not deploy the Worker until then.
Carried from 1.1 (optional, for health-safety in Mission 3.2): a soft answer could also show the library tips (now it shows only the kind text); "No one would notice" / "disappear for a while" still read as crisis; "Type fast for 10 minutes" reads as diet; "maqsad: 40 kg gantel bilan" is allowed as a lifting goal.

## Log
- 2026-11-12 17:35 UTC: Mission 1.2 started. The planner mapped every save path. Lead checked the headline claims in the code: every save bumps `saveCount` (so opening the app makes an old device "newer"); sign-in adopts by higher `saveCount`; the clan profile is published before any check (4111); deleting on one device is undone by an offline second device; there is no owner uid. Decision: start Mission 1.3's numbered migration runner now with one step (`schemaVersion` not in `defaultState()`). Found and fixed: the README copy of the database rules said `heroes`, not `hunters` (pasting it would refuse every cloud save); a test now pins the README copy to `database.rules.json`. Owner questions D9–D11 (shared phone, sign-out, deletion marker) logged in ROADMAP.
- 2026-11-12 17:15 UTC: **Mission 1.1 done.** Round 2 verified (held-out benign set: 0 of 169 everyday phrases fire, down from 9 before the mission's fix rounds; 53/60 nutrition questions get the careful diet answer). The reviewer's re-review of 80f28da found 2 blocking problems ("I hope I don't wake up again at night" and "hayotim befoyda emas" read as crisis; the soft net fired on a few everyday questions); the lead applied its exact fixes, plus the idioms and the lift/body-goal fix. Final: corpus 100% in every group and language, 0 of 741 normals, every unsafe agent command refused, 164 old terms kept, the whole suite 338/338. The session was idle 9–12 Nov (worker restarts); no work was lost.
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
