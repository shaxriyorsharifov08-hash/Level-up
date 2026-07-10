# Setup — hosting & cross-device sync

Two things to turn on, both free and one-time:

1. **GitHub Pages** — gives you a permanent link you can open and install on any device.
2. **Firebase** — makes your data sync across phone and laptop when you sign in.

The app works without either (local mode). Do step 1 to get the link; do step 2 when you want sync.

---

## 1 · Publish with GitHub Pages

1. Go to your repo on GitHub → **Settings** → **Pages** (left sidebar).
2. Under **Build and deployment → Source**, choose **Deploy from a branch**.
3. Branch: pick **`claude/new-session-2qws2e`** (or **`main`** once this is merged), folder **`/ (root)`**. Click **Save**.
4. Wait ~1 minute, then refresh. GitHub shows your live URL, which will be:

   ```
   https://shaxriyorsharifov08-hash.github.io/Level-up/
   ```

That link opens the tracker. On your **phone**, open it in the browser → *Share* → **Add to Home Screen**. On your **laptop** (Chrome/Edge), click the **install ⊕** icon in the address bar. Now it launches like a real app and works offline.

> Until you finish step 2, each device keeps its own data.

---

## 2 · Turn on sync with Firebase (free)

### a. Create the project
1. Go to <https://console.firebase.google.com> and **Add project** (any name, e.g. `level-up-money`). Google Analytics is optional — you can skip it.

### b. Register a Web App
2. On the project's **Project Overview**, click the **`</>` (Web)** icon.
3. Give it a nickname, **Register app**. Firebase shows a `firebaseConfig = { … }` snippet — keep it open.

### c. Paste the config
4. Open **`expense-tracker/firebase-config.js`** in this repo and replace the placeholder values with the ones from your snippet (`apiKey`, `authDomain`, `projectId`, `storageBucket`, `messagingSenderId`, `appId`). Commit & push. *(These values are public identifiers, not secrets — safe to commit.)*

### d. Enable Google sign-in
5. In the console: **Build → Authentication → Get started → Sign-in method → Google → Enable → Save**.
6. **Authentication → Settings → Authorized domains → Add domain** and add:
   ```
   shaxriyorsharifov08-hash.github.io
   ```
   *(This lets sign-in work from your GitHub Pages site. `localhost` is already allowed for local testing.)*

### e. Create the database
7. **Build → Firestore Database → Create database** → start in **production mode** → pick a location → **Enable**.
8. Open the **Rules** tab, replace everything with the contents of **`expense-tracker/firestore.rules`** (in this repo), and **Publish**. These rules ensure each person can only read/write their own data.

### Done
Open your Pages link, tap **Sign in to sync**, choose your Google account. If you already added transactions on this device, the app offers to move them into your account. Now anything you add on one device shows up on the other. 🎉

---

## Troubleshooting

| Problem | Fix |
|---|---|
| **Sign-in popup closes with `auth/unauthorized-domain`** | Add your Pages domain under Authentication → Settings → Authorized domains (step d6). |
| **"Missing or insufficient permissions"** | Publish the rules from `firestore.rules` (step e8) and make sure you're signed in. |
| **Still says "Local mode"** | `firebase-config.js` still has placeholder values, or the push hasn't deployed yet. |
| **Changes don't appear on the site** | Pages can take a minute to rebuild after a push; hard-refresh (Ctrl/Cmd-Shift-R). |
