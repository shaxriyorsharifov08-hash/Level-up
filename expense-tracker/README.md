# 💰 Money Tracker

A personal-finance app — part of the **Level-up** project. Installable on phone
and laptop, works offline, and syncs across your devices when you sign in.

Built for everyday money management: see where your money goes each month, set
budgets, track several accounts, and understand how much you're saving.

## Features

- **Dashboard** — total balance, monthly income/expenses, **savings rate**,
  spending-by-category chart, a 6-month income-vs-expenses trend, budget
  highlights, and recent activity
- **Budgets** — set a monthly limit per category with progress bars and
  near-limit / over-limit warnings
- **Accounts** — track cash, cards, bank, and savings separately and combined
- **Transactions** — add, **edit**, delete, search, and filter by
  month / type / category / account
- **Month navigation** — step through any month to review it
- 🌙 Light / dark theme
- 📱 **Installable PWA** — home-screen icon, works offline
- ☁️ **Cross-device sync** via Firebase (optional) — sign in and your data
  follows you between devices in real time
- 🔒 Local-first: fully usable with no setup; each account only sees its own data

## Two modes

| Mode | When | Where data lives |
|------|------|------------------|
| **Local** | No Firebase config, or signed out | This browser |
| **Synced** | Firebase set up **and** signed in | Your account, synced everywhere |

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
| `index.html` | App shell, views, PWA meta |
| `styles.css` | Design system & light/dark themes |
| `app.js` | App logic, charts, local + cloud (Firestore) sync |
| `firebase-config.js` | Your Firebase project keys (public; see SETUP.md) |
| `firestore.rules` | Per-user database security rules |
| `manifest.webmanifest` · `sw.js` · `icons/` | PWA install & offline support |
| `SETUP.md` | Step-by-step hosting & sync guide |

## Data model

Per signed-in user, three Firestore collections under `users/{uid}/`:
`accounts`, `transactions`, and `budgets`. In local mode the same shapes are
stored in `localStorage`. Charts are drawn by hand (no external libraries) so
everything works offline.
