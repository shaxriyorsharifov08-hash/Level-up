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

The city grid, in `index.html`, is the `BUILDINGS` array. To move a room, change its `x`/`y`; to recolor it, change `a` (dark) and `b` (light). To add a room you also need a matching `page-<name>` section and an entry in `PAGES` / `NAV_ORDER` / `NAV_ICON` / `NAV_LABEL`.

Everything in the world is **drawn with code** — there are no image files. That is deliberate: the app stays one file and opens instantly on a phone.

The old **+1% dock still works** and reaches every section directly. The world is a new way in, not a cage.

## 4c. LEARN & GROW — the four roads

A teaching section, not a tracking section (ACADEMY building, or the 🌱 tab).

Four categories — **DISCIPLINE (CON)**, **EDUCATION (INT)**, **PHYSICAL (STR)**, **EMOTIONAL (END)** — each a ladder of **10 levels** that alternates:

- a **VIDEO** level (a written lesson plus a button that opens a YouTube search for exactly that topic), and
- a **TASK** level built on the lesson before it — a real action in the real world, sometimes running for 7, 14 or 30 days.

**A level stays sealed until the level before it is completed.** Completing one grants XP and attribute training that grow as you climb (Level 1 = +40 XP / +2 points, Level 10 = +148 XP / +5 points).

Videos are **not hosted** — that would need a paid server. Instead each video level opens a YouTube search for the lesson topic, and you can **paste your own link** into the level to pin the exact video there forever (saved per device, under `state.learn.links`).

To change the curriculum, edit `LEARN_PATH` in `index.html`: `t` is `"video"` or `"task"`, `n` is the title, `d` is the body, `q` is the YouTube search text.

## 5. Features you may want to adjust later

- **Language**: ADMIN → 🌐 LANGUAGE. English is the base; Russian is a dictionary at the top of the JS in `index.html` (search for `I18N_RU`). Any string missing from the dictionary simply stays English — it can never break the app. To add Uzbek: copy the `I18N_RU` table to `I18N_UZ`, translate values, add `<option value="uz">O'zbekcha</option>` in the LANGUAGE panel, and extend `tr()` / `trTextNode()` / `startI18n()` where they check `=== "ru"`.
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
