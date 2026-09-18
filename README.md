# LEVEL UP — Hunter System

A Solo-Leveling-style habit RPG. Real actions earn XP, XP raises your level, and the System rewards discipline. The whole app is **one file: `index.html`** — HTML, CSS and JavaScript together. No build step, no framework, no server of its own.

**This README is the owner's manual.** It explains how to run, edit and repair the app yourself, without any AI assistant.

---

## 1. Where the app lives

| Thing | Where |
|---|---|
| Code | This GitHub repository, branch **`claude/website-invention-cr4bd0`** |
| Live site | GitHub Pages → `https://shaxriyorsharifov08-hash.github.io/Level-up/` |
| Pages settings | `https://github.com/shaxriyorsharifov08-hash/Level-up/settings/pages` |
| Accounts & cloud saves | Firebase project **`level-up-hunter-03`** → `https://console.firebase.google.com/` |

GitHub Pages automatically republishes the site **1–2 minutes after every commit** to the branch above. You never "deploy" manually.

### ⚠ If the site suddenly shows a different project
This happened once: Pages was switched to another branch that contains a different app.
Fix: open the Pages settings link above → **Branch** → select `claude/website-invention-cr4bd0` → folder `/ (root)` → **Save**. Wait 2 minutes, then hard-refresh the site (Ctrl+Shift+R / clear browser cache).

---

## 2. How to edit the app WITHOUT any AI

You do not need any paid tool. GitHub itself has an editor:

1. Open the repo on github.com and make sure the branch selector (top-left) shows `claude/website-invention-cr4bd0`.
2. Click `index.html` → click the **pencil icon** (Edit).
3. Make your change → **Commit changes** (commit directly to the same branch).
4. Wait ~2 minutes → refresh the live site.

Tip: press `.` (dot) on the repo page to open **github.dev** — a full VS Code editor in the browser, free.

If something breaks after an edit: open the repo → **History** for `index.html` → open the last good commit → copy its content back (or click **Revert** on the bad commit). Nothing is ever lost — git keeps every version.

### Asking any AI for help later (free ChatGPT / Claude / etc.)
The file is large, so don't paste all of it. Instead:
- Describe the bug and paste only the **relevant section** (search the file for the panel title or button text you see on screen — the code is right next to it).
- Tell the AI these project rules: *single `index.html`, no template literals (no backticks) in JS, data is stored in localStorage under key `leveluphunter_v1`, never rename that key, never remove `save()` calls.*

### 2b. The tests will tell you if you broke it

`index.html` is one very large file, so every hand edit is a risk. **132 automated tests now run on GitHub after every single commit — you do not have to run anything.**

1. Commit your change.
2. Repo → **Actions** tab → newest run.
3. ✅ you did not break anything the tests know about. ❌ open it and read the `Expected` / `Received` line; it names the file and line.

A ❌ is not a disaster: your commit is in git, so revert it from **History** or fix and commit again.

They cover: the app booting at all, HTML injection through icon fields, a failed save being noticed, an old save keeping its fields, rank not being buyable, report deadlines, the calendar not colliding with the date picker, and a currency change converting every amount. Full list and how to add your own: **`tests/README.md`**.

On a computer: `npm install && npx playwright install chromium && npm test`. The tests open `index.html` from disk in a throwaway browser profile with the network blocked, so **they can never touch your real save** and never depend on a CDN being up.

---

## 3. Files in this repo

| File | Purpose |
|---|---|
| `index.html` | The entire app (CSS at the top, HTML in the middle, JS at the bottom) |
| `notify-sw.js` | Notification-only service worker. **Has no caching on purpose** — do not add caching to it |
| `sw.js` | Old service worker turned into a kill switch. Keep it — it cleans up old installs |
| `manifest.webmanifest` | PWA identity (name, icons, colors) for "Add to Home screen" |
| `icon-192.png`, `icon-512.png`, `apple-touch-icon.png` | App icons |
| `tests/` | The safety net — see **section 2b** below. Not part of the app; the live site ignores it |
| `package.json`, `playwright.config.js` | Only used to run the tests |
| `.github/workflows/tests.yml` | Runs the tests on GitHub after every commit |

---

## 4. Where the data lives (3 layers of safety)

1. **localStorage** — key `leveluphunter_v1`, saved on every action.
2. **IndexedDB vault** — database `leveluphunter_db`, a second copy plus 14 daily snapshots (see ADMIN → DATA VAULT in the app).
3. **Firebase cloud** — when signed in with Google (ADMIN → CLOUD SYNC), the save syncs across devices automatically.

Manual backup any time: **ADMIN → 💾 EXPORT JSON BACKUP** (restore with IMPORT). Do this before risky edits.

Editing `index.html` **never touches user data** — data lives in the browser and in Firebase, not in the file.

### Firebase (accounts, clans, cloud saves)
Console: `console.firebase.google.com` → project `level-up-hunter-03` (sign in with the Google account that created it).
- **Authentication** → list of signed-in users.
- **Realtime Database** → the actual saves (`hunters/…`), clans (`guilds/…`), invite codes (`codes/…`), admin flags (`admins/…`), broadcasts (`broadcast`).
- Free "Spark" plan is enough; there is nothing to pay or renew.
- If sign-in ever fails on the live site: Authentication → Settings → **Authorized domains** must include `shaxriyorsharifov08-hash.github.io`.

### ⚙ One-time ADMIN ACCOUNT setup (required for the 🛡 ADMIN login)
The entrance screen has a small **ADMIN** button (email + password). To make it work:

1. Firebase console → **Authentication → Sign-in method** → enable **Email/Password**.
2. **Authentication → Users → Add user** → enter YOUR admin email and a strong password.
3. Copy that new user's **UID** (shown in the users table).
4. **Realtime Database → Data** → create: `admins → <paste the UID> → true`.
5. **Realtime Database → Rules** → replace with the rules below → **Publish**:

```json
{
  "rules": {
    "hunters": {
      ".read": "auth != null && root.child('admins').child(auth.uid).exists()",
      "$uid": {
        ".read": "auth != null && (auth.uid === $uid || root.child('admins').child(auth.uid).exists())",
        ".write": "auth != null && (auth.uid === $uid || root.child('admins').child(auth.uid).exists())"
      }
    },
    "admins": {
      ".read": "auth != null",
      ".write": false
    },
    "broadcast": {
      ".read": true,
      ".write": "auth != null && root.child('admins').child(auth.uid).exists()"
    },
    "season": {
      ".read": true,
      ".write": "auth != null && root.child('admins').child(auth.uid).exists()"
    },
    "systemLocks": {
      ".read": true,
      ".write": "auth != null && root.child('admins').child(auth.uid).exists()"
    },
    "roadTemplate": {
      ".read": true,
      ".write": "auth != null && root.child('admins').child(auth.uid).exists()"
    },
    "guilds": {
      ".read": "auth != null",
      ".write": "auth != null"
    },
    "codes": {
      ".read": "auth != null",
      ".write": "auth != null"
    }
  }
}
```

After that: entrance screen → ADMIN → your email + password → the app switches into a **console-only view**: no navigation, no quests, no play — just the admin panel. There you can load every user, edit a chosen user (name, level, XP, stat points), seal/unseal sections for everyone, broadcast a System announcement, and launch season events. These rules — not the app — are what actually protects user data: only each user and the admin UID can touch a save. Press **🚪 EXIT ADMIN MODE** to leave — it signs the admin account out and returns the device to its own hunter (guest or Google), untouched.

### 🚫 Admin never plays, by design
Logging in as admin (any email/password account) is treated as an administrator login, never as a hunter — even if that account isn't yet listed under `admins/`, it's rejected with a message rather than silently becoming a new hunter. This keeps the two identities completely separate: the admin's local device save (whatever guest/Google hunter was active before) is never read from or written to while in admin mode.

---

## 4b. THERE IS NO WORLD MAP — and that was a decision

For a while the app opened on a **walkable top-down city** with a joystick, buildings you entered, an isometric Academy interior and a WebGL 3D version of it. **All of it was removed on 2026-09-16.**

It is documented here so nobody — no future you, no AI you ask for help — rebuilds it by accident.

**Why it went:**

- It put a **walk** between the hunter and every single action. The whole point of this app is that you open it and do the thing. A lobby is a toll booth.
- It was **~57,000 characters of engine** (renderer, collision, joystick, isometric projection, Three.js scene) serving zero habits. Every one of those lines was a line that could break the app that actually matters.
- The 3D interior made the room depend on a **CDN fetch**. Offline, it fell back — which means the best case was a feature nobody could rely on seeing.
- It competed with the **+1% dock**, which already reaches every section in one tap and always did it faster.

**The rule that replaced it:** *simple, but compelling.* Compelling comes from the **content and the voice** — the Oath, the Reports, the Rank trials, the Chronicle — not from graphics this project has no artist for.

**What survived, and where it went:** the city's one genuinely good idea was **ordering sections by intent rather than by feature**. That lives on in the dock order — HOME · QUESTS · LEARN · TIMER · PROFILE · STATS — which is exactly the order of a real day. Nothing else was worth keeping.

An old save that was standing in the world still opens normally: `migrateState()` deletes the leftover `state.world` and the app lands on HOME. There is a test that asserts this, and another that asserts no part of the world engine has crept back in.

## 4c. LEARN & GROW — the four roads

A teaching section, not a tracking section (the 🌱 LEARN tab).

Four categories — **DISCIPLINE (CON)**, **EDUCATION (INT)**, **PHYSICAL (STR)**, **EMOTIONAL (END)** — each a ladder of **10 levels** that alternates:

- a **VIDEO** level (a written lesson plus a button that opens a YouTube search for exactly that topic), and
- a **TASK** level built on the lesson before it — a real action in the real world, sometimes running for 7, 14 or 30 days.

**A level stays sealed until the level before it is completed.** Completing one grants XP and attribute training that grow as you climb (Level 1 = +40 XP / +2 points, Level 10 = +148 XP / +5 points).

Videos are **not hosted** — that would need a paid server. Instead each video level opens a YouTube search for the lesson topic, and you can **paste your own link** into the level to pin the exact video there forever (saved per device, under `state.learn.links`).

**A lesson must produce action, or it is just motivation followed by nothing.** Every TASK level has an **⚔ ACCEPT** button that creates a **real quest in your log** — a daily quest for its full length (a 3-day vow becomes a 3-day quest, the 30-day vow a 30-day one), or a one-time goal if it is a single-sitting task. The System assigns it, so **it never spends a quest slot** and works from Level 1. The level itself is sealed until you come back and say it is genuinely done, and the quest stays in your log afterwards so you can keep it as a habit or delete it.

To change the curriculum, edit `LEARN_PATH` in `index.html`: `t` is `"video"` or `"task"`, `n` is the title, `d` is the body, `q` is the YouTube search text, `dur` is how many days a task's quest should run.

## 4d. THE FOCUS WINDOW — ⏱ takes the whole screen

Pressing ⏱ on any quest or to-do **takes over the screen**. A focus timer that shares a screen with the thing you are avoiding is not a focus timer.

The window holds one task name, one ring, one clock, and nothing else:

- **Target chips** — 25 / 50 / 90 minutes, or NO TARGET. The ring fills toward it and your choice is remembered in `state.focus.goalMin` for the next session.
- **Reaching the target chimes and turns the ring gold, and then keeps counting.** It does not stop you — stopping is your decision, not the app's.
- **PAUSE** / **FINISH**, and a **–** that closes the window.

**Closing the window does not stop the clock.** The session lives in `state.activeTimer`, so the timer pill returns at the bottom of the screen and tapping it opens the window again. Nothing is lost either way, and a test asserts it.

The window is redrawn by the same one-second loop that drives the pill, so it survives a reload mid-session.

This is a different thing from the INTERVAL TIMER below: that one runs **rounds of physical training**; this one is for sitting down and working.

### ⚙ GRIND — work and rest cycles

The ⚙ in the corner opens the timer's settings **inside the window**, so changing something never means leaving focus.

**MODE** picks between **STOPWATCH** (counts up, described above) and **GRIND** (a pomodoro cycle). Grind presets are **25 / 5**, **50 / 10** and **90 / 20**, and both numbers are editable — anything from 1 to 180 minutes of work and 0 to 60 of rest. Out-of-range values are clamped rather than left to break the cycle maths.

In grind the window shows **WORK · CYCLE 3**, the ring counts down inside the current phase, and the phase turns over on its own with a chime and a colour change (blue for work, green for rest).

**Rest is never logged as focus time.** `focusWorkedSec()` returns only the work phases, and that is the number `stopTimer()` records — finish a 28-minute grind session and the app logs 25 minutes, because that is what you worked.

**Nothing in grind stores its own timestamps.** The phase, the cycle count and the worked seconds are all *derived* from `timerElapsedSec()`, which already understands pausing:

```
cycle = work + rest
pos   = elapsed % cycle          → where you are inside the current cycle
phase = pos < work ? work : rest
worked = floor(elapsed/cycle) * work + (working ? pos : work)
```

That is not a style preference. A backgrounded phone stops ticking, so a timer that *counts* phases would wake up frozen three cycles behind. Deriving them from the clock means it wakes up correct. A test sleeps a session through three whole cycles and asserts it comes back in the right phase with the right worked total.

### Themes, and your own wallpapers

**Seven built-in themes** — VOID, HIDDEN LEAF, CURSED, EMBER, TIDE, STEEL, SAKURA — each drawn entirely in CSS gradients. The app ships **no image files**, on purpose: that is what keeps it one file that opens instantly, and it also means it ships nobody else's artwork. If you want actual anime art on your timer, **upload it** — that is what the upload button is for, and it is your file.

Theme rules are written as `[data-fx="leaf"]` rather than `#focusOv[data-fx="leaf"]`, and sized in **percentages rather than pixels**, so the identical rule paints both a full screen and a 90px settings swatch. The swatch therefore wears the real theme instead of an approximation of it.

**🖼 UPLOAD A WALLPAPER** takes any image, or several at once. Each one is downscaled to `WP_MAX_PX` (1440px on its long edge) and re-encoded as JPEG before being stored, up to `WP_MAX` of them.

**Where they are stored is the important part.** A base64 image in `state` would be written to localStorage *and* pushed to the cloud save on every single change — one photo would break both. So:

| | |
|---|---|
| `state.focus.wallpapers` | `[{id, name}]` and **nothing else** |
| IndexedDB, key `wp:<id>` | the actual bytes, on that device only |

A test asserts that after an upload, the string `data:image` appears **nowhere** in the save or in localStorage. Wallpapers are never uploaded anywhere, never synced, and never leave the device.

### 🔔 THE ALARM — and exactly how far it reaches

**Read this before trusting it with anything that matters.** A web page is not an OS alarm clock, and this section says what it really does rather than what would sound better:

| Situation | Does it ring? |
|---|---|
| Screen on, app open | **Yes.** Any sound, any length. |
| Screen on, another app or tab in front | **Yes.** The sound is handed to the audio hardware in advance, so a throttled tab cannot swallow it. |
| Screen locked, app still resident | **Usually, on Android**, thanks to the silent keep-alive loop. **On iPhone this is unreliable** and may be silenced at any moment. |
| App force-closed, browser killed, phone powered off | **No. Never.** |

That last row is not a bug to fix later. There is no web API for it: Notification Triggers was removed from browsers, and web push needs a server this app deliberately does not have. Only a native app can wake a powered-off phone. The settings panel prints this same warning, and a test asserts the wording never quietly starts claiming otherwise.

**How it survives what it can survive.** The alarm is never fired by `setTimeout`. When a grind phase begins, the sound is *scheduled on the AudioContext clock* for the exact moment the phase ends (`alarmArm()`), because that clock keeps running when JavaScript timers are throttled to a crawl. Alongside it:

- a **silent looping buffer** (`keepAliveOn()`) stops mobile browsers suspending the audio context the moment the tab goes to the background — without it, a scheduled alarm simply never sounds;
- **MediaSession** metadata puts the session on the lock screen, which also makes Android less likely to evict the page;
- a **notification** fires as a visual backup where permission was granted.

Re-arming cancels whatever was already scheduled (`alarmCancel()`), so changing the tone or the cycle mid-session does not stack alarms on top of each other. A test asserts the second arm does not double the pending voices.

**Six built-in tones** — CHIME, BELL, ASCEND, PULSE, GONG, ALERT — every one *synthesised* from oscillators, so the app still carries no audio files and still carries nobody else's ringtone. Volume and a repeat count (1–6) apply to all of them.

### 🎵 Your own sounds, trimmed to the part you want

**UPLOAD A SOUND** takes a ringtone or a whole song, then opens a picker: slide to the start, set a length up to **30 seconds**, PREVIEW it, save it. What gets stored is only that slice.

The pipeline is `decodeAudioData` → `OfflineAudioContext` render of the chosen span → **mono at 22 050 Hz** with a short fade at each end so an alarm never starts or ends on a click → WAV → the vault. Mono is not a compromise here; an alarm has no use for stereo, and it roughly halves what the device has to keep.

Storage follows the same rule as wallpapers, for the same reason — audio in `state` would be written to localStorage *and* pushed to the cloud save on every change:

| | |
|---|---|
| `state.focus.sounds` | `[{id, name, sec}]` and **nothing else** |
| IndexedDB, key `snd:<id>` | the trimmed audio, on that device only |

A test asserts `data:audio` appears nowhere in the save or localStorage after an upload. Deleting the sound that was serving as the alarm falls back to CHIME rather than leaving the timer mute.

### LAPS — how many cycles before it stops

**2 / 4 / 6 / ENDLESS**, or any number up to 24 typed in. The window counts *WORK · CYCLE 3 / 4*, and when the last lap finishes the session **ends itself**: alarm, notification, and a System announcement with the real worked total.

That check lives in `grindTick()`, which the one-second loop runs **whether or not the focus window is open** — a finished grind has to finish even if you closed the window an hour ago. `ENDLESS` (0) never self-terminates.

**CHANGE EVERY** rotates the picture on a timer — NEVER, 5, 25 or 50 minutes — and grind also swaps the picture on every phase change. The index is `floor(workedSec / everyMin) % count`, so it wraps and needs no state of its own.

## 4e. THE INTERVAL TIMER

TRAINING YARD → ⏱ INTERVAL TIMER (or the ⏱ TIMER tab). Rounds of work and rest, for the body — **distinct from the Focus Timer**, which measures one long unbroken session on a quest.

Presets: TABATA (20/10×8), HIIT (40/20×10), EMOM (60/0×10), STRENGTH (45/90×5), or CUSTOM. Work is clamped to a 5-second minimum, rounds to 99.

Finishing a session **logs the work time into the same `timeHistory` the STATS page charts**, trains END, and grants XP proportional to the time worked (capped at 120). Nothing here is decoration — the System counts every round.

## 4f. THE OATH — the hunter's own words, used against them

Before the System opens, every hunter answers four questions **in their own words** and signs them:

1. What are you running from?
2. What have you already failed at?
3. Who will you be?
4. **What do I say to you when you want to quit?** — they write the exact words; the System uses them verbatim.

Each answer needs at least 20 characters and the oath **cannot be skipped**. Existing hunters are asked once, on their next open. Everything is stored in `state.oath` — on the device, and in their own Firebase account if signed in. Nobody else can read it.

**The point is not the form. It is where the words come back.** `oathLine(kind)` returns the hunter's own sentence, and it is appended to:

| Moment | What it quotes |
|---|---|
| XP debt from silent days | *the life they swore to escape* |
| Penalty quest | *the promise they admitted to breaking before* |
| Level up | *who they swore they would be* |
| Rank up | *who they swore they would be* |
| Mentor, after 3+ empty days in a week | *their own anti-quitting words, instead of generic advice — this is now the only place the "quit" answer is quoted, since QUEST LOCKDOWN was removed* |

Nothing speaks over the Oath: any System announcement already on screen is parked and resumes the moment the oath is sealed.

The oath can be re-sworn (PROFILE → THE OATH). **Re-swearing never erases the original** — the first `sworn` date is what the System keeps quoting, and every earlier version is kept in `state.oath.prev`.

To change the questions, edit `OATH_Q` (`k` is the storage key, `n` the question, `h` the hint, `p` the placeholder) and `OATH_PRE` for the opening text. Adding a question means adding a matching case to `oathLine()` if you want it quoted anywhere.

## 4g. PUNISHMENTS — and the one that was removed

Two punishments remain, and they share a rule: **they cost you, but they never take the work away.**

- **XP debt** — each fully empty day adds 60 XP of debt; half of every gain is seized until it is repaid.
- **Penalty quest** — miss the Daily Package and the Penalty Zone opens; all XP is frozen until you serve the penalty task and confirm it.

**QUEST LOCKDOWN was removed on 2026-09-16.** Two consecutive empty days used to make the System pick two of your quests at random and **seal them for seven days** — you could not complete them, and a `⛔ SEALED · 5d left` tag sat on the card.

It is the one punishment that works against the app. Every other penalty makes returning *expensive*; this one made returning *impossible* for the specific things you came back to do. A hunter who disappears for two days and opens the app on the third has already done the hard part. Locking their quests tells them to come back later, and later is how it ends.

Removing it is not free: it was the only caller of `oathLine("quit")`, the moment that quoted your own anti-quitting sentence back at you. That sentence now surfaces only through the **System Mentor**, after three or more empty days in a week. If you want it announced at the moment of failure again, it belongs on the XP-debt announcement, not on a seal.

A save written while quests were sealed is **released on open** — `migrateState()` strips every `lockedUntil` and the lockdown marker, so nothing stays locked forever. Two tests assert both halves: the punishment cannot fire, and an already-sealed quest becomes completable again.

## 4h. REPORTS — written by you, and mandatory

STATS → 📋 REPORTS. The System already grades your month automatically; these are the other half — **what you write, in your own words, when a period closes**.

| Report | Opens | Deadline |
|---|---|---|
| 🗓 WEEKLY | the Monday after the week ends | **1 day** |
| 📅 MONTHLY | the 1st of the next month | **3 days** |
| 🏛 ANNUAL | 1 January | **7 days** |

Before you write, the System hands you the numbers it already has for that period — quests cleared, XP, active days, focused hours — so the report is for what the numbers *do not* show. Minimum 40 characters.

**Missing a deadline costs XP debt** (40 weekly, 120 monthly, 300 annual), announced by the System and never charged twice for the same period. A missed report can still be filed; the record permanently says LATE, and a late filing earns no XP. Filing on time pays 30 / 80 / 200.

**No report is ever demanded retroactively.** `state.reportsSince` is stamped the first time the feature runs, so a hunter who was already playing is never billed for weeks that closed before the rule existed.

## 4i. ONE QUEST, FULL SCREEN

In QUESTS, **tap a quest card** (anywhere except its buttons) and it opens full screen with everything the System knows about that one habit:

- current streak, best streak, total times cleared, how many of the last 30 days, progress toward the next reward, total time logged
- a **12-week grid** — one square per day, lit on days you cleared it — and a plain sentence saying whether you are rising, slipping or holding against the previous 30 days
- **its own interval timer**, whose rounds are saved with that quest (`q.iv`). Finishing a session logs the time **against that quest**, and satisfies a ⏱ TIMER QUEST
- every completion date on record, newest first

The interval engine is one engine with two faces (`iv.ui` is `"iv"` for the TRAINING YARD page or `"qv"` for the quest window), so only one session can run at a time — which is also the truth about doing interval work. A session started inside a quest keeps running and still logs correctly if you close the window.

## 4j. RANK — eligibility is not promotion

Rank used to be a pure function of your attribute total, which made it **buyable**: bank stat points, spend them all at once, and wake up an A-Rank without ever having done what an A-Rank does. Three things changed.

**1. Attributes only make you ELIGIBLE.** The rank you hold is stored in `state.rank` and is *granted*, never computed. Reaching a threshold opens a **RANK EVALUATION** (PROFILE → ⚖ RANK EVALUATION), and you must press REQUEST EVALUATION with every condition satisfied. **A rank, once earned, is never taken back** — losing attributes cannot demote you.

**2. The evaluation is about what you sustained**, not what you accumulated. `RANK_TRIALS` in `index.html` holds the conditions per rank:

| Rank | Streak | Cleared | Finalized | Academy | Focus | Reports | Honors |
|---|---|---|---|---|---|---|---|
| D | 7 | 20 | — | — | — | — | — |
| C | 14 | 60 | 5 | 4 | 3h | — | — |
| B | 21 | 150 | 15 | 10 | 10h | 1 | 1 |
| A | 30 | 300 | 30 | 20 | 30h | 3 | 3 |
| S | 60 | 600 | 60 | 30 | 80h | 8 | 8 |
| NAT'L | 100 | 1200 | 120 | 40 | 200h | 15 | 20 |

Every rank also demands a **clean record** — no XP debt outstanding, no penalty active. Edit `RANK_TRIALS` to retune any of it.

**3. Stat points stopped flooding in.** Two sources were inflating them:

- one free point **every level** → now **every third level**
- the story road paid **+2 SP on most levels** (~144 points across the climb) → now **+1**

Across 99 levels that is **243 attribute points before, 105 after**. Existing saves are migrated once (`roadSpV3`), and **only the untouched default value of 2 is halved** — a road the Administrator edited keeps whatever they chose, and levels already claimed are unaffected.

## 4k. Reliability rules (do not remove these)

Three defects found in an audit, each proven with a test before it was fixed:

- **Icon and emoji fields are free text and are rendered as HTML.** A quest icon of `<img src=x onerror=...>` used to execute. Every icon/emoji is now passed through `esc()` at render. **If you add a new place that prints `q.icon`, `col.emoji` or `it.emoji`, wrap it in `esc()`.**
- **A save that fails must never be silent.** `localStorage.setItem` was wrapped in `try{}catch(e){}` with an empty catch, so a full quota meant the hunter kept playing while nothing was written. `save()` now detects the failure and raises a full-screen warning telling them to export a backup. Never restore the empty catch.
- **One uncaught error used to kill the app.** `window.onerror` and `unhandledrejection` now show a red recovery bar with RELOAD, instead of a frozen screen with no way back.

### Pruning the save

`pruneState()` runs on load. Day rows older than **400 days** (`PRUNE_KEEP_DAYS`) are folded out of `history`, `timeHistory` and `streakHistory` into `state.archive`, and each quest keeps its most recent **500** completions with the rest counted in `q.clearedBefore`.

**All-time totals stay exactly right** — `allTimeCleared()`, `allTimeXp()` and `questTimesCleared()` add the archive back, so a rank evaluation still sees every quest you ever cleared. STATS shows a line saying what was folded away.

**Nothing you wrote is ever pruned.** Journals, reports, honors, dreams and the Oath are untouched, by design. If you add a new store of the hunter's own words, do not add it to `pruneState()`.

Honest measurement: this cuts the *mechanical* half of the save by about 38% and, more importantly, stops `completions` and `streakHistory` growing without limit. It does **not** shrink the save dramatically, because after two years the bulk is your own journal — roughly 200 KB a year against a ~5 MB browser limit, which is about 25 years of writing. That is not a problem and should not be "fixed" by deleting it.

### Accessibility

`a11yFix()` walks the DOM and repairs the two things that actually lock a screen-reader user out, then a `MutationObserver` re-runs it whenever a panel re-renders — **so a new panel needs no extra work**:

- every `input` / `textarea` / `select` gets an accessible name, from its `.form-lbl` or `<label>`, else its placeholder, title or a humanised id
- icon-only buttons take their `title` as an `aria-label`

Plus: `#toasts` is a polite live region and the System announcement is an assertive `alertdialog`, so both are spoken rather than only shown; every modal is a `role="dialog"`.

Still open: focus is not trapped inside modals.

## 4l. THE QUEST HUB — four squares

QUESTS opens on a **2×2 grid of squares**, the way LEARN opens on its four roads:

| Square | What it holds |
|---|---|
| 📜 **QUESTS** | everything you committed to — daily, weekly, custom-day **and one-time goals** |
| 📅 **CALENDAR** | opens the month view (section 4m) |
| ✅ **TO DO LIST** | the plain list (section 4o) — not a quest, not in the game |
| 🔥 **CHALLENGES** | streak quests — miss a day and the count returns to zero |

**They are a selector, never a doorway.** The list is already rendered underneath, so opening QUESTS from the dock and clearing today's quests is still **one tap**, exactly as before. That rule is not decoration — putting a landing screen in front of the daily loop is the mistake section 4b describes, and a test asserts the quest list is on screen with no click at all.

Each square carries **live counts**, not a label: how many of today's quests are cleared, how many goals are open versus achieved, your longest running challenge streak, and what today's date holds.

- The **frequency chips** (ALL / DAILY / WEEKLY / CUSTOM / ONE-TIME GOAL) show only on the QUESTS square — CHALLENGES holds one frequency already and TO-DO is not a quest list at all.
- Switching squares **clears the filters**, so a chip left on cannot make the next square look empty.
- Creating a quest **follows it to its square**: write a one-time goal while the QUESTS square is open and the app moves to GOALS so you can see it land.
- The QUESTS square shows both `QUEST SLOTS` and `GOALS STARTED THIS WEEK`, because one-time goals cost no slot — they are capped per week instead.

To add or rename a square, edit `QTAB_FREQS`, `QTAB_TITLE`, `QTAB_NOTE` and `QTAB_EMPTY` in `index.html`, then add its tile in `renderQTabs()`. A square must map to a real set of quests; a square that holds nothing is worse than no square.

## 4m. THE CALENDAR

QUESTS → **📅 CALENDAR** at the top of the section.

A month grid: a **green** count on days you cleared something, a **red dot** on past days where nothing was done, a **blue** count on days that have something scheduled ahead. Tap any day and it opens as its own screen — a plain list of the quests and goals that belonged to that day with **name, description and status** (COMPLETED / NOT DONE / NOT YET / SCHEDULED). No editing, no detail; it is an overview. `‹` goes back to the month.

A quest appears on a day if it was scheduled then (daily and weekly every day, custom on its chosen weekdays, goals and challenges inside their start/end window) **or** if it was actually cleared that day — so changing a schedule later never rewrites the past. Quests created after that day never appear on it.

Days older than the detailed records (see pruning) carry a note saying completions may be incomplete.

**Naming warning:** the app already had an `openCalendar(inputEl)` date picker for quest start/end fields, using `#calGrid`, `#calPrev`, `#calNext` and `.cal-*` classes. The quest calendar is namespaced **`qc`** (`qcOpen`, `#qcGrid`, `.qc-*`) to stay clear of it. Two tests guard the old picker. In one file this large, check a name before you reuse it.

## 4n. CHANGING CURRENCY CONVERTS THE MONEY

BUDGET → currency picker. Changing it no longer swaps only the symbol — it asks how many of the old currency make one of the new, shows what your balance becomes, and then converts **every transaction, savings goal and store item**.

Rates live in `FX_PER_USD` in `index.html` and are **built in and approximate** — there is no server to ask, and the app must work offline. The suggested rate is always editable before converting, so today's real rate wins. `so'm` defaults to 12,600 to the dollar.

Three choices every time: **CONVERT**, **SYMBOL ONLY** (leave the numbers alone), or **CANCEL**. Converting there and back returns the original amounts. An empty budget just changes the symbol with no prompt.

### Amounts group themselves while you type

Typing `12000` into a bare box and reading it back is genuinely hard, so every amount field now groups its thousands **live**: it shows `12,000` as you type, and `2,500,000` for a savings target.

A `type="number"` input **cannot hold a comma** — the browser rejects the value — so these five fields (`#txAmount`, `#txmAmount`, `#goalTarget`, `#wishPrice`, `#fxRate`) are `type="text"` with `inputmode="decimal"`, which still opens the numeric keypad on a phone. Three rules follow from that, and breaking any of them breaks the budget:

1. **Never `parseFloat(el.value)` on one of these.** Always `moneyNum(el)`, which strips the commas first. A raw `parseFloat("12,000")` returns `12`, silently, and logs the wrong expense.
2. **Never assign a number straight to `.value`.** Use `moneySet(el, n)` so the field opens already grouped.
3. `min` and `step` no longer validate anything, so each field keeps its own `> 0` guard in JS. They already had them.

`moneyGroup()` allows exactly one decimal point and **never truncates the decimals you typed** — the FX rate needs more than two places, and silently cutting them would be data loss. The caret is restored by counting digits before it rather than raw characters, so typing into the middle of a number does not throw you to the end.

## 5. Features you may want to adjust later

- **Language**: ADMIN → 🌐 LANGUAGE. English is the base; Russian is a dictionary at the top of the JS in `index.html` (search for `I18N_RU`). Any string missing from the dictionary simply stays English — it can never break the app. To add Uzbek: copy the `I18N_RU` table to `I18N_UZ`, translate values, add `<option value="uz">O'zbekcha</option>` in the LANGUAGE panel, and extend `tr()` / `trTextNode()` / `startI18n()` where they check `=== "ru"`.
- **Finalize the Day** now asks three things: *what interesting thing happened*, *what mistake did you make and how will you fix it*, and *what you expect from tomorrow*. Pages written under the old questions (learned / changed me) still display correctly in PROFILE → Pages of the Hunter — nothing written is ever lost.
- **Notifications**: ADMIN → 🔔 NOTIFICATIONS. A daily reminder fires at the chosen time if quests are unfinished. It works while the app is open in a tab or installed on the home screen; it is *local* (no push server), so a fully-closed phone browser won't ring — that is a platform limit, not a bug.
- **Navigation**: ADMIN → ✎ RENAME & REORDER TABS. The bottom **+1%** button opens/closes the menu.
- **The progression model (single mode)** — every hunter climbs the same story path to **Level 100**:
  - Levels 1–4: only the 4 Daily Quest package items (editable, capped at exactly 4) plus **one-time goals** (max 10 per rolling week).
  - Recurring custom quests need **quest slots**, granted by the story path (+2 at Lv.10 by default, more at 14/18/22/26/30/40/60/80). Weekly goal capacity also grows on the road (Lv.12/20/35/55).
  - Sections open by level (defaults: STATS 4, REWARDS+INVENTORY 6, HONOR 8, CLAN 12, BUDGET 15) — override any of them for everyone in 🛡 ADMIN CONSOLE → SECTION LOCKS. HOME, PROFILE, QUESTS, STORY, GUIDE and SETTINGS can never be locked.
  - XP curve: `100 + lv^1.7` per level — early levels come in days, late levels take a week+; the full road ≈ a year of daily discipline.
- **The user page is now ⚙ SETTINGS** (was ADMIN): cloud sync, theme, sounds, language, notifications, name, tab labels, hero portraits, backups, quotes, their own quest/collection lists and daily package. The story-road editor and the skill/equipment item editor are **admin-only** (they influence progression).
- **Story path is admin-owned**: 🛡 ADMIN CONSOLE → "🗺 Story path" → EDIT (opens the road editor) → **PUBLISH TO ALL USERS**. Every hunter's road is replaced by your template (already-claimed levels stay claimed). Row types include rolls, stat points, ⚔ QUEST UNLOCK (creates a named quest at that level), **🎫 QUEST SLOTS** and **🎯 WEEKLY GOALS +** permits.
- **Season events**: 🛡 ADMIN CONSOLE → "🌀 Season event" — write a title, message, end date and up to 8 quests, press LAUNCH. Every user receives the announcement and the 🌀 quests; after the end date the quests remove themselves. Launching a new season replaces the old one (each user gets each season exactly once).
- **Sign-in inside the installed app**: the home-screen app uses the popup sign-in flow (the redirect flow cannot finish in standalone mode). If sign-in still fails there, sign in once in the normal browser tab first — the installed app shares the same storage.
- **Daily package, story road awards, inventory, quotes, hero portraits** — all editable inside ADMIN, no code needed.

---

## 6. Project rules (why the code looks the way it does)

- **No template literals** (no backticks) anywhere in the JS — old-device compatibility. Use `"a" + b`.
- **One file.** Do not split `index.html` into modules; simplicity is what makes it maintainable by hand.
- **Never rename** the storage key `leveluphunter_v1` or the IndexedDB name `leveluphunter_db` — users would "lose" their progress.
- **`notify-sw.js` must never cache.** A caching service worker on the shared `github.io` origin once mixed this app with another project.
- New state fields go into `defaultState()` — old saves pick them up automatically on load.

## 4o. THE TO-DO LIST — and the HALL OF SHAME

QUESTS → **✅ TO-DO**. A plain list, on purpose.

Write a line, press Enter, it exists. Tap the circle to tick it. That is the whole interaction — **no tier, no stat, no reward crate, no roll, no trophy, no target count, no priority lock.** If something deserves those, it is a quest, not a to-do, and the QUESTS square is where it belongs.

Each to-do carries exactly four things that matter: **its text, its day, whether it is done, and how long you timed it.** The ⏱ button runs the same focus timer the quests use, and the tracked time shows on the row.

**It is outside the game economy, deliberately:**

### Its time reads as one number

The list shows **one accumulated total for the day** — *⏱ 40m on this list today* — not a stopwatch on every row. The per-task split is still recorded on each to-do (`td.sec`); you see it when you open that day in the calendar. Working time is one number in the moment and a breakdown in hindsight, which is the right way round.

| | |
|---|---|
| XP | a flat **10 XP**, paid **once per to-do, ever** (`td.paid`) |
| Ticking and unticking | pays nothing the second time — it cannot be farmed |
| Hall of Honor | never. A hall full of *buy milk* is not a hall |
| Rank trials | never. `rkCleared()` does not see to-dos |
| Streak / XP debt | **also never** — a day of only to-dos still counts as an empty day |

That last row is a real trade-off and you should know it: doing six to-dos does **not** protect your streak. To-dos are errands; quests are commitments, and only commitments hold the chain. If you decide it should protect the streak, `toggleTodo()` is where the second argument to `recordHistory()` would change — but then to-dos start feeding rank again through the back door.

### The list groups itself

**⚠ OVERDUE** first (anything whose day has passed, oldest first), then **TODAY**, then **DONE TODAY**, then **LATER**. Nothing is ever hidden behind a filter.

### In the calendar

Open any day (section 4m) and a **📝 TO DO LIST · 1 / 2** button sits under that day's quests. Tap it and the day's to-dos expand with their status — COMPLETED / NOT DONE / NOT YET / PLANNED. It stays behind the button so the day view is not two lists fighting each other.

### 💀 HALL OF SHAME

HONOR → **💀 HALL OF SHAME** (the button carries the count). It lists every to-do whose day came and went without you, **oldest first**, with how many days late it is.

The Hall of Honor keeps what you finished. This keeps what you didn't. There are two ways out of it and only two:

- **DO IT TODAY** — moves the to-do to today. It leaves the hall the moment you actually do it.
- **LET GO** — deletes it, with a confirm. Nothing is recorded; you simply admitted it was never going to happen.

There is no third button, and nothing expires out of the hall on its own. That is the point of it.

## 4p. A DAY, OPENED AS A FILE

Open any date in the calendar and the day reports itself, in this order:

1. **TIME SPENT · COMPLETED · TASKS DONE** — three figures across the top. The percentage counts quests *and* to-dos together, because that is what the day actually was.
2. **Where the hours went** — one bar per section: 📜 QUESTS, 🔥 CHALLENGES, ✅ TO DO LIST, 🏋 TRAINING (the interval timer). Only sections with time on them appear.
3. **QUESTS & CHALLENGES** — the list, each with its own tracked time.
4. **📝 TO DO LIST · 1 / 3 · ⏱ 40m** — a button that expands that day's to-dos, **each with the time you spent on it**.

### How the split is recorded

Every tracked second is written in **two** places, and only `logTime(secs, kind)` writes them:

| | |
|---|---|
| `state.timeHistory[date]` | the day's **total** — what the STATS charts have always read |
| `state.timeBy[date]` | the **same total**, split into `{quest, challenge, todo, interval}` |

`timeByOn(ds)` reads them back and computes an **`other`** bucket from whatever the total has that the split does not. That is not a rounding fudge: a save written before the split existed has a total and no breakdown, and its hours must still show up rather than silently vanishing from the day. A test covers exactly that save.

`timerKindFor(q, td)` decides the bucket: a challenge quest counts as a challenge, any other quest as a quest, a to-do as a to-do, and an interval session started from the TRAINING YARD page as training — but an interval session started **inside a quest window** counts as that quest's work, because it is.

Pruning (section 4k) drops `timeBy` rows past the cutoff along with `timeHistory`; the total is already folded into `archive.focusSec`, so nothing is double counted and nothing is lost.
