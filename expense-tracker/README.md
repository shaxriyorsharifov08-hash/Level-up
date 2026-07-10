# 💰 Money Tracker

A simple, self-contained personal expense tracker — part of the **Level-up** project.

Track your income and expenses, see your running balance, and understand where
your money goes with a per-category breakdown.

## Features

- ➕ Add income & expense transactions with category, date, and description
- 📊 Live summary of balance, total income, and total expenses
- 🗂️ Filter history by income / expenses / all
- 📈 Spending breakdown by category with visual bars
- 🌙 Light / dark theme (remembers your choice)
- 💾 Data saved locally in your browser (localStorage) — no account, no server

## Run it

No build step, no dependencies. Just open the app in a browser:

```bash
# from the repo root
open expense-tracker/index.html      # macOS
xdg-open expense-tracker/index.html  # Linux
```

Or serve it locally (recommended so the date input & storage behave consistently):

```bash
cd expense-tracker
python3 -m http.server 8000
# then visit http://localhost:8000
```

## Files

| File         | Purpose                          |
|--------------|----------------------------------|
| `index.html` | Markup & layout                  |
| `styles.css` | Styling and light/dark themes    |
| `app.js`     | App logic & localStorage persistence |

Your data never leaves your browser.
