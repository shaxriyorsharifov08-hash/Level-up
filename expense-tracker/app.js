// ───────────────────────────── Money Tracker ─────────────────────────────
// Runs in two modes:
//   • LOCAL  — no Firebase config, or signed out: data saved in this browser.
//   • CLOUD  — Firebase configured and signed in: data synced across devices
//              in real time, and available offline via Firestore's cache.
// The app always works; cloud sync layers on top when it's set up.
// ──────────────────────────────────────────────────────────────────────────

import { firebaseConfig, FIREBASE_SDK_VERSION, isFirebaseConfigured } from './firebase-config.js';

const STORAGE_KEY = 'levelup.transactions';
const THEME_KEY = 'levelup.theme';
const CATEGORY_ICONS = {
  Food: '🍔', Transport: '🚗', Housing: '🏠', Shopping: '🛍️', Bills: '💡',
  Health: '🏥', Entertainment: '🎬', Salary: '💰', Other: '📦',
};

// ── App state ──
let transactions = [];
let currentFilter = 'all';
let mode = 'local';        // 'local' | 'cloud'
let user = null;           // Firebase user when signed in
let fb = null;             // { auth, db, ...functions } once Firebase loads
let unsubscribe = null;    // active Firestore listener

// ── Elements ──
const $ = (id) => document.getElementById(id);
const form = $('txForm');
const txList = $('txList');

// ── Local persistence ──
function loadLocal() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || []; } catch { return []; }
}
function saveLocal() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(transactions)); } catch {}
}

// ── Formatting ──
const fmt = (n) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n);
function formatDate(iso) {
  const d = new Date(iso + 'T00:00:00');
  return isNaN(d) ? iso : d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

// ── Rendering ──
function render() { renderSummary(); renderList(); renderBreakdown(); }

function renderSummary() {
  const income = transactions.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0);
  const expense = transactions.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
  $('incomeVal').textContent = fmt(income);
  $('expenseVal').textContent = fmt(expense);
  $('balanceVal').textContent = fmt(income - expense);
}

function renderList() {
  const items = transactions
    .filter((t) => currentFilter === 'all' || t.type === currentFilter)
    .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
  txList.innerHTML = '';
  $('emptyState').style.display = items.length ? 'none' : 'block';
  for (const t of items) {
    const li = document.createElement('li');
    li.className = 'tx-item';
    li.innerHTML =
      `<div class="tx-icon ${t.type}">${CATEGORY_ICONS[t.category] || '📦'}</div>` +
      `<div class="tx-info"><div class="tx-desc"></div>` +
      `<div class="tx-meta">${t.category} · ${formatDate(t.date)}</div></div>` +
      `<div class="tx-amount money ${t.type}">${t.type === 'income' ? '+' : '−'}${fmt(t.amount)}</div>` +
      `<button class="tx-del" title="Delete" aria-label="Delete">×</button>`;
    li.querySelector('.tx-desc').textContent = t.desc;
    li.querySelector('.tx-del').addEventListener('click', () => remove(t.id));
    txList.appendChild(li);
  }
}

function renderBreakdown() {
  const byCat = {};
  for (const t of transactions) {
    if (t.type !== 'expense') continue;
    byCat[t.category] = (byCat[t.category] || 0) + t.amount;
  }
  const entries = Object.entries(byCat).sort((a, b) => b[1] - a[1]);
  const total = entries.reduce((s, [, v]) => s + v, 0);
  const container = $('breakdown');
  container.innerHTML = '';
  $('breakdownEmpty').style.display = entries.length ? 'none' : 'block';
  for (const [cat, amt] of entries) {
    const pct = total ? (amt / total) * 100 : 0;
    const row = document.createElement('div');
    row.className = 'bd-row';
    row.innerHTML =
      `<div class="bd-top"><span class="bd-cat">${CATEGORY_ICONS[cat] || '📦'} ${cat}</span>` +
      `<span class="bd-amt money">${fmt(amt)} · ${pct.toFixed(0)}%</span></div>` +
      `<div class="bd-bar"><div class="bd-fill" style="width:${pct}%"></div></div>`;
    container.appendChild(row);
  }
}

// ── Add / remove (routes to local or cloud) ──
async function add(tx) {
  if (mode === 'cloud' && fb && user) {
    const { addDoc, collection, serverTimestamp } = fb;
    await addDoc(collection(fb.db, 'users', user.uid, 'transactions'), {
      type: tx.type, desc: tx.desc, amount: tx.amount,
      category: tx.category, date: tx.date, createdAt: serverTimestamp(),
    });
    // Firestore's onSnapshot re-renders; no local write needed.
  } else {
    transactions.push(tx);
    saveLocal();
    render();
  }
}

async function remove(id) {
  if (mode === 'cloud' && fb && user) {
    const { deleteDoc, doc } = fb;
    await deleteDoc(doc(fb.db, 'users', user.uid, 'transactions', id));
  } else {
    transactions = transactions.filter((t) => t.id !== id);
    saveLocal();
    render();
  }
}

// ── Form / controls ──
form.addEventListener('submit', async (e) => {
  e.preventDefault();
  const amount = parseFloat($('amount').value);
  if (!(amount > 0)) return;
  const tx = {
    id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
    type: form.type.value,
    desc: $('desc').value.trim() || 'Untitled',
    amount, category: $('category').value, date: $('date').value,
  };
  const submitBtn = form.querySelector('.submit-btn');
  submitBtn.disabled = true;
  try {
    await add(tx);
  } catch (err) {
    showBanner('Could not save transaction — ' + (err?.message || err), 'error');
  } finally {
    submitBtn.disabled = false;
  }
  form.reset();
  $('typeExpense').checked = true;
  $('date').value = today();
  $('desc').focus();
});

$('filter').addEventListener('change', (e) => { currentFilter = e.target.value; renderList(); });

$('clearAll').addEventListener('click', async () => {
  if (!transactions.length) return;
  if (mode === 'cloud') {
    if (!confirm('Delete ALL transactions from your account? This cannot be undone.')) return;
    try {
      const { deleteDoc, doc } = fb;
      await Promise.all(transactions.map((t) => deleteDoc(doc(fb.db, 'users', user.uid, 'transactions', t.id))));
    } catch (err) {
      showBanner('Could not clear data — ' + (err?.message || err), 'error');
    }
  } else {
    if (!confirm('Delete ALL transactions on this device? This cannot be undone.')) return;
    transactions = [];
    saveLocal();
    render();
  }
});

// ── Theme ──
const themeToggle = $('themeToggle');
function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  themeToggle.textContent = theme === 'dark' ? '☀️' : '🌙';
  try { localStorage.setItem(THEME_KEY, theme); } catch {}
}
themeToggle.addEventListener('click', () => {
  const cur = document.documentElement.getAttribute('data-theme');
  applyTheme(cur === 'dark' ? 'light' : 'dark');
});

// ── Banner + account UI ──
function showBanner(html, kind = 'info') {
  const b = $('syncBanner');
  b.className = 'sync-banner ' + kind;
  b.innerHTML = html;
  b.hidden = false;
}
function hideBanner() { $('syncBanner').hidden = true; }

function renderAccount() {
  const el = $('account');
  const footer = $('footerNote');
  if (mode === 'cloud' && user) {
    el.innerHTML =
      `<span class="sync-dot" title="Synced"></span>` +
      `<span class="acct-email">${user.email || 'Signed in'}</span>` +
      `<button id="signOutBtn" class="chip-btn">Sign out</button>`;
    el.querySelector('#signOutBtn').addEventListener('click', doSignOut);
    footer.textContent = 'Synced to your account across devices.';
  } else if (isFirebaseConfigured()) {
    el.innerHTML = `<button id="signInBtn" class="chip-btn primary">Sign in to sync</button>`;
    el.querySelector('#signInBtn').addEventListener('click', doSignIn);
    footer.textContent = 'Data is saved on this device. Sign in to sync.';
  } else {
    el.innerHTML = '';
    footer.textContent = 'Data is saved on this device.';
  }
}

// ── Cloud (Firebase) setup ──
async function setupCloud() {
  const base = `https://www.gstatic.com/firebasejs/${FIREBASE_SDK_VERSION}`;
  const [appMod, authMod, fsMod] = await Promise.all([
    import(`${base}/firebase-app.js`),
    import(`${base}/firebase-auth.js`),
    import(`${base}/firebase-firestore.js`),
  ]);

  const app = appMod.initializeApp(firebaseConfig);

  // Firestore with offline persistence so the PWA works without a connection.
  let db;
  try {
    db = fsMod.initializeFirestore(app, {
      localCache: fsMod.persistentLocalCache({ tabManager: fsMod.persistentMultipleTabManager() }),
    });
  } catch {
    db = fsMod.getFirestore(app);
  }

  const auth = authMod.getAuth(app);
  fb = {
    auth, db,
    GoogleAuthProvider: authMod.GoogleAuthProvider,
    signInWithPopup: authMod.signInWithPopup,
    signInWithRedirect: authMod.signInWithRedirect,
    signOut: authMod.signOut,
    collection: fsMod.collection, addDoc: fsMod.addDoc, deleteDoc: fsMod.deleteDoc,
    doc: fsMod.doc, onSnapshot: fsMod.onSnapshot, query: fsMod.query,
    serverTimestamp: fsMod.serverTimestamp,
  };

  // Complete any redirect-based sign-in (used as a popup fallback on mobile).
  try { await authMod.getRedirectResult(auth); } catch { /* ignore */ }

  authMod.onAuthStateChanged(auth, (u) => {
    user = u || null;
    if (unsubscribe) { unsubscribe(); unsubscribe = null; }
    if (user) {
      mode = 'cloud';
      hideBanner();
      subscribeCloud();
      maybeOfferMigration();
    } else {
      mode = 'local';
      transactions = loadLocal();
      render();
    }
    renderAccount();
  });
}

function subscribeCloud() {
  const { onSnapshot, query, collection } = fb;
  const ref = query(collection(fb.db, 'users', user.uid, 'transactions'));
  unsubscribe = onSnapshot(ref,
    (snap) => {
      transactions = snap.docs.map((d) => {
        const data = d.data();
        return { id: d.id, type: data.type, desc: data.desc, amount: data.amount, category: data.category, date: data.date };
      });
      render();
    },
    (err) => showBanner('Sync error — ' + (err?.message || err), 'error')
  );
}

async function doSignIn() {
  try {
    await fb.signInWithPopup(fb.auth, new fb.GoogleAuthProvider());
  } catch (err) {
    // Popups are often blocked on mobile browsers; fall back to redirect.
    if (err?.code === 'auth/popup-blocked' || err?.code === 'auth/cancelled-popup-request' || err?.code === 'auth/operation-not-supported-in-this-environment') {
      try { await fb.signInWithRedirect(fb.auth, new fb.GoogleAuthProvider()); return; } catch (e2) { err = e2; }
    }
    showBanner('Sign-in failed — ' + (err?.message || err), 'error');
  }
}

async function doSignOut() {
  try { await fb.signOut(fb.auth); } catch (err) { showBanner('Sign-out failed — ' + (err?.message || err), 'error'); }
}

// Offer to move this device's local transactions into the signed-in account.
function maybeOfferMigration() {
  const local = loadLocal();
  if (!local.length) return;
  showBanner(
    `You have <strong>${local.length}</strong> transaction${local.length > 1 ? 's' : ''} saved on this device. ` +
    `<button id="migrateYes" class="chip-btn primary">Add to my account</button> ` +
    `<button id="migrateNo" class="chip-btn">Keep separate</button>`,
    'info'
  );
  $('migrateYes').addEventListener('click', async () => {
    hideBanner();
    try {
      const { addDoc, collection, serverTimestamp } = fb;
      const ref = collection(fb.db, 'users', user.uid, 'transactions');
      for (const t of local) {
        await addDoc(ref, { type: t.type, desc: t.desc, amount: t.amount, category: t.category, date: t.date, createdAt: serverTimestamp() });
      }
      localStorage.removeItem(STORAGE_KEY);
      showBanner('Added to your account and now syncing. ✓', 'success');
      setTimeout(hideBanner, 4000);
    } catch (err) {
      showBanner('Could not upload local data — ' + (err?.message || err), 'error');
    }
  });
  $('migrateNo').addEventListener('click', hideBanner);
}

// ── Init ──
function today() { return new Date().toISOString().slice(0, 10); }

(function init() {
  let savedTheme = null;
  try { savedTheme = localStorage.getItem(THEME_KEY); } catch {}
  applyTheme(savedTheme || (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'));
  $('date').value = today();

  // Local data shows immediately; cloud takes over if/when signed in.
  transactions = loadLocal();
  render();
  renderAccount();

  if (isFirebaseConfigured()) {
    setupCloud().catch((err) => {
      showBanner('Could not start cloud sync — running in local mode. ' + (err?.message || ''), 'error');
    });
  }

  // Register the service worker for offline / installable PWA.
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('sw.js').catch(() => { /* offline install optional */ });
    });
  }
})();
