# 💰 Money Tracker

A personal expense tracker — part of the **Level-up** project. Installable on
phone and laptop, works offline, and syncs across your devices when you sign in.

## Features

- ➕ Add income & expense transactions (category, date, description)
- 📊 Live balance, income, and expense totals
- 🗂️ Filter history; per-category spending breakdown
- 🌙 Light / dark theme
- 📱 **Installable PWA** — add to your home screen, works offline
- ☁️ **Cross-device sync** via Firebase (optional) — sign in and your data
  follows you between phone and laptop in real time
- 🔒 Local-first: works fully without any setup; each account only ever sees
  its own data

## Two modes

| Mode | When | Where data lives |
|------|------|------------------|
| **Local** | No Firebase config, or signed out | This browser (localStorage) |
| **Synced** | Firebase set up **and** signed in | Your Firebase account, synced everywhere |

The app starts in local mode out of the box — nothing to configure to use it.

## Use it / host it

To get a permanent link, install it on your devices, and turn on sync, follow
**[SETUP.md](./SETUP.md)** (GitHub Pages + Firebase, both free).

### Run locally

```bash
cd expense-tracker
python3 -m http.server 8000
# visit http://localhost:8000
```

## Files

| File | Purpose |
|------|---------|
| `index.html` | Markup, layout, PWA meta |
| `styles.css` | Styling and light/dark themes |
| `app.js` | App logic; local + cloud (Firestore) sync |
| `firebase-config.js` | Your Firebase project keys (public; see SETUP.md) |
| `firestore.rules` | Per-user database security rules |
| `manifest.webmanifest` · `sw.js` · `icons/` | PWA install & offline support |
| `SETUP.md` | Step-by-step hosting & sync guide |
| `artifact.html` | Standalone single-file preview build |
