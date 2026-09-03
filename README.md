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

---

## 3. Files in this repo

| File | Purpose |
|---|---|
| `index.html` | The entire app (CSS at the top, HTML in the middle, JS at the bottom) |
| `notify-sw.js` | Notification-only service worker. **Has no caching on purpose** — do not add caching to it |
| `sw.js` | Old service worker turned into a kill switch. Keep it — it cleans up old installs |
| `manifest.webmanifest` | PWA identity (name, icons, colors) for "Add to Home screen" |
| `icon-192.png`, `icon-512.png`, `apple-touch-icon.png` | App icons |

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

## 4b. THE WORLD — the walkable hub city

The app no longer opens on a menu. It opens on a **top-down world you walk**, like a game lobby.

- Movement: **hold and drag anywhere** on the world (a floating joystick appears under your thumb, Brawl-Stars style), or **WASD / arrow keys** on a computer. **E** or **Enter** opens the door you are standing at.
- Each **building is a section** of the System. Walk to a building's **south-facing door** (the glowing one at the bottom) and an `ENTER` button appears.
- A section that is still sealed shows a **🔒 and the level needed** on the building itself — the door refuses you until you have earned it. This uses the exact same lock system as before (ADMIN CONSOLE → SECTION LOCKS), so nothing about progression changed.
- A section the Administrator **removed** has no building at all.
- The **minimap** (top right) shows the whole district and where you are standing.
- Your position is saved — you come back where you left.

### The city is organised by INTENT, not by feature

Every building answers **one sentence a real person says out loud** — the sentence is written under its sign. The old sections became the **rooms inside** them.

| Building | The sentence it answers | Rooms inside |
|---|---|---|
| 🌱 ACADEMY | *"I want to become someone"* | Discipline · Education · Physical · Emotional |
| 🏋 TRAINING YARD | *"I want to train my body"* | Interval Timer · Daily Package · Body & Stats · Challenges |
| 🏦 TREASURY | *"I want control of my money"* | Budget · Reward Vault · Armory |
| 🏠 SANCTUARY | *"Who am I becoming?"* | The Oath · Profile · Story Path · Manual · Settings |
| 📜 QUEST BOARD | *"What did I commit to?"* | — opens QUESTS directly |
| ⚔ CLAN HALL | *"I don't want to do this alone"* | — opens CLAN directly |
| 🏆 HALL OF HONOR | *"I want proof of what I've done"* | — opens HONOR directly |
| ⚔ OATH STONE | the monument where you swore | reads your oath back |

**Buildings are never sealed. Rooms are.** You walk into the Treasury and see which vaults you have not earned yet, with the level written on them. This uses the same lock system as before (ADMIN CONSOLE → SECTION LOCKS) — nothing about progression changed.

**The architecture rule:** the city is where you go to **start** something; the dock is where you go to **do** it. Anything touched every day stays one tap away — that is why the +1% dock now opens with WORLD · HOME · QUESTS · LEARN · TIMER. Existing hunters get this order once, automatically (`state.navIntentV2`); renamed and hidden tabs are preserved, and you can reorder again any time in SETTINGS → RENAME & REORDER TABS.

### How maps work (this is the important part for editing)

Every walkable place — the city and every interior — is an entry in **`WMAPS`** in `index.html`:

| Field | Meaning |
|---|---|
| `kind` | `"city"` (streets + buildings) or `"room"` (tiled floor + stations) |
| `w`, `h` | size of the map in world units |
| `fit` | `true` = zoom so the whole room is on screen at once (interiors); leave out for outdoor maps, which scroll with the camera |
| `iso` | `true` = draw this map in **isometric 2.5D** (solid boxes with height and shaded faces) instead of flat top-down. Per-map, so maps can be converted one at a time |
| `r3d` | `true` = draw this map in **real 3D** (WebGL). Keep `iso:true` alongside it — that is the fallback whenever 3D cannot run |
| `spawn` | `{x,y}` where you appear when you arrive |
| `nodes` | the things with doors — each has `x,y,w,h`, `ico`, `name`, colors `a` (dark) / `b` (light), and a `go` |
| `walls` | solid blocks you cannot enter (`desk:true` draws it as furniture) |

A node's **`go`** decides what its door does:
- `go:{page:"quests"}` — open that section
- `go:{page:"learn", cat:"discipline"}` — open a section already switched to that road
- `go:{map:"academy"}` — walk into another map
- `go:{map:"city", at:{x,y}}` — walk out, landing at an exact spot
- `face:"n"` puts the door on the **north** side instead of the south (used for exits set into the bottom wall)
- `prompt:"..."` overrides the button text (so an exit says *LEAVE*, not *ENTER*)

City nodes also carry `page`, which is what the lock system checks.

**Adding a whole new interior is now one `WMAPS` entry plus a `go:{map:"..."}` on the building that leads to it.** Nothing else needs to change.

### THE ACADEMY (the first interior)

Walking into the ACADEMY building no longer opens a menu — it puts you **inside a room**. Four stations, one per road (🔥 DISCIPLINE, 📚 EDUCATION, 💪 PHYSICAL, 🧠 EMOTIONAL), each showing **how many levels of that road you have cleared** right on the station. Walk into one and LEARN & GROW opens on that road. The 🚪 door in the south wall returns you to the city, standing outside the Academy where you came in.

Which map you are standing in is saved (`state.world.map`), so closing the app inside the Academy reopens inside the Academy.

Everything in the world is **drawn with code** — there are no image files. That is deliberate: the app stays one file and opens instantly on a phone.

### Isometric maps (`iso:true`)

THE ACADEMY is drawn in **isometric 2.5D**: rooms and doors are solid boxes with a lit top, two shaded side faces, and a glowing doorway on the south face. This is real depth, not a filter.

**It is only a rendering change.** The world stays a plain flat grid — collision, door zones, travel and saved positions are all still ordinary `x`/`y` and know nothing about the projection. That is why a map can be switched over with a single `iso:true` and nothing else breaks.

Three things the projection has to get right, all handled in `index.html`:

- **Steering.** Input is rotated back into world space (`ISO_KX`/`ISO_KY`), so dragging right walks the hunter right on screen instead of diagonally.
- **Depth.** Objects are sorted back-to-front so the hunter passes behind far rooms and in front of near ones. The two back walls are drawn before that pass — a single sort key cannot place a wall spanning the whole room — and the low south/east trim after it.
- **Signs.** Labels are collected and drawn in a second pass, otherwise a box drawn later paints over the sign of the one before it.

### Real 3D maps (`r3d:true`)

THE ACADEMY is rendered as an actual WebGL interior: stone floor with an inlaid border, tall walls with a cornice, columns down both sides, bookshelves along the north wall, a lit study table, and four archway stations you walk into. A third-person camera follows the hunter.

**Three.js is only fetched when a 3D map is entered** (`THREE_SRC`, ~600 KB), so the app's front door never waits on the network. It is layered so that 3D can never cost you the room:

- CDN unreachable (offline) → falls back to the isometric renderer
- device has no WebGL → falls back
- anything throws while building or drawing the scene → `g3Fail()` frees the scene, disables 3D for the session, and falls back

That is why an `r3d` map keeps `iso:true` as well. Leaving the map disposes the scene and frees GPU memory; returning rebuilds it.

The camera is axis-aligned (world x → screen right, world y → into the screen), so input is **not** rotated on a 3D map — only on a map actually drawn isometrically. The world stays a flat grid throughout; collision, doors, travel and saved positions never change.

To convert another map: add `r3d:true` next to its `iso:true`. The room, its stations, locks and progress read straight from the same `WMAPS` entry — no separate 3D model list to maintain.

`ISO_KY` versus `ISO_KX` is the camera pitch. Classic 2:1 isometric is `KY = KX/2`, which on a tall phone squashes the room into a ribbon; `0.38` keeps the solid-box look while filling the screen. The rest of the world is still top-down — set `iso:true` on another map when you want it converted.

The old **+1% dock still works** and reaches every section directly. The world is a new way in, not a cage.

## 4c. LEARN & GROW — the four roads

A teaching section, not a tracking section (ACADEMY building, or the 🌱 tab).

Four categories — **DISCIPLINE (CON)**, **EDUCATION (INT)**, **PHYSICAL (STR)**, **EMOTIONAL (END)** — each a ladder of **10 levels** that alternates:

- a **VIDEO** level (a written lesson plus a button that opens a YouTube search for exactly that topic), and
- a **TASK** level built on the lesson before it — a real action in the real world, sometimes running for 7, 14 or 30 days.

**A level stays sealed until the level before it is completed.** Completing one grants XP and attribute training that grow as you climb (Level 1 = +40 XP / +2 points, Level 10 = +148 XP / +5 points).

Videos are **not hosted** — that would need a paid server. Instead each video level opens a YouTube search for the lesson topic, and you can **paste your own link** into the level to pin the exact video there forever (saved per device, under `state.learn.links`).

**A lesson must produce action, or it is just motivation followed by nothing.** Every TASK level has an **⚔ ACCEPT** button that creates a **real quest in your log** — a daily quest for its full length (a 3-day vow becomes a 3-day quest, the 30-day vow a 30-day one), or a one-time goal if it is a single-sitting task. The System assigns it, so **it never spends a quest slot** and works from Level 1. The level itself is sealed until you come back and say it is genuinely done, and the quest stays in your log afterwards so you can keep it as a habit or delete it.

To change the curriculum, edit `LEARN_PATH` in `index.html`: `t` is `"video"` or `"task"`, `n` is the title, `d` is the body, `q` is the YouTube search text, `dur` is how many days a task's quest should run.

## 4e. THE INTERVAL TIMER

TRAINING YARD → ⏱ INTERVAL TIMER (or the ⏱ TIMER tab). Rounds of work and rest, for the body — **distinct from the Focus Timer**, which measures one long unbroken session on a quest.

Presets: TABATA (20/10×8), HIIT (40/20×10), EMOM (60/0×10), STRENGTH (45/90×5), or CUSTOM. Work is clamped to a 5-second minimum, rounds to 99.

Finishing a session **logs the work time into the same `timeHistory` the STATS page charts**, trains END, and grants XP proportional to the time worked (capped at 120). Nothing here is decoration — the System counts every round.

## 4d. THE OATH — the hunter's own words, used against them

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
| Quest lockdown (two empty days) | *the words they told the System to say when they want to quit* |
| Penalty quest | *the promise they admitted to breaking before* |
| Level up | *who they swore they would be* |
| Rank up | *who they swore they would be* |
| Mentor, after 3+ empty days in a week | *their own anti-quitting words, instead of generic advice* |

Nothing speaks over the Oath: any System announcement already on screen is parked and resumes the moment the oath is sealed.

The oath can be re-sworn (PROFILE → THE OATH, or the ⚔ OATH STONE monument in the city plaza). **Re-swearing never erases the original** — the first `sworn` date is what the System keeps quoting, and every earlier version is kept in `state.oath.prev`.

To change the questions, edit `OATH_Q` (`k` is the storage key, `n` the question, `h` the hint, `p` the placeholder) and `OATH_PRE` for the opening text. Adding a question means adding a matching case to `oathLine()` if you want it quoted anywhere.

## 4f. REPORTS — written by you, and mandatory

STATS → 📋 REPORTS. The System already grades your month automatically; these are the other half — **what you write, in your own words, when a period closes**.

| Report | Opens | Deadline |
|---|---|---|
| 🗓 WEEKLY | the Monday after the week ends | **1 day** |
| 📅 MONTHLY | the 1st of the next month | **3 days** |
| 🏛 ANNUAL | 1 January | **7 days** |

Before you write, the System hands you the numbers it already has for that period — quests cleared, XP, active days, focused hours — so the report is for what the numbers *do not* show. Minimum 40 characters.

**Missing a deadline costs XP debt** (40 weekly, 120 monthly, 300 annual), announced by the System and never charged twice for the same period. A missed report can still be filed; the record permanently says LATE, and a late filing earns no XP. Filing on time pays 30 / 80 / 200.

**No report is ever demanded retroactively.** `state.reportsSince` is stamped the first time the feature runs, so a hunter who was already playing is never billed for weeks that closed before the rule existed.

## 4g. ONE QUEST, FULL SCREEN

In QUESTS, **tap a quest card** (anywhere except its buttons) and it opens full screen with everything the System knows about that one habit:

- current streak, best streak, total times cleared, how many of the last 30 days, progress toward the next reward, total time logged
- a **12-week grid** — one square per day, lit on days you cleared it — and a plain sentence saying whether you are rising, slipping or holding against the previous 30 days
- **its own interval timer**, whose rounds are saved with that quest (`q.iv`). Finishing a session logs the time **against that quest**, and satisfies a ⏱ TIMER QUEST
- every completion date on record, newest first

The interval engine is one engine with two faces (`iv.ui` is `"iv"` for the TRAINING YARD page or `"qv"` for the quest window), so only one session can run at a time — which is also the truth about doing interval work. A session started inside a quest keeps running and still logs correctly if you close the window.

## 4h. RANK — eligibility is not promotion

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
