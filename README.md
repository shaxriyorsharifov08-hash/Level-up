# LEVEL UP

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

`index.html` is one very large file, so every hand edit is a risk. **163 automated tests now run on GitHub after every single commit — you do not have to run anything.**

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
| `ai-proxy/` | The optional Mentor AI server (a Cloudflare Worker, no npm) and how to deploy it — see **section 4x** and `ai-proxy/README.md`. Not part of the page |
| `tests/` | The safety net — see **section 2b** below. Not part of the app; the live site ignores it |
| `database.rules.json` | The Firebase Realtime Database security rules, kept in the repo so they are reviewed like code. **Firebase does not read this file** — paste it into the console (section 4, step 5) |
| `package.json`, `playwright.config.js` | Only used to run the tests |
| `.github/workflows/tests.yml` | Runs the tests on GitHub after every commit |
| `CLAUDE.md`, `.claude/agents/`, `.claude/skills/team/`, `.claude/team/`, `scripts/team/` | The AI dev team for Claude Code: the rules every agent follows, the ten roles, the lead's `/team` playbook, the team's knowledge, lessons and drills, and its speed tools — see **section 6b** |
| `portable/` | The portable AI team: `portable/ai-team/` is the source, `portable/dist/ai-team.zip` is the file to upload, `portable/README.md` is the install guide — see **section 6c** |
| `plugins/ai-team/`, `.claude-plugin/marketplace.json` | The same team as a Claude Code plugin. Generated, do not edit by hand — see **section 6c** |
| `scripts/team/build-portable.py` | Checks the portable source and builds the zip, the plugin and the marketplace file |
| `company/`, `AGENTS.md`, `.github/workflows/company-task.yml` | Agent Company: the same AI team for any AI (ChatGPT, Gemini, Codex…), the paste-in prompts, the memory templates, the independent runner and its GitHub workflow — see **section 6d** |
| `.github/workflows/nightly.yml`, `scripts/nightly-report.mjs` | The nightly system check: runs every test and checks the live site each night, and opens, updates or closes one `nightly-tests` issue by itself — see **section 4aa** |

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
5. **Realtime Database → Rules** → replace with the contents of `database.rules.json` (copied below) → **Publish**. Before publishing, try it in the console's **Rules Playground**: read `hunters/<your uid>` as yourself (allowed) and as another uid (denied).

```json
{
  "rules": {
    "heroes": {
      ".read": "auth != null && root.child('admins').child(auth.uid).exists()",
      "$uid": {
        ".read": "auth != null && (auth.uid === $uid || root.child('admins').child(auth.uid).exists())",
        ".write": "auth != null && (auth.uid === $uid || root.child('admins').child(auth.uid).exists())"
      }
    },
    "admins": {
      "$uid": {
        ".read": "auth != null && auth.uid === $uid"
      },
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
    "codes": {
      "$code": {
        ".read": "auth != null",
        ".write": "auth != null && !data.exists() && newData.isString()"
      }
    },
    "guilds": {
      "$gid": {
        "info": {
          ".read": "auth != null",
          ".write": "auth != null && ((!data.exists() && newData.child('createdBy').val() === auth.uid) || (data.exists() && data.child('createdBy').val() === auth.uid))"
        },
        "members": {
          ".read": "auth != null && data.child(auth.uid).exists()",
          "$uid": {
            ".write": "auth != null && auth.uid === $uid",
            ".validate": "newData.child('name').isString() && newData.child('name').val().length <= 60 && newData.child('level').isNumber() && newData.child('rank').isString() && newData.child('rank').val().length <= 3"
          }
        },
        "chat": {
          ".read": "auth != null && root.child('guilds').child($gid).child('members').child(auth.uid).exists()",
          "$msg": {
            ".write": "auth != null && !data.exists() && newData.child('uid').val() === auth.uid && root.child('guilds').child($gid).child('members').child(auth.uid).exists()",
            ".validate": "newData.child('text').isString() && newData.child('text').val().length <= 300 && newData.child('name').isString() && newData.child('at').isNumber()"
          }
        },
        "cheers": {
          "$to": {
            ".read": "auth != null && auth.uid === $to",
            "$c": {
              ".write": "auth != null && ((!data.exists() && newData.exists() && root.child('guilds').child($gid).child('members').child(auth.uid).exists()) || (!newData.exists() && auth.uid === $to))"
            }
          }
        }
      }
    }
  }
}
```

**What the November 2026 rules changed, and why.** The old rules let *any* signed-in account write *anywhere* under `guilds` and `codes`: overwrite another clan's name, post chat as someone else, delete other members, or list every invite code. Now:

- a clan profile (`guilds/<id>/members/<uid>`) can be written only by that hero, and must have a text name, a numeric level and a short rank;
- members and chat can be read only by the clan's members; a chat message must carry its sender's own uid and is at most 300 characters; nobody can edit or delete someone else's message;
- a respect boost can be sent only by a member and removed only by its receiver;
- clan info can be changed only by its creator; an invite code can be claimed once and never overwritten, and the full list of codes can no longer be downloaded;
- `admins` can no longer be listed: each account can only check itself.

The app publishes its own clan profile **before** it starts reading the clan, so the member-only reads succeed on the first try.


After that: entrance screen → ADMIN → your email + password → the app switches into a **console-only view**: no navigation, no quests, no play — just the admin panel. There you can load every user, edit a chosen user (name, level, XP, stat points), seal/unseal sections for everyone, broadcast a System announcement, and launch season events. These rules — not the app — are what actually protects user data: only each user and the admin UID can touch a save. Press **🚪 EXIT ADMIN MODE** to leave — it signs the admin account out and returns the device to its own hero (guest or Google), untouched.

### 🚫 Admin never plays, by design
Logging in as admin (any email/password account) is treated as an administrator login, never as a hero — even if that account isn't yet listed under `admins/`, it's rejected with a message rather than silently becoming a new hero. This keeps the two identities completely separate: the admin's local device save (whatever guest/Google hero was active before) is never read from or written to while in admin mode.

---

## 4b. THERE IS NO WORLD MAP — and that was a decision

For a while the app opened on a **walkable top-down city** with a joystick, buildings you entered, an isometric Academy interior and a WebGL 3D version of it. **All of it was removed on 2026-09-16.**

It is documented here so nobody — no future you, no AI you ask for help — rebuilds it by accident.

**Why it went:**

- It put a **walk** between the hero and every single action. The whole point of this app is that you open it and do the thing. A lobby is a toll booth.
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

**Two time conventions, and the bug that came of mixing them.** `sfxTone(freq, offset, …)` schedules relative to now; `sfxToneAt(freq, when, …)` schedules at an absolute point on the audio clock. The alarm works in absolute times, and for four days it handed one of those absolute times to `sfxTone`, which added `currentTime` to it a second time. **The alarm was therefore scheduled `currentTime` seconds late** — unnoticeable on a page just opened, an hour late after an hour with the app open. Six tests now measure *when* the sound is scheduled, not merely that something was. If you add a new sound anywhere, pick the right one of those two functions and check the test still passes.

**Everything the alarm schedules is cancellable.** Oscillators used to be fire-and-forget: nothing held a reference, so `alarmCancel()` could not stop a built-in tone and re-arming stacked alarms on top of each other. `toneAt()` now collects what it creates into `alarmNodes`, the same list the uploaded clips go into.

**A STOPWATCH target rings too.** It used to arm only in GRIND; reaching a stopwatch target played a chirp, and only if the focus window happened to be open.

**If SOUND is off, the alarm cannot ring** — `audio()` returns nothing when `state.sound === false`, which means no volume, no repeats, no alarm. Rather than failing silently, the settings panel replaces its reach warning with a line saying sound is off and where to turn it back on, and TEST THE ALARM says the same instead of doing nothing.

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

## 4e. THERE IS NO SEPARATE TIMER SECTION

There used to be a **TRAINING YARD** tab: its own page, its own engine, rounds of work and rest for training the body. It was **removed on 2026-09-18**, along with the copy of it that lived inside every quest's window.

GRIND (section 4d) does the same job better and in one place. Two timers that both counted rounds meant two engines to keep correct, two places to look, and a real question every time you pressed ⏱ about which one you were starting.

**Now there is exactly one timer, and everything opens it:** a quest card, a challenge, a one-time goal, a to-do row, and the ⏱ START THE FOCUS TIMER button inside a quest's full-screen window. All of them call `startTimer(id)` and all of them get the same focus window with the same themes, the same alarm and the same grind cycles.

An old save is cleaned up on open: `migrateState()` drops the `q.iv` rounds each quest used to carry, and `reconcileNav()` removes the dead tab from a customised dock. The `interval` time bucket **stays** in `TIME_KINDS` so days recorded before the removal still show where their hours went instead of sliding into the unsplit bucket.

## 4f. THE OATH — the hero's own words, used against them

Before the System opens, every hero answers four questions **in their own words** and signs them:

1. What are you running from?
2. What have you already failed at?
3. Who will you be?
4. **What do I say to you when you want to quit?** — they write the exact words; the System uses them verbatim.

**Changed November 2026 (4t):** the Oath is no longer asked before the first quest. It is asked on the first open **after a finished day** (`firstDayDone()`), and any answer of one character or more is accepted. It can also be sworn any time from PROGRESS → PROFILE → THE OATH. Everything is stored in `state.oath` — on the device, and in their own Firebase account if signed in. Nobody else can read it.

**The point is not the form. It is where the words come back.** `oathLine(kind)` returns the hero's own sentence, and it is appended to:

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
- **Penalty quest** — miss the Daily Package and the Penalty Round opens; all XP is frozen until you serve the penalty task and confirm it.

**QUEST LOCKDOWN was removed on 2026-09-16.** Two consecutive empty days used to make the System pick two of your quests at random and **seal them for seven days** — you could not complete them, and a `⛔ SEALED · 5d left` tag sat on the card.

It is the one punishment that works against the app. Every other penalty makes returning *expensive*; this one made returning *impossible* for the specific things you came back to do. A hero who disappears for two days and opens the app on the third has already done the hard part. Locking their quests tells them to come back later, and later is how it ends.

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

**No report is ever demanded retroactively.** `state.reportsSince` is stamped the first time the feature runs, so a hero who was already playing is never billed for weeks that closed before the rule existed.

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
- **A save that fails must never be silent.** `localStorage.setItem` was wrapped in `try{}catch(e){}` with an empty catch, so a full quota meant the hero kept playing while nothing was written. `save()` now detects the failure and raises a full-screen warning telling them to export a backup. Never restore the empty catch.
- **One uncaught error used to kill the app.** `window.onerror` and `unhandledrejection` now show a red recovery bar with RELOAD, instead of a frozen screen with no way back.

### Pruning the save

`pruneState()` runs on load. Day rows older than **400 days** (`PRUNE_KEEP_DAYS`) are folded out of `history`, `timeHistory` and `streakHistory` into `state.archive`, and each quest keeps its most recent **500** completions with the rest counted in `q.clearedBefore`.

**All-time totals stay exactly right** — `allTimeCleared()`, `allTimeXp()` and `questTimesCleared()` add the archive back, so a rank evaluation still sees every quest you ever cleared. STATS shows a line saying what was folded away.

**Nothing you wrote is ever pruned.** Journals, reports, honors, dreams and the Oath are untouched, by design. If you add a new store of the hero's own words, do not add it to `pruneState()`.

Honest measurement: this cuts the *mechanical* half of the save by about 38% and, more importantly, stops `completions` and `streakHistory` growing without limit. It does **not** shrink the save dramatically, because after two years the bulk is your own journal — roughly 200 KB a year against a ~5 MB browser limit, which is about 25 years of writing. That is not a problem and should not be "fixed" by deleting it.

### Accessibility

`a11yFix()` walks the DOM and repairs the two things that actually lock a screen-reader user out, then a `MutationObserver` re-runs it whenever a panel re-renders — **so a new panel needs no extra work**:

- every `input` / `textarea` / `select` gets an accessible name, from its `.form-lbl` or `<label>`, else its placeholder, title or a humanised id
- icon-only buttons take their `title` as an `aria-label`

Plus: `#toasts` is a polite live region and the System announcement is an assertive `alertdialog`, so both are spoken rather than only shown; every modal is a `role="dialog"`.

**Focus is trapped inside open dialogs.** Every dialog opens by gaining the class `show`, so a single observer watches for that — no opener has to call anything. While a dialog is open, Tab and Shift+Tab cycle inside it and focus cannot land on the page behind. Opening focuses the dialog itself rather than its first input, so a phone does not raise its keyboard just because a window appeared. Closing hands focus back to the button that opened it. Panels inside the focus window (⚙ settings, ✂ trim) are nested dialogs and trap on their own. **A new dialog only needs `role="dialog" aria-modal="true"` and to be shown with the `show` class.**

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

### Transactions are packed one day at a time

A flat list of transactions is unreadable — one run of rows with no seam between Monday and Thursday. They now group into **a pack per day**, newest day first, each with its date, how many entries it holds, and that day's **net** in green or red.

The date left the individual rows: it is the pack's header now, and repeating it on every line was the noise.

`txDayPackHtml(ds, list, editable)` draws a pack, and the **same function draws it in the calendar** (section 4p) with `editable` false — editing belongs in BUDGET, the calendar is an overview. A test asserts the calendar copy carries no edit buttons while the budget one does.

### Amounts group themselves while you type

Typing `12000` into a bare box and reading it back is genuinely hard, so every amount field now groups its thousands **live**: it shows `12,000` as you type, and `2,500,000` for a savings target.

A `type="number"` input **cannot hold a comma** — the browser rejects the value — so these five fields (`#txAmount`, `#txmAmount`, `#goalTarget`, `#wishPrice`, `#fxRate`) are `type="text"` with `inputmode="decimal"`, which still opens the numeric keypad on a phone. Three rules follow from that, and breaking any of them breaks the budget:

1. **Never `parseFloat(el.value)` on one of these.** Always `moneyNum(el)`, which strips the commas first. A raw `parseFloat("12,000")` returns `12`, silently, and logs the wrong expense.
2. **Never assign a number straight to `.value`.** Use `moneySet(el, n)` so the field opens already grouped.
3. `min` and `step` no longer validate anything, so each field keeps its own `> 0` guard in JS. They already had them.

`moneyGroup()` allows exactly one decimal point and **never truncates the decimals you typed** — the FX rate needs more than two places, and silently cutting them would be data loss. The caret is restored by counting digits before it rather than raw characters, so typing into the middle of a number does not throw you to the end.

## 5. Features you may want to adjust later

- **Language**: SETTINGS → 🌐 LANGUAGE: English, Русский or Oʻzbekcha. English is the base; Russian and Uzbek are dictionaries in the JS of `index.html` (`I18N_RU`, `I18N_UZ`, keyed by the same English strings; `i18nDict()` picks one). Any string missing from a dictionary simply stays English, so it can never break the app. To add a string, add it to **both** tables; a test fails if Uzbek falls behind Russian. To add another language: copy `I18N_RU` to a new table, translate the values, add an `<option>` in the LANGUAGE panel and one line in `i18nDict()`.
- **Finalize the Day** now asks three things: *what interesting thing happened*, *what mistake did you make and how will you fix it*, and *what you expect from tomorrow*. Pages written under the old questions (learned / changed me) still display correctly in PROFILE → Pages of the Hero — nothing written is ever lost.
- **Notifications**: ADMIN → 🔔 NOTIFICATIONS. A daily reminder fires at the chosen time if quests are unfinished. It works while the app is open in a tab or installed on the home screen; it is *local* (no push server), so a fully-closed phone browser won't ring — that is a platform limit, not a bug.
- **Navigation**: five fixed tabs at the bottom (TODAY · QUESTS · PROGRESS · REWARDS · MORE), see 4t. SETTINGS → ✎ RENAME & REORDER TABS renames sections, orders the MORE list and hides sections from it.
- **The progression model (single mode)** — every hero climbs the same story path to **Level 100**:
  - Levels 1–4: only the 4 Daily Quest package items (editable, capped at exactly 4) plus **one-time goals** (max 10 per rolling week).
  - Recurring custom quests need **quest slots**, granted by the story path (+2 at Lv.10 by default, more at 14/18/22/26/30/40/60/80). Weekly goal capacity also grows on the road (Lv.12/20/35/55).
  - Sections open by level (defaults: STATS 4, REWARDS+INVENTORY 6, HONOR 8, CLAN 12, BUDGET 15) — override any of them for everyone in 🛡 ADMIN CONSOLE → SECTION LOCKS. HOME, PROFILE, QUESTS, STORY, GUIDE and SETTINGS can never be locked.
  - XP curve: `100 + lv^1.7` per level — early levels come in days, late levels take a week+; the full road ≈ a year of daily discipline.
- **The user page is now ⚙ SETTINGS** (was ADMIN): cloud sync, theme, sounds, language, notifications, name, tab labels, hero portraits, backups, quotes, their own quest/collection lists and daily package. The story-road editor and the skill/equipment item editor are **admin-only** (they influence progression).
- **Story path is admin-owned**: 🛡 ADMIN CONSOLE → "🗺 Story path" → EDIT (opens the road editor) → **PUBLISH TO ALL USERS**. Every hero's road is replaced by your template (already-claimed levels stay claimed). Row types include rolls, stat points, ⚔ QUEST UNLOCK (creates a named quest at that level), **🎫 QUEST SLOTS** and **🎯 WEEKLY GOALS +** permits.
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

## 6b. THE AI DEV TEAM: GIVE ONE TASK, A TRAINED TEAM OF AGENTS DOES IT (November 2026)

For work on this project with Claude Code (this repository in a Claude Code session: the web, the desktop app or the terminal), there is a team of AI agents. You give one task; a lead agent sizes it, picks the smallest team that fits, runs independent parts at the same time, checks every result with the team's own tools, commits, reports who did what, and writes down what it learned.

**How to use it:** type `/team` and the task, for example `/team build the Life Timer from the Idea Box`, `/team the streak on custom quests resets wrongly, find and fix it`, `/team check the finance slides of Level_up_presentation_77.pptx`, or `/team drill` to train the team. For a medium or large task the lead first shows a short plan (who does what), then works. It stops and asks you before a new dependency, a change to the save format, removing a feature or data, or anything public or paid (pushing to `main`, a pull request, a deploy).

**The roles** (`.claude/agents/`, one plain-text file each; edit them to change how a role works):

| Role | Job | Edits? |
|---|---|---|
| planner | Maps every place the task touches with the tools, names the risks, writes a short step plan with a role per step | no |
| coder | Builds each step in the app's own style, with its tests; checks itself with rules-check and i18n-check | yes |
| tester | Reproduces bugs with a failing test first, runs the affected specs, never weakens a test | tests only |
| translator | Natural Russian and Uzbek (Latin, `ʻ`) in the app's own terms | text only |
| designer | Phone-width layout, themes, contrast, accessibility, screenshots in English and Russian | yes |
| reviewer | Adversarial review: safety walls, saves, injection, secrets, correctness; every finding with the path a real hero would take | no |
| health-safety | Food, body, exercise, minors, mental health, the nutritionist workflow: formulas in code with citations, never AI numbers; tests the safety lists in three languages | no |
| analyst | Finance model, prices, market facts: computed in code, sourced, consistent everywhere | analysis files |
| deck-editor | PowerPoint and Word: a check is a list of problems; hand-written words and finance wording untouched; File A / File B | `.work/` copies |
| docs-writer | This README, `tests/README.md`, the Worker README, in plain words, with real names only | docs only |

**What makes them fast** (`scripts/team/`, plain Node and the Python standard library, no packages; all listed in `.claude/team/KNOWLEDGE.md`):
- `codemap.mjs`: find any function, section or HTML id in the 14,000-line app in a second; `--show` prints a function, `--refs` lists its uses and the tests that mention it.
- `affected-tests.mjs`: the specs a change touches (following callers), so the team runs those in seconds and the whole suite once at the end.
- `rules-check.mjs`: your rules checked on the added lines in seconds: secrets, template literals, storage keys, Uzbek letters, three languages, new save fields without a default, unescaped HTML, new outside addresses, dependencies, Worker logging, text still waiting for translation.
- `i18n-check.mjs`: missing Russian or Uzbek in new text (`--all` lists about 38 old texts that still fall back to English).
- `office-text.py`: a deck or Word file as text, tables, chart data and speaker notes; `--numbers` lists every figure with its slide, so the same number written two ways stands out.

**What makes them good:**
- `CLAUDE.md`: your standing rules, the project rules from section 6, and the git rules. Every role reads it first.
- `.claude/team/KNOWLEDGE.md`: how the app, the data, the languages, the tests, the Worker and the business side fit together.
- `.claude/team/LESSONS.md`: real mistakes and their fixes from this project. The lead adds a line after **every** task, which is how the team gets better over time.
- **Drills** (`.claude/team/drills/`, `scripts/team/drill.mjs`): practice tasks with planted problems and answer keys, run on a throwaway copy. `/team drill` runs one, scores it, logs the result in `drills/results.md`, and improves the role file or the lessons for every miss. There are three to start: a review with a hidden safety hole, an XSS and a save crash; a translation; and a bug hunt.
- **The playbook** (`.claude/skills/team/SKILL.md`):
  - picks the shortest team per task type (a bug, text only, UI, a feature, health, numbers, a deck check or change);
  - briefs every role with a fixed template, because each agent starts with no memory of the chat;
  - runs read-only roles at the same time, with one writer per file at a time;
  - checks with the tools, runs the tests, and fixes at most two rounds before asking you.

**Cost and limits:** there is no extra bill; it runs on your Claude plan. A team uses several times more of your plan's usage than one agent, so the lead does tiny tasks alone and picks the shortest team for the rest. The agents load when a session starts, so a session opened before these files existed does not have them. Agents can be wrong too: the lead checks with the tools and the tests, and nothing goes to `main` without you.

Tests: `tests/agent-team.spec.js` (the role files stay valid, read-only roles cannot edit, every role starts from the knowledge and uses the tools, the playbook keeps the stop-and-ask rules and the learning step, `CLAUDE.md` carries your rules and no secret) and `tests/team-tools.spec.js` (each tool on the real `index.html`, each rule caught and a clean change passed, the deck reader on a generated deck and Word file, every drill still applies to today's code).

## 6c. THE PORTABLE AI TEAM: ONE INSTALL, EVERY CHAT AND PROJECT (November 2026)

The team in section 6b only works inside this repository. You also work in other chats and other projects, and you do not want to rebuild a team each time. So the same team is packed as one skill: you install it once and call it anywhere. The step-by-step guide is `portable/README.md`.

**How it works:**
- The source is `portable/ai-team/`: `SKILL.md` (the lead's playbook), `references/owner-rules.md` (your standing rules), one file per role in `references/roles/`, `references/lessons-general.md` and `scripts/office-text.py`.
- `python3 scripts/team/build-portable.py` checks the source, then builds `portable/dist/ai-team.zip` (the upload) and the Claude Code plugin in `plugins/ai-team/` with `.claude-plugin/marketplace.json`.
- **Chats, desktop app, Cowork, Claude Code on the web:** upload the zip once at claude.ai → Customize → Skills and switch it on. Code execution must be on in claude.ai settings. Account skills are copied into web sessions for any repository.
- **Claude Code on a computer:** account skills do not reach it, so install the plugin: `claude plugin marketplace add shaxriyorsharifov08-hash/Level-up#claude/website-invention-cr4bd0`, then `claude plugin install ai-team@ai-team`. After the branch is merged into `main`, drop the `#claude/website-invention-cr4bd0` part.
- **Calling it:** `/ai-team <task>` or `ai team, <task>` in a chat; `/ai-team:ai-team <task>` with the plugin. In a chat there are no separate agents, so the lead plays the roles one after another (Solo mode). In Claude Code it starts real agents (Team mode).
- **In this repository** keep using `/team`: it knows the app. The portable skill itself says to prefer a project's own team.
- **Not documented, so not promised:** the mobile app, and claude.ai Projects.

**Safety:** your rules go with it (`references/owner-rules.md`): tests, no secrets in client code, health numbers by formula, privacy, and asking before a dependency, a deploy, money or anything public. The portable files hold nothing about how LEVEL UP works: only `owner-rules.md` names this repository, as the place where the master copy lives, and the build refuses project-specific words anywhere else.

**Admin, languages, data:** no new save field, no change to the app, nothing in `index.html`, no admin lock. It is a tool for you, not a feature for players.

**Updating:** edit `portable/ai-team/`, run the build, commit, then upload the new zip again (an upload does not update itself). The plugin updates with `claude plugin marketplace update ai-team`. In a repository the team writes to `.claude/team/LESSONS.md`; in a chat it ends with "Lessons from this task", and you add the good ones to `references/lessons-general.md`.

**Cost and risks:** no extra bill; it uses your Claude plan. In a chat, Solo mode is one agent playing every role, so it is less independent than Team mode. A zip you uploaded stays old until you upload again.

Tests: `tests/portable-team.spec.js` (the source is valid for claude.ai and the built zip, plugin and marketplace match it; the zip has the skill folder at its top; the plugin has ten agents and the read-only roles cannot edit; the build check refuses a project-specific leak, a long description, a tag, a missing role and a writing reviewer; the bundled deck reader runs alone).

## 6d. AGENT COMPANY: THE TEAM IN ANY AI, EVEN WITHOUT CLAUDE (November 2026)

The team in 6b and 6c runs on Claude. Agent Company is the same team written for **any** AI, so it keeps working when the Claude subscription ends or in another app. It is plain text, in `company/` (guide: `company/README.md`).

- **What it is:**
  - `company/COMPANY.md`: the lead's operating manual, with Team mode when the AI can start helper agents and Solo mode otherwise;
  - the ten roles and your rules, copied from the master copy in `portable/ai-team/` by the build, so they never drift;
  - memory templates (`PROJECT.md`, `MISSION-LOG.md`, `LESSONS.md`), so you never explain twice.
- **Ready to paste:**
  - `prompts/short.md` (1,251 characters) for ChatGPT's "Customize" box;
  - `prompts/medium.md` (about 5,000) for a Custom GPT, Gemini Gem or Claude Project;
  - `prompts/chat-starter.md` as the first message in any chat app.
- **In chats**, the lead ends each reply with the updated mission log. You paste it into the next chat, even in a different AI, and work continues.
- **Coding agents:** `AGENTS.md` at the root of this repository points Codex, Cursor, Copilot and Gemini CLI to `CLAUDE.md` (the project rules) and to the company.
- **Independent mode:** `company/runner/run.mjs` runs a task with any OpenAI-compatible AI service (GitHub Models, a model on your own computer with Ollama, Groq, OpenRouter…). The **Company task** workflow on GitHub runs it with no keys, using GitHub's free model allowance. It writes a report only: it never changes files, publishes or spends.
- **Limits, plainly:** quality depends on the AI behind it. Free and small models follow the manual in a simpler form, and chat apps that cannot run code cannot really test.
- **Updating:** edit `portable/ai-team/` (roles, rules) or `company/` (manual, prompts), run `python3 scripts/team/build-portable.py`, commit. The build checks every size limit and that no company file names a Claude-only tool.

Tests: `tests/company.spec.js` (the size limits, the sync with the master copy, no Claude-only tool names, the owner's rules and the stop-and-ask list in every version, the templates and `AGENTS.md`) and `tests/company-runner.spec.js` (the runner and its workflow).

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
5. **💰 MONEY · 3 entries · +$443** — a button that expands that day's transactions, drawn by the same code the BUDGET section uses.

Both stay **behind their buttons** on purpose. The day view has to remain an overview; three lists competing for the same screen is what made the old STATS page unreadable.

### How the split is recorded

Every tracked second is written in **two** places, and only `logTime(secs, kind)` writes them:

| | |
|---|---|
| `state.timeHistory[date]` | the day's **total** — what the STATS charts have always read |
| `state.timeBy[date]` | the **same total**, split into `{quest, challenge, todo, interval}` |

`timeByOn(ds)` reads them back and computes an **`other`** bucket from whatever the total has that the split does not. That is not a rounding fudge: a save written before the split existed has a total and no breakdown, and its hours must still show up rather than silently vanishing from the day. A test covers exactly that save.

`timerKindFor(q, td)` decides the bucket: a challenge quest counts as a challenge, any other quest as a quest, a to-do as a to-do, and an interval session started from the TRAINING YARD page as training — but an interval session started **inside a quest window** counts as that quest's work, because it is.

Pruning (section 4k) drops `timeBy` rows past the cutoff along with `timeHistory`; the total is already folded into `archive.focusSec`, so nothing is double counted and nothing is lost.

## 4q. THE CHRONICLE — your own story, told back

STORY → 📜 **THE CHRONICLE**. Every calendar month since the save was created is a chapter, newest first. The System writes each one from the record: days you showed up, quests cleared, XP, focus time, your longest unbroken run, honors enshrined, rank trials passed, dreams that came true, and how many pages you wrote. It then **quotes you** — the longest line you wrote in Finalize the Day that month, and your written monthly report. The prologue is your Oath.

A chapter's title is **earned, never decorative**. It is chosen by comparing the month with the one before it, so *"The winter you nearly stopped"* appears only when you really went from showing up most days to fewer than a third of them, and *"The spring you came back"* only when the reverse is true. *"Strongest"* is not said until there are at least three months to compare.

**It stores nothing.** The Chronicle is computed from the save every time it opens, so it can never disagree with the record and adds nothing to the save's size. The one new field it relies on is `doneOn` on a dream, written when a dream is ticked — dreams achieved before this existed are simply not dated. Months whose day rows were folded into the archive (older than 400 days) say so honestly and still quote what you wrote. The titles and sentences are in English only; the Russian dictionary does not cover them yet.

## 4r. YOUR DATA, THE BREAK REMINDER, PREMIUM PREVIEW (November 2026)

Three promises from the business plan, made true in the app. All three live in **SETTINGS**.

### 🔒 YOUR DATA & PRIVACY
Says in plain words where a save is kept (this device; the cloud if signed in, where the administrator can open it to fix problems; clan members see name, photo, level, rank, weekly progress and chat) and that there are no ads and no tracking. Since 4x it also says that **nothing is sent to an AI service unless the hero turns on Mentor AI**, which shows what it sends first, and that health questions never leave the device. **Keep that sentence true**: any new AI feature must change this text in the same commit.

- **💾 EXPORT MY DATA** is the same full JSON backup as EXPORT JSON BACKUP.
- **🗑 DELETE MY DATA** asks the hero to type `DELETE` (or `УДАЛИТЬ`). Signed in, it first removes the cloud save (`hunters/<uid>`) and the clan profile, then signs out; then it clears this device: the save, the IndexedDB vault **and** the daily snapshots, so the vault recovery cannot bring it back on reload.
- **Nothing is half-deleted.** Offline, or if the cloud refuses, the app deletes nothing at all and says so. While a deletion runs, `save()` and the cloud sync are switched off (`dataWiping`), so no last write can resurrect the record.
- The old **FULL RESET** is unchanged: it clears this device only, and a signed-in hero gets the cloud copy back on the next sync. DELETE MY DATA is the one that removes everything.

### ⏳ BREAK REMINDER
A gentle "time for a short break" after **20 / 30 / 45 / 60 minutes of active use** (default 30, or Off). Only active use counts: the app visible, touched in the last minute, and **no focus session running**, because that is work, not scrolling. Five minutes away counts as a break and starts the count again. Saved as `breakMins` (0 = off); older saves get 30, and a corrupt value is reset to 30 so it can never fire every tick.

### ⭐ LEVEL UP PREMIUM (preview)
*Since 4y this is its own page, MORE → ⭐ PREMIUM (marked SOON); SETTINGS still has a button to it. The content below is unchanged, plus "Mentor AI with 20 questions a day instead of 3".*
Shows the planned price (**37,500 so'm a month**), what Premium will add (AI training plans, a diet calculator with standard medical formulas for 18+, deeper statistics, extra themes) and what is **always free**. **Nothing is sold: there is no payment in the app.** I'M INTERESTED stores the day in `premiumInterest`, which the administrator can count in cloud saves. It is a feature in the registry (`premium`), so the Administrator can seal it by level or remove it like any other.

### Security fixes
Clan profiles and other heroes' saves are written by *other people's devices*, so they are untrusted. The clan leaderboard, the 👁 stats card and the admin user list used to put a member's rank, level, streak, days and attributes into the page without checking them; a crafted profile could have run script in every clan member's app. Those values are now forced to numbers or a known rank before they are shown (`safeInt`, `safeRankKey`), and member ids are escaped. The database rules were tightened too: see section 4, step 5. **Those rules only take effect once you paste them into the Firebase console.**

## 4s. ORIGINAL NAMES AND OʻZBEKCHA (November 2026)

### Why the names changed
Several names were borrowed from an anime and could look like copying protected work, so they were replaced with LEVEL UP's own words. Only the names changed: every mechanic, number and record works as before.

| Before | Now |
|---|---|
| HUNTER SYSTEM (subtitle) | DISCIPLINE GAME |
| Hunter (the player) | Hero (RU *герой*, UZ *qahramon*) |
| NAT'L rank, "National Level Hunter" | LEGEND rank, "Legendary Hero" |
| The Hunter Association | The Council |
| Penalty Zone | Penalty Round |
| Titles: The Awakened · Arisen · Shadow Monarch | The Beginner · Rising Star · Master of Discipline |
| Starter quest "Awakening Ritual" | "First Step Ritual" |
| Chronicle prologue "The Awakening" | "The Beginning" |
| Story chapters, System voice lines, quotes | rewritten as original text |

New saves also start with a lighter daily package (30 push-ups, 30 sit-ups, 30 squats, a 3 km run). Existing saves keep the package they have.

**Kept on purpose:** the storage keys (`leveluphunter_v1`, `leveluphunter_db`), the database path `hunters/<uid>` and a few CSS/element names still say "hunter". They are never shown, and renaming them would orphan every existing save. The letter ranks E to S and "the System" are common game terms and stay.

### What happens to an existing save
`migrateState()` runs once per save (flag `namesV2`; it is **not** in `defaultState()`, or old saves would skip it). It renames, by exact match, only strings the app itself wrote: the three old titles (merged, so "The Beginner" is never held twice), a hero still named exactly "Hunter", the system starter quest and the active penalty task. Quests, rewards and names the hero typed are never touched. Level, XP, streaks and history are unchanged. A cloud save is migrated the same way when it is adopted.

### Oʻzbekcha
SETTINGS → 🌐 LANGUAGE → **Oʻzbekcha**. The table `I18N_UZ` has the same 803 keys as `I18N_RU`, in Latin script, with oʻ and gʻ written with the modifier letter **ʻ** (U+02BB) and the tutuq belgisi with **ʼ** (U+02BC), never a typed apostrophe. Anything not in the table (for example the Chronicle's generated sentences) falls back to English. DELETE MY DATA accepts `DELETE`, `УДАЛИТЬ` or `OʻCHIRISH`, however the oʻ is typed.

Some Uzbek sentences put the number in the middle ("…soat 21:00 da…", "5-darajada ochiladi"), so a few dictionary pieces start with a space or a suffix. That is deliberate; keep it when editing.

**Have a native speaker read it.** The translation was written carefully, but an app's tone is best checked by the people who use it.

Tests: `tests/names-and-uzbek.spec.js` (the migration, no retired names in the source or on any page in EN/RU/UZ, Uzbek coverage and orthography, the Uzbek delete word).


## 4t. A LIGHTER LAYOUT (November 2026)

New users said the app felt heavy: on first open, the home page was 2.5 screens long, today's tasks started a screen and a half down, navigation was hidden behind a "+1%" button (7 tabs, 4 visible) and duplicated by an 11-tile Command Center, and 20 elements glowed over a moving particle background. The comparison with Habitica, Duolingo, Finch, Todoist, Streaks and Forest is in the design review page shared in chat. The changes:

**Five tabs, always on screen** (`TABS`, `renderNav`, `renderSubnav`, `renderMore`):

| Tab | Holds |
|---|---|
| 🏠 TODAY | the home page |
| 📜 QUESTS | the quest log |
| 📈 PROGRESS | PROFILE · STORY · STATS · HONOR, as sub-tabs at the top (*since 4y: STORY · STATS · HONOR; the hero opens from TODAY*) |
| 🎁 REWARDS | REWARDS · INVENTORY |
| ☰ MORE | a sheet with every other section: LEARN, CLAN, BUDGET, GUIDE, SETTINGS (*since 4y also MENTOR and PREMIUM*) |

The Administrator's feature locks still decide what is open. A sealed section shows the level that opens it (🔒) instead of being invisible, and tapping it explains; a removed section disappears; if every page of a tab is removed, the tab disappears. A tab remembers the sub-tab you last used. SETTINGS → RENAME & REORDER TABS still renames sections and orders/hides the MORE list; SETTINGS can never be hidden.

**TODAY does one job.** A slim card (rank, name, level, XP, streak 🔥), then the daily package, then one line with today's quests (tap → QUESTS), one first-steps tip that can be closed, and the next road reward. The portrait and the System Mentor moved to PROGRESS → PROFILE; the Command Center is gone because the tabs do its job. The ＋ button now also works on TODAY.

**Calm by default, with a switch.** `state.effects` (default `false`): the body gets the `calm` class, which hides the particle canvas (and stops drawing it), removes glows and looping decorative animations, and flattens panel backgrounds. SETTINGS → APPEARANCE → ✨ Effects → *Full* brings everything back. Older saves get `false` like new ones; a corrupt value is reset to `false` in `migrateState()`. No other save field changed.

**First run is one tap.** The entrance shows ▶ START (guest) and Google sign-in straight away; the hidden admin door is unchanged. The Oath now waits for the first finished day and accepts any length (see the Oath section).

Tests: `tests/redesign.spec.js`; the smoke test now checks the new Oath timing.


## 4u. SOLID THEMES AND STURDIER TYPE (November 2026)

The neon look (glowing purple on near-black, thin narrow letters, widely spaced capitals) gave users headaches. Research behind the change, with real screenshots of every theme, is on the "LEVEL UP Themes" page shared in chat: Strava and Duolingo use a white page with one strong colour for the main action, Habitica offers light and dark, and body text needs at least 4.5:1 contrast (WCAG 1.4.3), more if the letters are thin.

**Type, in every theme.** Nunito (rounded, heavy, with Cyrillic) replaces Rajdhani and Orbitron; the logo keeps Orbitron. Body text is weight 600, titles 800–900, and letter-spacing above 0.12em was cut to 0.06em. Fonts are the `--fd` / `--fb` tokens. Offline, the system font is used.

**Solid themes** (`THEMES` entries with `tok:true`; the body gets the `tok` class). Every colour comes from tokens on `body[data-theme="…"]`: `--bg`, `--card`, `--soft`, `--line`, `--ink`, `--text`, `--dim`, `--purple` (the one action colour), `--violet` (its pressed shade), `--blue`, `--onp` (text on the action colour), `--legendary`, `--easy`, `--mythic`. The `body.tok …` block maps every hard-coded dark surface, white text and glowing button of the original CSS to those tokens, with 1.5px borders and no glow.

| Theme | Look | Text / grey text / buttons contrast |
|---|---|---|
| ☁️ Sky (default) | white & blue | 14.5 / 6.2 / 5.2 |
| 📄 Paper | warm white & navy | 14.5 / 6.4 / 8.3 |
| 🌿 Mint | white & green | 13.8 / 6.1 / 5.0 |
| 💜 Lilac | white & purple | 15.5 / 6.8 / 6.4 |
| 🧡 Sunrise | white & orange | 14.9 / 6.5 / 5.2 |
| 🤍 Blossom | white & pink (rebuilt) | 14.0 / 5.9 / 5.9 |
| 🌙 Night | soft dark blue, no neon | 12.4 / 7.1 / 7.3 |

The classic neon themes (Shadow, Rose, Emerald, Ember) are unchanged and still selectable. Chart labels read their colours from the theme (`chartInk`). The phone's status bar takes each theme's background colour.

**Existing users (superseded, see 4v).** `migrateState()` moved a save still on Shadow (the old default) to Sky once (`themeV2`, deliberately not in `defaultState()`), and keeps any theme the hero picked. Shadow stays one tap away in SETTINGS → APPEARANCE. An unknown theme id falls back to Sky. Nothing else in the save changes.

**Adding a theme:** copy one `body[data-theme="sky"]{…}` token block, add an entry with `tok:true` to `THEMES`, translate its name in both dictionaries, and check it with `tests/themes.spec.js`, which fails if any solid theme drops below 4.5:1.


## 4v. SHADOW AGAIN, THE FIRST-RUN TOUR AND THE VIDEO GUIDE (November 2026)

**Shadow is the default again.** The team preferred the original look. `defaultState().theme` is `"shadow"`, and `migrateState()` moves any save on Sky back to Shadow once (`themeV3`, not in `defaultState`); every other theme a hero chose is kept, and Sky and the other solid themes stay in SETTINGS → APPEARANCE. The sturdier type and the calm look from 4t/4u stay.

**The first-run tour** (`TOUR`, `startTour`, `showTourStep`, `placeTour`). Modelled on how mobile games teach new players: the screen dims, a spotlight opens on one control, a hand taps where to tap, and **Pixel**, our own guide character (original SVG, no borrowed art), explains it in a speech bubble with a typing effect. 11 steps: welcome with an animated mini-demo (a task is ticked, +15 XP flies up, the bar fills, LEVEL UP!), the hero card, the Daily Quest, today's quests, the ＋ button, the tab bar, then two steps the hero must do themselves (tap PROGRESS, tap MORE), and a finish with confetti and a button to the video.
- It starts on its own for a new hero, after the welcome announcement and only when nothing else is on screen (`maybeTour`, `tourBlocked`).
- During a "tap" step only the highlighted control works; other taps are held back and the hand nudges. During the other steps only the bubble responds.
- SKIP or Escape ends it; GUIDE → 🧭 REPLAY THE TOUR runs it again. It never completes anything: it only points.
- `state.tutorialDone`: decided once per save in `migrateState()` (not in `defaultState`): `false` for a brand-new save, `true` for anyone who has already completed something, so existing heroes are not interrupted.
- All text is in English, Russian and Uzbek; with reduced motion there is no typing, bobbing or confetti. Hidden in admin mode.
- The tour's "add a quest" step says honestly that a new hero adds one-time goals first: recurring quests need quest slots, the first at Level 5.

**The video guide** (`guide/`). A 71-second walkthrough recorded from the real app on a demo account (start, Daily Quest, adding a goal, the focus timer, completing, levelling up, PROGRESS, MORE, GUIDE), with tap ripples. It is an H.264 MP4 (720×1558, about 2.3 MB) with a poster image and WebVTT subtitles in English, Russian and Uzbek; the player shows the subtitles of the app's language. It is in GUIDE and opens from the end of the tour; `preload="none"`, so nothing downloads until play is pressed. It needs a connection the first time.

To re-record it after the interface changes: `node tools/record-guide-video.js <work folder>` (drives the app with Playwright and saves frames and caption times), then `python3 tools/build-guide-video.py <work folder> guide 27` (needs ffmpeg with libx264; writes the MP4 and the three .vtt files), then make the poster with `ffmpeg -ss 9.5 -i guide/level-up-guide.mp4 -frames:v 1 -vf scale=540:-2 -q:v 4 guide/level-up-guide-poster.jpg`. Russian and Uzbek subtitle texts live in the build script.

Tests: `tests/tutorial.spec.js`; `tests/themes.spec.js` updated for the Shadow default. The test helper marks the tour as done (`keepTour` keeps it).

## 4w. SKIP THE OATH, SHADOW FOR EVERYONE, ONE-TAP PANELS (November 2026)

- **The Oath has SKIP FOR NOW.** It stores the day in `state.oathSkipped` (`""` by default) and the Oath is not asked again automatically; the hero's page (tap the hero card on TODAY, 4y) → ⚔ THE OATH → SWEAR THE OATH still opens it. Anything that waited behind the Oath is announced right after.
- **Everyone enters in Shadow.** `migrateState()` sets every save to Shadow once (`themeV4`, not in `defaultState`); after that, a theme the hero picks in SETTINGS is kept. The calm look no longer flattens the background, so Shadow keeps its own purple glow behind the cards (only glows and motion are switched off).
- **Long Profile panels open with one tap.** 📓 PAGES OF THE HERO and ⚔ THE OATH are collapsed to one row with a + button, like the SETTINGS panels. The collapse handler now works on any page (`.panel.collapsible`).

Tests: `tests/smoke.spec.js` (skip, one-tap panels), `tests/themes.spec.js` (Shadow for everyone, calm Shadow background).

## 4x. THE SYSTEM MENTOR, WITH OPTIONAL MENTOR AI (November 2026)

The Mentor (MORE → 🧭 MENTOR since 4y; it was on PROGRESS → PROFILE) is now the app's coach: it analyses the hero's own record, plans the day, suggests habits and answers questions. It has **two brains**.

### 1. The on-device Mentor (always there, free, offline)
Everything is computed from the save by plain code; nothing is sent anywhere.
- **TODAY'S PLAN**: up to three steps, in order: a streak about to break (`mAtRisk`: a daily or custom quest with a live streak of 3+ that is not done today), the daily package, the shakiest quest due today, then a focus block or 🌙 Finalize the Day in the evening.
- **📊 THIS WEEK**: quests, active days, XP and focus minutes for the last 7 days, with ▲▼ against the 7 days before (shown only after 14 days of history).
- **🔎 WHAT I SEE**: up to four findings. Each quest's **real rate on the days it was due** over the last 14 days (`mQuestRate`; today counts only once it is done), the weekly trend, the weakest weekday over 8 weeks (`mWeekdays`, silent until each weekday was seen twice and the gap is real), empty days (counted only from the day the hero started), too many quests, a quest ready for a harder tier, little focus, all-EASY quests, the weakest attribute. The Oath's own words still come back after empty days.
- **🌱 TRY A NEW HABIT**: two small habits for the weakest attribute. **＋ MAKE IT A QUEST** opens the normal NEW QUEST window filled in; nothing is added until the hero presses SAVE, and the slot rules still apply (no recurring slot yet → it starts as a 7-step one-time goal).
- **ASK**: a library of 28 topics (focus, sleep, study, mornings, phone time, reading, languages, skills, strength, walking and running, water, meditation, journaling, tidying, money, stress, low mood, friendships, confidence, bad habits, a broken streak, goals, time, ranks and more) plus "how am I doing?" (a review from the record) and "what should I do today?" (the plan). Words are matched at the start of a word in English, Russian and Uzbek (`oʻ`, `o'` and `` o` `` are the same letter). If the hero already has a quest on that topic, the answer names it with its real record instead of suggesting a second one.
- **TODAY** shows the plan's first step as one quiet row ("Mentor: …") once FIRST STEPS is finished or hidden; tapping it opens the Mentor.
- All text is in `MENTOR_TXT`, `MENTOR_KB` and `MENTOR_HABITS`, each with `en`, `ru` and `uz`. A test checks every entry has all three, the same `{placeholders}`, and Uzbek in Latin with `ʻ`.

### 2. Health safety (both brains)
- Words about self-harm, suicide, abuse or danger, signs of disordered eating, and any diet, calorie or weight question are answered **on the device** with a fixed, careful message (local emergency number, a trusted adult or doctor, findahelpline.com; for diet: no numbers, see a doctor or registered dietitian, habit-side tips). They are **never sent** to the AI and offer no quest. The Worker refuses them too, as a second wall. The crisis message also names Uzbekistan's numbers: 112 (ambulance 103).
- **Safety walls 2.0 (Mission 1.1).** One check, `mSafetyKind`, answers "crisis", "eating", "diet" or nothing; the strongest wall wins. It lives in the SAFETY WALLS block, which `index.html` and `ai-proxy/worker.mjs` hold word for word (a test compares them). It reads the text through `mSafeNorm`: lower case, Uzbek typed in Cyrillic turned into Latin, every apostrophe dropped, spaces collapsed; so `ўзимни ўлдирмоқчиман`, `ozimni oldirmoqchiman` and `oʻzimni oʻldirmoqchiman` are the same words. Uzbek typed in Cyrillic without ў қ ғ ҳ (`узимни улдирмокчиман`) looks like Russian, so a Latin copy is also read, by the Uzbek patterns only. Each wall (`MENTOR_CRISIS`, `MENTOR_EATING`, `MENTOR_DIET`, each with an `…_UZ` part) is tested against a phrase corpus (`tests/fixtures/safety-corpus.json`, `tests/safety-corpus.spec.js`): at least 95% caught per group and language, and not one false alarm on several hundred normal questions. Very low calories (1–1199 kcal a day, or "under / only" so many) count as eating distress. A body or energy number (`800 kcal`, `45 kg`; `MENTOR_BODY`) counts as diet, and so do food restriction and weighing as a plan (`MENTOR_RESTRICT`: skip dinner, eat only…, only water, не есть, kechki ovqatni tashlash, weigh myself). The same check runs on the question, on each line of the summary and each earlier turn (the Worker drops those that hit, a question together with its answer), and on the AI's answer: the Worker replaces an unsafe answer with its fixed reply of that kind (it still counts as a question) and says which kind; the app never shows that reply as an AI answer but shows its own safety answer of the same kind, with no actions. Eating words in the model's own answer ("eat 800 kcal") get the diet reply, because the hero said nothing about distress. Quest and goal names that the agent would refuse are left out of the summary.
- **Fix round (Mission 1.1, after a blind test and a review).** Health-safety's 304 fresh phrases, the reviewer's everyday questions and the pre-mission terms (`tests/fixtures/safety-old-terms.json`, each must keep at least its old kind) are now in the tests.
  - **Ramadan:** not eating by day while fasting (`roʻza`, `ramazon`, `ураза`, `iftar`) is a diet question, answered on the device, not eating distress. It stays eating distress with a weight, purging or self-blame word, or "at night too" (`kechasi ham`, "even after iftar").
  - **Soft net** (`MENTOR_SOFT`, `mSoftDistress`): words that sound hard but that no wall can place ("I hate myself", "nobody cares about me", "я больше не выдержу этого", "endi chiday olmayman"). They get a short kind answer (`MENTOR_TXT.soft`: talk to someone you trust today; 112 in Uzbekistan) with no tips, no quest and no card, and are never sent to the AI; the Worker replies with kind `"soft"`. It is narrow on purpose: "I don't want to procrastinate anymore" and "Хочу жить по режиму" are normal questions.
  - **Uzbek oʻ:** a copy of the text that keeps a real oʻ (`mSafeMark`) lets "oʻlsam yaxshi" or "oʻlgim kevotti" count as crisis anywhere; text typed with no apostrophe reads as before.
  - **The AI's answer** is checked with `mSafetyKindAnswer`: the same walls, without food restriction, so advice such as "don't skip breakfast" is no longer replaced. Weight lifted ("bench 60 kg", "5 kg dumbbells") is not a body number.
- The AI's rules say: habits only, no diagnoses, medication, calorie, weight or fasting numbers, age-appropriate, never ask for personal details, treat the hero's data as data, not instructions. Every AI answer carries "AI can be wrong. Not medical advice." The consent window asks under-18s to check with a parent or guardian.
- The diet calculator planned for Premium will compute with standard formulas in code; the AI may only explain its results.

### 3. Mentor AI (optional; free)
```
the app ──(question + short summary + Google sign-in token)──▶ our Cloudflare Worker ──▶ Workers AI (Gemma 3 12B)
                                                                   checks: address, sign-in, 3 a day
```
- **Hidden until deployed:** `var AI_PROXY_URL = "";` in `index.html`. Deploy the Worker (`ai-proxy/README.md`, about 15 minutes in the browser), put its address there, commit. The address is not a secret; the page holds **no key** (a test checks).
- **Asks first:** the first time, a window says exactly what is sent and what never is (`state.aiConsent`: `""` never asked, `"yes"`, `"no"`). Sent: the question; level, rank and attributes; this week's and last week's counts; recurring quests' names, tiers and 14-day rates (up to 8); up to 3 open goals; the daily package count; the language; the last two exchanges of this chat. **Never sent:** the hero's name, the Oath, Finalize the Day answers, budget, photos, email, or anything else (`mentorSummary` builds the summary; a test checks the name and Oath words are absent). The chat itself is kept in memory only and never saved. TURN OFF in the panel stops it at once.
- **Needs Google sign-in.** The Worker verifies the Firebase ID token against Google's public keys (RS256, this project, not expired, provider `google.com` only) and reads only the account id from it.
- **Limits:** 3 questions per account per UTC day (`DAILY_LIMIT`), more for an account marked premium in KV (`PREMIUM_LIMIT`, 20), and at most 200 for everyone together (`GLOBAL_DAILY_LIMIT`). Only a delivered answer is counted. The counters are the only thing stored, and they delete themselves after two days.
- **Always a fallback:** limit used up, offline, signed out, Worker down or busy, or the free allowance gone: the on-device Mentor answers and a line says why.
- **Admin:** a new feature `mentorAI` (Mentor AI chat, open by default). Sealing or removing it hides only the AI; the on-device Mentor stays. Sealing `mentor` hides both.
- **Privacy panel** (SETTINGS → YOUR DATA & PRIVACY) now says AI is used only when switched on; this replaces "nothing is sent to any AI service".

### Cost and risks, plainly
Free on Cloudflare's Workers Free plan: 10,000 neurons a day, about 200 Mentor questions; when they run out Cloudflare stops answering rather than billing, and the app falls back to the device. KV Free allows 1,000 writes a day, 2 per answered question. On the Paid plan ($5/month) extra use costs about $0.0005 a question. The daily limit can be exceeded by one or two questions if someone sends many at the same instant (KV is eventually consistent). The model can be wrong and is weaker in Uzbek. Details and sources: `ai-proxy/README.md`.

### Data and migration
One new save field, `aiConsent` (default `""`), filled in for old saves by the normal defaults merge; nothing else in the save changes, and the Mentor only reads the record. `openQuestModal(id, preset)` gained an optional preset for suggestions.

Tests: `tests/mentor.spec.js` (the analysis on a seeded record, three languages, safety, suggestions through NEW QUEST, TODAY row, every AI path with a fake Worker, admin locks, old saves, no key in the page), `tests/ai-proxy.spec.js` (the Worker itself), `tests/privacy.spec.js` (the new sentence).

## 4y. TODAY AND THE HERO AS ONE PLACE; MENTOR AND PREMIUM IN MORE (November 2026)

TODAY and PROFILE showed the same hero card twice (rank, name, level, XP). Now there is one.

- **TODAY's hero card is the way to the hero.** The card (`#todayHero`, a button with a ›) opens the hero's page. The hero's page belongs to the TODAY tab (`TABS[0].pages = ["home","profile"]`) and has no sub-tabs; **‹ TODAY** at its top and the TODAY tab both go back (`goTab("today")` always opens TODAY). The unspent-points chip on the card still leads there.
- **The hero's page has no second hero card.** At the top: the portrait with the rank badge, the name (tap to rename) and the rank, and the unspent-points banner. The XP bar is on TODAY only. Then ⚖ RANK EVALUATION and ATTRIBUTES (was titled "STATS", which clashed with the STATS page) stay open; ⚔ THE OATH, 📇 HERO DOSSIER, TITLES, BADGES and 📓 PAGES OF THE HERO are folded to one row each (the existing `.panel.collapsible`).
- **TODAY is shorter:** the hero card, the Daily Quest, one line of today's quests and at most one tip (FIRST STEPS for a new hero, then the Mentor's next step). The "next reward" line was dropped; the road and its rewards are on PROGRESS → STORY.
- **PROGRESS** now holds STORY · STATS · HONOR and opens on STORY.
- **MORE** now lists 🧭 MENTOR, LEARN, CLAN, BUDGET, ⭐ PREMIUM (with a SOON tag), GUIDE and SETTINGS.
  - **🧭 MENTOR** is its own page with the whole Mentor from 4x. The TODAY tip opens it.
  - **⭐ PREMIUM** is a "coming soon" page so every hero can see Premium exists: the price (37,500 so'm a month), what it will add (Mentor AI with 20 questions a day instead of 3, AI training plans, the diet calculator for 18+, deeper statistics, extra themes), what is always free, and I'M INTERESTED. **Nothing is sold; there is no payment anywhere.** It replaces the old Premium window; SETTINGS → ⭐ SEE WHAT'S COMING opens the page.
  - Both are sections in the feature registry now (`mentor`, `premium` are `type:"section"` and in `LOCKABLE_PAGES`), so the Administrator can seal them by level (the MORE row shows the level) or remove them (the row disappears). `mentorAI` still controls only the AI.
- **Old saves:** no save field changed. `reconcileNav()` now puts a page a save has never seen in front of the next page that follows it in `NAV_ORDER` instead of at the very end, so MENTOR arrives before LEARN and PREMIUM before GUIDE, and the hero's own names, order and hidden entries are kept.
- The tour, the unlock messages and the Oath's SKIP note now name the new places, in English, Russian and Uzbek. **The guide video still shows the old PROGRESS screen** (about 0:55 to 1:04: the PROGRESS and MORE screens); re-record it with the tools in 4v when convenient.

Tests: `tests/hero-home.spec.js` (new), `tests/premium.spec.js` (now the page), `tests/redesign.spec.js`, `tests/tutorial.spec.js`, `tests/mentor.spec.js` (the Mentor's page), and the page lists in `tests/themes.spec.js` and `tests/names-and-uzbek.spec.js`.

## 4z. THE MENTOR AGENT: THE MENTOR CAN ACT, AFTER YOU SAY YES (November 2026)

The Mentor could only advise. Now it can also **do things for the hero**: add a quest, a goal or a to-do, start a focus session, open a page. It costs nothing and never acts by itself.

### How it works
- **Commands, on the device (free, offline, unlimited).** The Mentor's ASK box (MORE → 🧭 MENTOR) understands plain commands in English, Russian and Uzbek. Several can go in one line, separated by `;`.

  | What | English | Русский | Oʻzbekcha |
  |---|---|---|---|
  | Focus session | `focus 25 min on reading`, `start focus`, `set a timer for 10 minutes` | `фокус 25 минут на чтение`, `запусти таймер на 1 час` | `fokus 25 daqiqa`, `kitob oʻqishga 25 daqiqa fokus`, `fokusni boshla` |
  | Recurring quest | `add quest: read 20 pages every day`, `new weekly habit: call grandma` | `добавь квест: читать 20 страниц каждый день` | `kvest qoʻsh: har kuni 20 bet kitob oʻqish`, `suv ichish odatini qoʻsh` |
  | One-time goal | `goal: pass IELTS in 10 steps`, `my goal is …` | `цель: сдать IELTS`, `моя цель …` | `maqsad: IELTS topshirish` |
  | To-do | `todo tomorrow: buy a notebook`, `add task …` | `задача на завтра: купить тетрадь` | `vazifa ertaga: daftar sotib olish` |
  | Open a page | `open stats`, `open calendar`, `go to my to-do` | `открой статистику` | `statistikani och` |

  A question stays a question: anything ending in `?`, starting with a question word (how, как, qanday…), or using an Uzbek question word without a `command:` form goes to the Mentor as before. "focus" alone, or "how do I focus", gets advice, not a timer. The examples are in a folded **🤖 AGENT** section with tap-to-try chips.
- **Mentor AI as the agent (optional, same free limits).** When Mentor AI is on, the app asks the Worker in `mode:"agent"`. The model answers with a short reply plus **up to 5 proposed actions** ("help me prepare for IELTS" → a daily words quest, a weekly practice test, a goal, a focus session). It is the **same quota** as Mentor AI: 3 a day for a signed-in hero, 20 for Premium, 200 for everyone together, so the free Cloudflare allowance still cannot turn into a bill. Plain commands never use the quota: they are handled on the device before any AI is asked.

### Safety: the agent proposes, the hero decides
1. **An allowed list.** Only five kinds exist: `quest` (daily or weekly), `goal` (1–99 steps), `todo` (today or tomorrow), `focus` (5–120 minutes), `open` (TODAY, QUESTS, TO-DO, CALENDAR, STATS, STORY, LEARN, BUDGET, PROFILE). Anything else ("delete", the admin page, a field the app does not know) is dropped, names are cut to 60 characters (to-dos 120), numbers are clamped. The Worker does this (`cleanActions`) and the app does it again (`agentClean`), because the app never trusts the network.
2. **Cards, not changes.** Each action is shown as a card. Asking, reading the answer and even opening a window change nothing in the save (tests compare the whole save before and after).
3. **The usual windows.** A quest or goal card opens the normal NEW QUEST window filled in: the hero can edit it, and only SAVE adds it, with the same slot rules as before (no recurring slot yet → it starts as a 7-step goal). A to-do card fills the To-Do box with the right day, and only ADD saves it. A focus card shows a picker of today's open quests and to-dos (the one named in the command is preselected) and starts only on ▶ START; the session counts toward the asked minutes without changing the hero's default goal. An open card goes through the normal navigation, so a sealed section stays sealed.
4. **Health and safety words never become actions.** A command or a proposed action that mentions self-harm, disordered eating or diet/calories/weight is dropped; the hero gets the Mentor's fixed careful answer instead (section 4x). `agUnsafe` also refuses food restriction, a body or energy number (kg, kcal) or a weight goal, and exercise past a safe cap: more than 100 reps (push-ups, squats, отжимания, otjimaniya…) or more than 10 km (6 miles).

### Admin, languages, data
- **Admin:** a new feature `mentorAgent` ("Mentor Agent (commands)", open by default). Sealing or removing it hides the 🤖 AGENT section and the cards, commands go back to being questions, and Mentor AI is asked in plain chat mode with any actions ignored. The on-device Mentor and Mentor AI are not affected. Sealing `mentor` hides everything, as before.
- **Languages:** every card, button and hint is in `MENTOR_TXT` in English, Russian and Uzbek (the existing test checks all three, the placeholders and the Uzbek `ʻ`); the unlock message is in the RU/UZ dictionaries.
- **Data:** **no new save field and no migration.** The agent reads the save and writes nothing; a focus session uses the existing timer fields. The request to the Worker gained one field, `mode` (`"agent"` or `"chat"`); what is sent about the hero is unchanged (4x).

### Cost and risks
Free: commands run on the phone, and AI proposals use the existing Worker and its free Workers AI allowance. An agent answer is a little longer (up to 650 tokens instead of 450), so the free allowance covers somewhat fewer AI requests a day (roughly 140 to 200 instead of about 200); `GLOBAL_DAILY_LIMIT` still caps it. The model may return broken JSON; the Worker then answers "busy" without counting the question, and the app falls back to the device. The model may also propose an unhelpful action, which is why it is only ever a card.

Tests: `tests/agent.spec.js` (new: the commands in three languages, questions staying questions, each card through its usual window, focus minutes, sealed pages, safety words, the AI's proposals checked again, the admin lock, Russian and Uzbek, no new save field), `tests/ai-proxy.spec.js` (agent mode: the allowed list and clamping, code fences, plain text and broken JSON, every gate still in place), `tests/mentor.spec.js` (the request's fields now include `mode`).

## 4aa. THE SYSTEM AGENT: A NIGHTLY CHECK THAT REPORTS BUGS ITSELF (November 2026)

The tests already run on every push (`.github/workflows/tests.yml`). But this app is full of dates (streaks, weeks, months, the UTC day of Mentor AI), and some bugs appear only on a certain day, after a browser update, or when the live site breaks without any push. So a second workflow checks every night, and **writes the bug report itself**.

- **When:** every night at 01:23 UTC (06:23 in Tashkent), and any time from **Actions → Nightly system check → Run workflow**. GitHub runs scheduled workflows **from the default branch only**, so it starts once this branch is merged.
- **What it checks:** the whole test suite (with one retry, so a test that passes only on the second try is listed as *flaky*), and that the live site answers with the app (`<title>LEVEL UP</title>`). The address is the repository variable `LIVE_URL`, default `https://shaxriyorsharifov08-hash.github.io/Level-up/`.
- **What it does** (`scripts/nightly-report.mjs`, plain Node, no packages):
  - something broken and no open report → it **opens one issue** labelled `nightly-tests` (the label is created if needed): the failing tests with where they are and the first line of each error, the full errors folded, the flaky tests, the live-site status, a link to the run, and how to reproduce;
  - still broken on the next nights → it **updates the same issue** (no duplicates) and adds a short comment **only when the list of failures changed**;
  - all well again → it comments "All N tests pass again" and **closes the issue** as completed.
  The run itself is also marked failed, and the Playwright report is kept for 14 days as an artifact.
- **AI summary (optional, free):** for a broken night it asks GitHub Models (free tier, `openai/gpt-4.1-mini`, with the workflow's own token) for a short guess at the likely cause, shown under "AI summary (GitHub Models; it can be wrong)". Only test names and error messages are sent (the code is public anyway), never anyone's data. Any error just leaves the summary out. To switch it off: repository **Settings → Secrets and variables → Actions → Variables → `NIGHTLY_AI` = `off`**.
- **No secret:** it uses only `GITHUB_TOKEN`, with `contents: read`, `issues: write`, `models: read`. Nothing to set up.
- **Cost:** free. Public repositories get GitHub Actions minutes for free (one run is about 6 to 8 minutes), and one model request a night is well inside the free GitHub Models limits.

Tests: `tests/nightly-report.spec.js` runs the script in Node against a fake GitHub, a fake live site and a fake model: reading Playwright's results, one issue opened then updated then closed, a down site and a crashed run, the AI summary optional and limited to test names and errors, and no secret or package.
