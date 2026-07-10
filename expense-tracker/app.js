// ══════════════════════════════════════════════════════════════════════════
//  Money Tracker
//  A personal-finance app: dashboard, budgets, accounts, transactions.
//  Works fully offline in LOCAL mode; syncs across devices in CLOUD mode
//  (Firebase configured + signed in). All money is in USD.
// ══════════════════════════════════════════════════════════════════════════

import { firebaseConfig, FIREBASE_SDK_VERSION, isFirebaseConfigured } from './firebase-config.js';

// ── Reference data ──
const CATS = {
  income: ['Salary', 'Tutoring', 'Gift', 'Investment', 'Other'],
  expense: ['Food', 'Transport', 'Housing', 'Bills', 'Shopping', 'Health', 'Entertainment', 'Education', 'Other'],
};
const CAT_ICON = {
  Salary: '💰', Tutoring: '📚', Gift: '🎁', Investment: '📈',
  Food: '🍔', Transport: '🚗', Housing: '🏠', Bills: '💡', Shopping: '🛍️',
  Health: '🏥', Entertainment: '🎬', Education: '✏️', Other: '📦',
};
const ACCOUNT_TYPES = ['Cash', 'Card', 'Bank', 'Savings'];
const ACCOUNT_ICON = { Cash: '💵', Card: '💳', Bank: '🏦', Savings: '🐖' };
const ACCOUNT_COLORS = ['#1f6feb', '#059669', '#d97706', '#7c3aed', '#e11d48', '#0d9488'];
const VIRTUAL_CASH = { id: 'cash', name: 'Cash', type: 'Cash', initialBalance: 0, color: '#1f6feb', virtual: true };

const LS = {
  accounts: 'levelup.accounts', transactions: 'levelup.transactions',
  budgets: 'levelup.budgets', theme: 'levelup.theme',
};

// ── State ──
let accounts = [], transactions = [], budgets = [];
let mode = 'local', user = null, fb = null;
const unsub = { accounts: null, transactions: null, budgets: null };
let currentView = 'dashboard';
let selMonth = new Date();

// ── Tiny helpers ──
const $ = (id) => document.getElementById(id);
const fmt = (n) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 }).format(n || 0);
const fmt0 = (n) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n || 0);
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const monthKey = (d) => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
const monthName = (d) => d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
const monthShort = (d) => d.toLocaleDateString('en-US', { month: 'short' });
const today = () => new Date().toISOString().slice(0, 10);
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
function formatDate(iso) { const d = new Date(iso + 'T00:00:00'); return isNaN(d) ? iso : d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }); }
function inMonth(t, d) { return (t.date || '').slice(0, 7) === monthKey(d); }
function accountOf(t) { return t.accountId || 'cash'; }

// ── Local persistence ──
function loadLocal() {
  try { accounts = JSON.parse(localStorage.getItem(LS.accounts)) || []; } catch { accounts = []; }
  try { transactions = JSON.parse(localStorage.getItem(LS.transactions)) || []; } catch { transactions = []; }
  try { budgets = JSON.parse(localStorage.getItem(LS.budgets)) || []; } catch { budgets = []; }
}
const saveLocal = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} };

// ── Derived ──
function accountsForDisplay() { return accounts.length ? accounts : [VIRTUAL_CASH]; }
function accountById(id) { return accounts.find((a) => a.id === id) || (id === 'cash' ? VIRTUAL_CASH : null); }
function totalBalance() {
  let b = accounts.reduce((s, a) => s + (Number(a.initialBalance) || 0), 0);
  for (const t of transactions) b += t.type === 'income' ? t.amount : -t.amount;
  return b;
}
function accountBalance(id) {
  const a = accountById(id);
  let b = a ? (Number(a.initialBalance) || 0) : 0;
  for (const t of transactions) if (accountOf(t) === id) b += t.type === 'income' ? t.amount : -t.amount;
  return b;
}
function monthTotals(d) {
  let income = 0, expense = 0;
  for (const t of transactions) if (inMonth(t, d)) (t.type === 'income' ? (income += t.amount) : (expense += t.amount));
  return { income, expense, saved: income - expense };
}
function spentByCategory(d) {
  const m = {};
  for (const t of transactions) if (t.type === 'expense' && inMonth(t, d)) m[t.category] = (m[t.category] || 0) + t.amount;
  return m;
}

// ══════════════════════════ CRUD (local or cloud) ══════════════════════════
async function addTx(data) {
  if (mode === 'cloud') {
    await fb.addDoc(fb.collection(fb.db, 'users', user.uid, 'transactions'), { ...data, createdAt: fb.serverTimestamp() });
  } else { transactions.push({ id: uid(), ...data }); saveLocal(LS.transactions, transactions); renderAll(); }
}
async function updateTx(id, data) {
  if (mode === 'cloud') await fb.updateDoc(fb.doc(fb.db, 'users', user.uid, 'transactions', id), data);
  else { const t = transactions.find((x) => x.id === id); if (t) Object.assign(t, data); saveLocal(LS.transactions, transactions); renderAll(); }
}
async function deleteTx(id) {
  if (mode === 'cloud') await fb.deleteDoc(fb.doc(fb.db, 'users', user.uid, 'transactions', id));
  else { transactions = transactions.filter((t) => t.id !== id); saveLocal(LS.transactions, transactions); renderAll(); }
}
async function saveAccount(acc) {
  if (mode === 'cloud') await fb.setDoc(fb.doc(fb.db, 'users', user.uid, 'accounts', acc.id), { name: acc.name, type: acc.type, initialBalance: acc.initialBalance, color: acc.color });
  else { const i = accounts.findIndex((a) => a.id === acc.id); if (i >= 0) accounts[i] = acc; else accounts.push(acc); saveLocal(LS.accounts, accounts); renderAll(); }
}
async function deleteAccount(id) {
  if (mode === 'cloud') await fb.deleteDoc(fb.doc(fb.db, 'users', user.uid, 'accounts', id));
  else { accounts = accounts.filter((a) => a.id !== id); saveLocal(LS.accounts, accounts); renderAll(); }
}
async function setBudget(category, limit) {
  if (limit > 0) {
    if (mode === 'cloud') await fb.setDoc(fb.doc(fb.db, 'users', user.uid, 'budgets', category), { category, limit });
    else { const b = budgets.find((x) => x.category === category); if (b) b.limit = limit; else budgets.push({ id: category, category, limit }); saveLocal(LS.budgets, budgets); renderAll(); }
  } else {
    if (mode === 'cloud') await fb.deleteDoc(fb.doc(fb.db, 'users', user.uid, 'budgets', category)).catch(() => {});
    else { budgets = budgets.filter((x) => x.category !== category); saveLocal(LS.budgets, budgets); renderAll(); }
  }
}

// ══════════════════════════════ Rendering ══════════════════════════════════
function renderAll() {
  $('monthLabel').textContent = monthName(selMonth);
  renderDashboard();
  renderTransactions();
  renderBudgets();
  renderAccounts();
  renderAccountChip();
}

// ---- Dashboard ----
function renderDashboard() {
  const { income, expense, saved } = monthTotals(selMonth);
  $('statBalance').textContent = fmt(totalBalance());
  const nAcc = accountsForDisplay().length;
  $('statBalanceSub').textContent = `${nAcc} account${nAcc > 1 ? 's' : ''}`;
  $('statIncome').textContent = fmt(income);
  $('statExpense').textContent = fmt(expense);
  $('statSaved').textContent = fmt(saved);
  $('statSaved').className = 'stat-value money ' + (saved >= 0 ? 'pos' : 'neg');
  const rate = income > 0 ? Math.round((saved / income) * 100) : 0;
  $('statSavedRate').textContent = income > 0 ? `${rate}% of income kept` : 'No income logged';
  $('incomeMonth').textContent = monthShort(selMonth);
  $('expenseMonth').textContent = monthShort(selMonth);

  renderCategoryChart();
  renderTrendChart();
  renderBudgetSnapshot();
  renderRecent();
}

function renderCategoryChart() {
  const map = spentByCategory(selMonth);
  const entries = Object.entries(map).sort((a, b) => b[1] - a[1]);
  const total = entries.reduce((s, [, v]) => s + v, 0);
  const max = entries.length ? entries[0][1] : 1;
  const el = $('catChart');
  $('catEmpty').style.display = entries.length ? 'none' : 'block';
  $('spendTotal').textContent = entries.length ? fmt(total) + ' total' : '';
  el.innerHTML = entries.map(([cat, amt]) => {
    const pct = total ? Math.round((amt / total) * 100) : 0;
    const w = Math.max(3, (amt / max) * 100);
    const tip = `${esc(cat)} — <b>${esc(fmt(amt))}</b> · ${pct}%`;
    return `<div class="cat-row" data-tip="${tip}">
      <span class="cat-name"><span class="cat-emoji">${CAT_ICON[cat] || '📦'}</span>${esc(cat)}</span>
      <span class="cat-val">${esc(fmt(amt))} · ${pct}%</span>
      <div class="cat-track"><div class="cat-fill" style="width:${w}%"></div></div>
    </div>`;
  }).join('');
  attachTips(el);
}

function renderTrendChart() {
  // 6 months ending at selMonth
  const months = [];
  for (let i = 5; i >= 0; i--) { const d = new Date(selMonth.getFullYear(), selMonth.getMonth() - i, 1); months.push(d); }
  const data = months.map((d) => { const { income, expense } = monthTotals(d); return { d, income, expense }; });
  const max = Math.max(1, ...data.flatMap((x) => [x.income, x.expense]));

  const W = 620, H = 210, padL = 6, padR = 6, padB = 26, padT = 8;
  const plotW = W - padL - padR, plotH = H - padT - padB, base = padT + plotH;
  const groupW = plotW / 6, barW = Math.min(26, (groupW - 10) / 2), gap = 4;

  const gridVals = [0.25, 0.5, 0.75, 1];
  let svg = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Income vs expenses by month">`;
  for (const gv of gridVals) { const y = base - gv * plotH; svg += `<line class="grid" x1="${padL}" y1="${y.toFixed(1)}" x2="${W - padR}" y2="${y.toFixed(1)}"/>`; }
  svg += `<line class="grid" x1="${padL}" y1="${base}" x2="${W - padR}" y2="${base}"/>`;

  data.forEach((x, i) => {
    const cx = padL + groupW * i + groupW / 2;
    const hInc = (x.income / max) * plotH, hExp = (x.expense / max) * plotH;
    const xInc = cx - barW - gap / 2, xExp = cx + gap / 2;
    const tipI = `${monthShort(x.d)} ${x.d.getFullYear()} · Income <b>${esc(fmt(x.income))}</b>`;
    const tipE = `${monthShort(x.d)} ${x.d.getFullYear()} · Expenses <b>${esc(fmt(x.expense))}</b>`;
    if (x.income > 0) svg += `<rect class="bar bar-inc" data-tip="${tipI}" x="${xInc.toFixed(1)}" y="${(base - hInc).toFixed(1)}" width="${barW}" height="${Math.max(1, hInc).toFixed(1)}" rx="3"/>`;
    if (x.expense > 0) svg += `<rect class="bar bar-exp" data-tip="${tipE}" x="${xExp.toFixed(1)}" y="${(base - hExp).toFixed(1)}" width="${barW}" height="${Math.max(1, hExp).toFixed(1)}" rx="3"/>`;
    svg += `<text class="axis-label" x="${cx}" y="${H - 8}" text-anchor="middle">${monthShort(x.d)}</text>`;
  });
  svg += `</svg>`;
  const el = $('trendChart'); el.innerHTML = svg; attachTips(el);
}

function budgetStatus(spent, limit) {
  const ratio = limit > 0 ? spent / limit : 0;
  if (ratio > 1) return 'over';
  if (ratio >= 0.8) return 'warn';
  return 'ok';
}

function renderBudgetSnapshot() {
  const spend = spentByCategory(selMonth);
  const rows = budgets.map((b) => ({ ...b, spent: spend[b.category] || 0 }))
    .sort((a, b) => (b.spent / (b.limit || 1)) - (a.spent / (a.limit || 1))).slice(0, 3);
  $('budgetEmpty').style.display = budgets.length ? 'none' : 'block';
  $('budgetSnapshot').innerHTML = rows.map((b) => {
    const st = budgetStatus(b.spent, b.limit); const pct = Math.min(100, Math.round((b.spent / b.limit) * 100));
    return `<div class="bg-row">
      <div class="bg-top"><span class="bg-cat"><span class="cat-emoji">${CAT_ICON[b.category] || '📦'}</span>${esc(b.category)}</span>
        <span class="bg-nums">${esc(fmt(b.spent))} / ${esc(fmt(b.limit))}</span></div>
      <div class="bg-track"><div class="bg-fill ${st}" style="width:${pct}%"></div></div>
    </div>`;
  }).join('');
}

function renderRecent() {
  const items = [...transactions].sort(byDateDesc).slice(0, 5);
  $('recentEmpty').style.display = items.length ? 'none' : 'block';
  const el = $('recentList'); el.innerHTML = '';
  items.forEach((t) => el.appendChild(txItem(t, false)));
}

// ---- Transactions view ----
function byDateDesc(a, b) {
  if (a.date !== b.date) return a.date < b.date ? 1 : -1;
  return (b.createdAtMs || 0) - (a.createdAtMs || 0);
}
function populateFilters() {
  const cats = [...new Set([...CATS.income, ...CATS.expense])];
  const fc = $('fCategory'); const cur = fc.value;
  fc.innerHTML = `<option value="all">All categories</option>` + cats.map((c) => `<option>${esc(c)}</option>`).join('');
  fc.value = cur && [...fc.options].some((o) => o.value === cur) ? cur : 'all';
  const fa = $('fAccount'); const curA = fa.value;
  fa.innerHTML = `<option value="all">All accounts</option>` + accountsForDisplay().map((a) => `<option value="${esc(a.id)}">${esc(a.name)}</option>`).join('');
  fa.value = curA && [...fa.options].some((o) => o.value === curA) ? curA : 'all';
}
function renderTransactions() {
  populateFilters();
  const q = ($('search').value || '').toLowerCase().trim();
  const ft = $('fType').value, fcat = $('fCategory').value, facc = $('fAccount').value, fm = $('fMonth').value;
  const items = transactions.filter((t) => {
    if (ft !== 'all' && t.type !== ft) return false;
    if (fcat !== 'all' && t.category !== fcat) return false;
    if (facc !== 'all' && accountOf(t) !== facc) return false;
    if (fm === 'current' && !inMonth(t, selMonth)) return false;
    if (q && !(t.desc || '').toLowerCase().includes(q)) return false;
    return true;
  }).sort(byDateDesc);
  $('txEmpty').style.display = items.length ? 'none' : 'block';
  const el = $('txList'); el.innerHTML = '';
  items.forEach((t) => el.appendChild(txItem(t, true)));
}

function txItem(t, withActions) {
  const li = document.createElement('li');
  li.className = 'tx-item';
  const acc = accountById(accountOf(t));
  const accName = acc ? acc.name : 'Unknown';
  li.innerHTML =
    `<div class="tx-icon ${t.type}">${CAT_ICON[t.category] || '📦'}</div>` +
    `<div class="tx-info"><div class="tx-desc">${esc(t.desc)}</div>` +
    `<div class="tx-meta">${esc(t.category)} · ${esc(accName)} · ${formatDate(t.date)}</div></div>` +
    `<div class="tx-amount ${t.type}">${t.type === 'income' ? '+' : '−'}${esc(fmt(t.amount))}</div>` +
    (withActions ? `<div class="tx-row-actions">
        <button class="tx-mini edit" title="Edit" aria-label="Edit">✎</button>
        <button class="tx-mini del" title="Delete" aria-label="Delete">🗑</button></div>` : '');
  if (withActions) {
    li.querySelector('.edit').addEventListener('click', () => openTxModal(t));
    li.querySelector('.del').addEventListener('click', async () => {
      if (confirm(`Delete "${t.desc}"?`)) { try { await deleteTx(t.id); } catch (e) { showBanner('Delete failed — ' + (e.message || e), 'error'); } }
    });
  }
  return li;
}

// ---- Budgets view ----
function renderBudgets() {
  $('budgetMonthLabel').textContent = monthName(selMonth);
  const spend = spentByCategory(selMonth);
  const totalBudget = budgets.reduce((s, b) => s + b.limit, 0);
  const totalSpent = budgets.reduce((s, b) => s + (spend[b.category] || 0), 0);
  $('budgetSummary').innerHTML =
    `<div class="bs"><span class="bs-label">Budgeted</span><span class="bs-val money">${esc(fmt(totalBudget))}</span></div>` +
    `<div class="bs"><span class="bs-label">Spent</span><span class="bs-val money neg">${esc(fmt(totalSpent))}</span></div>` +
    `<div class="bs"><span class="bs-label">Remaining</span><span class="bs-val money ${totalBudget - totalSpent >= 0 ? 'pos' : 'neg'}">${esc(fmt(totalBudget - totalSpent))}</span></div>`;

  const el = $('budgetList'); el.innerHTML = '';
  CATS.expense.forEach((cat) => {
    const b = budgets.find((x) => x.category === cat);
    const limit = b ? b.limit : 0;
    const spent = spend[cat] || 0;
    const st = budgetStatus(spent, limit);
    const pct = limit > 0 ? Math.min(100, Math.round((spent / limit) * 100)) : 0;
    const remaining = limit - spent;
    const card = document.createElement('div');
    card.className = 'budget-card';
    card.innerHTML =
      `<div class="bg-top"><span class="bg-cat"><span class="cat-emoji">${CAT_ICON[cat]}</span>${esc(cat)}</span>
        <div class="bg-limit"><span class="card-sub">Limit</span><input class="input" type="number" min="0" step="10" placeholder="0" value="${limit || ''}" inputmode="decimal"></div></div>` +
      (limit > 0 ? `<div class="bg-track"><div class="bg-fill ${st}" style="width:${pct}%"></div></div>
        <div class="bg-top"><span class="bg-status ${st}">${st === 'over' ? '⚠ Over by ' + fmt(-remaining) : st === 'warn' ? '● ' + fmt(remaining) + ' left' : '✓ ' + fmt(remaining) + ' left'}</span>
        <span class="bg-nums">${esc(fmt(spent))} spent</span></div>`
        : `<div class="bg-nums">${spent > 0 ? esc(fmt(spent)) + ' spent — set a limit to track it' : 'No spending yet'}</div>`);
    const input = card.querySelector('input');
    input.addEventListener('change', async () => {
      const v = parseFloat(input.value) || 0;
      try { await setBudget(cat, v); } catch (e) { showBanner('Could not save budget — ' + (e.message || e), 'error'); }
    });
    el.appendChild(card);
  });
}

// ---- Accounts view ----
function renderAccounts() {
  $('accountTotal').innerHTML = `<span class="at-label">Total balance</span><span class="at-val money">${esc(fmt(totalBalance()))}</span>`;
  const el = $('accountList'); el.innerHTML = '';
  accountsForDisplay().forEach((a) => {
    const card = document.createElement('div');
    card.className = 'account-card';
    card.innerHTML =
      `<div class="ac-top"><span class="ac-dot" style="background:${esc(a.color || '#1f6feb')}">${ACCOUNT_ICON[a.type] || '💵'}</span>
        <div><div class="ac-name">${esc(a.name)}</div><div class="ac-type">${esc(a.type)}</div></div></div>` +
      `<div class="ac-bal money">${esc(fmt(accountBalance(a.id)))}</div>` +
      (a.virtual ? `<div class="ac-type">Default wallet · add one to customize</div>`
        : `<div class="ac-actions"><button class="btn edit" style="padding:6px 12px">Edit</button>
           <button class="btn danger del" style="padding:6px 12px">Delete</button></div>`);
    if (!a.virtual) {
      card.querySelector('.edit').addEventListener('click', () => openAccountModal(a));
      card.querySelector('.del').addEventListener('click', async () => {
        const n = transactions.filter((t) => accountOf(t) === a.id).length;
        const msg = n ? `Delete "${a.name}"? Its ${n} transaction${n > 1 ? 's' : ''} will remain but become unassigned.` : `Delete "${a.name}"?`;
        if (confirm(msg)) { try { await deleteAccount(a.id); } catch (e) { showBanner('Delete failed — ' + (e.message || e), 'error'); } }
      });
    }
    el.appendChild(card);
  });
}

// ══════════════════════════════ Modals ═════════════════════════════════════
function openModal(node) {
  const bd = document.createElement('div'); bd.className = 'modal-backdrop';
  bd.appendChild(node); $('modalRoot').innerHTML = ''; $('modalRoot').appendChild(bd);
  bd.addEventListener('click', (e) => { if (e.target === bd) closeModal(); });
  document.addEventListener('keydown', escClose);
  const f = node.querySelector('input, select'); if (f) f.focus();
}
function closeModal() { $('modalRoot').innerHTML = ''; document.removeEventListener('keydown', escClose); }
function escClose(e) { if (e.key === 'Escape') closeModal(); }

function openTxModal(existing) {
  const editing = !!existing;
  const t = existing || { type: 'expense', category: 'Food', amount: '', desc: '', date: today(), accountId: accountsForDisplay()[0].id };
  const node = document.createElement('div'); node.className = 'modal';
  node.innerHTML = `
    <h2>${editing ? 'Edit' : 'Add'} transaction</h2>
    <p class="modal-sub">${editing ? 'Update the details below.' : 'Log where your money went (or came from).'}</p>
    <form class="form" id="txModalForm">
      <div class="toggle">
        <input type="radio" name="mtype" id="mExpense" value="expense" ${t.type === 'expense' ? 'checked' : ''}/>
        <label for="mExpense" class="toggle-btn">Expense</label>
        <input type="radio" name="mtype" id="mIncome" value="income" ${t.type === 'income' ? 'checked' : ''}/>
        <label for="mIncome" class="toggle-btn">Income</label>
      </div>
      <label class="field"><span>Description</span><input id="mDesc" type="text" maxlength="60" placeholder="e.g. Groceries" value="${esc(t.desc)}"/></label>
      <div class="field-row">
        <label class="field"><span>Amount</span><input id="mAmount" type="number" min="0.01" step="0.01" inputmode="decimal" placeholder="0.00" value="${t.amount || ''}" required/></label>
        <label class="field"><span>Category</span><select id="mCategory"></select></label>
      </div>
      <div class="field-row">
        <label class="field"><span>Account</span><select id="mAccount"></select></label>
        <label class="field"><span>Date</span><input id="mDate" type="date" value="${esc(t.date)}" required/></label>
      </div>
      <div class="modal-actions">
        <button type="button" class="btn" id="mCancel">Cancel</button>
        <button type="submit" class="btn primary">${editing ? 'Save' : 'Add'}</button>
      </div>
    </form>`;
  openModal(node);

  const catSel = node.querySelector('#mCategory'), accSel = node.querySelector('#mAccount');
  const fillCats = () => {
    const type = node.querySelector('input[name=mtype]:checked').value;
    catSel.innerHTML = CATS[type].map((c) => `<option ${c === t.category ? 'selected' : ''}>${esc(c)}</option>`).join('');
  };
  fillCats();
  accSel.innerHTML = accountsForDisplay().map((a) => `<option value="${esc(a.id)}" ${a.id === accountOf(t) ? 'selected' : ''}>${esc(a.name)}</option>`).join('');
  node.querySelectorAll('input[name=mtype]').forEach((r) => r.addEventListener('change', fillCats));
  node.querySelector('#mCancel').addEventListener('click', closeModal);

  node.querySelector('#txModalForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const amount = parseFloat(node.querySelector('#mAmount').value);
    if (!(amount > 0)) return;
    const data = {
      type: node.querySelector('input[name=mtype]:checked').value,
      desc: node.querySelector('#mDesc').value.trim() || 'Untitled',
      amount, category: catSel.value, accountId: accSel.value, date: node.querySelector('#mDate').value,
    };
    const btn = node.querySelector('button[type=submit]'); btn.disabled = true;
    try { editing ? await updateTx(t.id, data) : await addTx(data); closeModal(); }
    catch (err) { btn.disabled = false; showBanner('Could not save — ' + (err.message || err), 'error'); }
  });
}

function openAccountModal(existing) {
  const editing = !!existing;
  const a = existing || { name: '', type: 'Cash', initialBalance: '', color: ACCOUNT_COLORS[accounts.length % ACCOUNT_COLORS.length] };
  const node = document.createElement('div'); node.className = 'modal';
  node.innerHTML = `
    <h2>${editing ? 'Edit' : 'Add'} account</h2>
    <p class="modal-sub">A wallet, card, or bank account to track separately.</p>
    <form class="form" id="accForm">
      <label class="field"><span>Name</span><input id="aName" type="text" maxlength="30" placeholder="e.g. Debit card" value="${esc(a.name)}" required/></label>
      <div class="field-row">
        <label class="field"><span>Type</span><select id="aType">${ACCOUNT_TYPES.map((tp) => `<option ${tp === a.type ? 'selected' : ''}>${tp}</option>`).join('')}</select></label>
        <label class="field"><span>Starting balance</span><input id="aBal" type="number" step="0.01" inputmode="decimal" placeholder="0.00" value="${a.initialBalance || ''}"/></label>
      </div>
      <label class="field"><span>Color</span><div id="aColors" style="display:flex;gap:8px;flex-wrap:wrap">${ACCOUNT_COLORS.map((c) => `<button type="button" class="color-dot" data-c="${c}" style="width:30px;height:30px;border-radius:8px;border:2px solid ${c === a.color ? 'var(--ink)' : 'transparent'};background:${c};cursor:pointer"></button>`).join('')}</div></label>
      <div class="modal-actions"><button type="button" class="btn" id="aCancel">Cancel</button><button type="submit" class="btn primary">${editing ? 'Save' : 'Add'}</button></div>
    </form>`;
  openModal(node);
  let color = a.color;
  node.querySelectorAll('.color-dot').forEach((d) => d.addEventListener('click', () => {
    color = d.dataset.c; node.querySelectorAll('.color-dot').forEach((x) => x.style.borderColor = 'transparent'); d.style.borderColor = 'var(--ink)';
  }));
  node.querySelector('#aCancel').addEventListener('click', closeModal);
  node.querySelector('#accForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const acc = { id: editing ? a.id : uid(), name: node.querySelector('#aName').value.trim() || 'Account', type: node.querySelector('#aType').value, initialBalance: parseFloat(node.querySelector('#aBal').value) || 0, color };
    const btn = node.querySelector('button[type=submit]'); btn.disabled = true;
    try { await saveAccount(acc); closeModal(); } catch (err) { btn.disabled = false; showBanner('Could not save account — ' + (err.message || err), 'error'); }
  });
}

// ══════════════════════════════ Tooltip ════════════════════════════════════
const tip = $('tooltip');
function attachTips(container) {
  container.querySelectorAll('[data-tip]').forEach((el) => {
    el.addEventListener('mouseenter', (e) => { tip.innerHTML = el.getAttribute('data-tip'); tip.hidden = false; moveTip(e); });
    el.addEventListener('mousemove', moveTip);
    el.addEventListener('mouseleave', () => { tip.hidden = true; });
  });
}
function moveTip(e) { tip.style.left = e.clientX + 'px'; tip.style.top = e.clientY + 'px'; }

// ══════════════════════════════ Navigation ═════════════════════════════════
function switchView(name) {
  currentView = name;
  ['dashboard', 'transactions', 'budgets', 'accounts'].forEach((v) => { $('view-' + v).hidden = v !== name; });
  document.querySelectorAll('[data-view]').forEach((b) => b.classList.toggle('is-active', b.dataset.view === name));
  window.scrollTo(0, 0);
}
function buildTabbar() {
  const bar = $('tabbar');
  document.querySelectorAll('#nav .nav-item').forEach((btn) => {
    const t = document.createElement('button'); t.className = 'tab-item'; t.dataset.view = btn.dataset.view; t.innerHTML = btn.innerHTML;
    t.classList.toggle('is-active', btn.dataset.view === currentView); bar.appendChild(t);
  });
}

// ══════════════════════════════ Banner / theme ═════════════════════════════
function showBanner(html, kind = 'info') { const b = $('syncBanner'); b.className = 'sync-banner ' + kind; b.innerHTML = html; b.hidden = false; }
function hideBanner() { $('syncBanner').hidden = true; }

function renderAccountChip() {
  const el = $('account');
  if (mode === 'cloud' && user) {
    el.innerHTML = `<div class="acct-row"><span class="sync-dot"></span><span class="acct-email">${esc(user.email || 'Signed in')}</span></div><button id="signOutBtn" class="chip-btn">Sign out</button>`;
    el.querySelector('#signOutBtn').addEventListener('click', doSignOut);
  } else if (isFirebaseConfigured()) {
    el.innerHTML = `<button id="signInBtn" class="chip-btn primary">Sign in to sync</button><span class="acct-email">Data saved on this device</span>`;
    el.querySelector('#signInBtn').addEventListener('click', doSignIn);
  } else {
    el.innerHTML = `<span class="acct-email">Saved on this device</span>`;
  }
}

function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  $('themeToggle').textContent = theme === 'dark' ? '☀️' : '🌙';
  try { localStorage.setItem(LS.theme, theme); } catch {}
}

// ══════════════════════════════ Firebase ═══════════════════════════════════
async function setupCloud() {
  const base = `https://www.gstatic.com/firebasejs/${FIREBASE_SDK_VERSION}`;
  const [appMod, authMod, fsMod] = await Promise.all([
    import(`${base}/firebase-app.js`), import(`${base}/firebase-auth.js`), import(`${base}/firebase-firestore.js`),
  ]);
  const app = appMod.initializeApp(firebaseConfig);
  let db;
  try { db = fsMod.initializeFirestore(app, { localCache: fsMod.persistentLocalCache({ tabManager: fsMod.persistentMultipleTabManager() }) }); }
  catch { db = fsMod.getFirestore(app); }
  const auth = authMod.getAuth(app);
  fb = {
    auth, db,
    GoogleAuthProvider: authMod.GoogleAuthProvider, signInWithPopup: authMod.signInWithPopup,
    signInWithRedirect: authMod.signInWithRedirect, signOut: authMod.signOut,
    collection: fsMod.collection, addDoc: fsMod.addDoc, setDoc: fsMod.setDoc,
    updateDoc: fsMod.updateDoc, deleteDoc: fsMod.deleteDoc, doc: fsMod.doc,
    onSnapshot: fsMod.onSnapshot, query: fsMod.query, serverTimestamp: fsMod.serverTimestamp,
  };
  try { await authMod.getRedirectResult(auth); } catch {}

  authMod.onAuthStateChanged(auth, (u) => {
    user = u || null;
    Object.keys(unsub).forEach((k) => { if (unsub[k]) { unsub[k](); unsub[k] = null; } });
    if (user) { mode = 'cloud'; hideBanner(); subscribeAll(); maybeOfferMigration(); }
    else { mode = 'local'; loadLocal(); renderAll(); }
    renderAccountChip();
  });
}

function subscribeAll() {
  const col = (name) => fb.query(fb.collection(fb.db, 'users', user.uid, name));
  unsub.accounts = fb.onSnapshot(col('accounts'), (s) => {
    accounts = s.docs.map((d) => ({ id: d.id, ...d.data() })); renderAll();
  }, (e) => showBanner('Sync error — ' + (e.message || e), 'error'));
  unsub.budgets = fb.onSnapshot(col('budgets'), (s) => {
    budgets = s.docs.map((d) => ({ id: d.id, ...d.data() })); renderAll();
  }, (e) => showBanner('Sync error — ' + (e.message || e), 'error'));
  unsub.transactions = fb.onSnapshot(col('transactions'), (s) => {
    transactions = s.docs.map((d) => { const x = d.data(); return { id: d.id, type: x.type, desc: x.desc, amount: x.amount, category: x.category, date: x.date, accountId: x.accountId, createdAtMs: x.createdAt && x.createdAt.toMillis ? x.createdAt.toMillis() : 0 }; }); renderAll();
  }, (e) => showBanner('Sync error — ' + (e.message || e), 'error'));
}

async function doSignIn() {
  try { await fb.signInWithPopup(fb.auth, new fb.GoogleAuthProvider()); }
  catch (err) {
    if (['auth/popup-blocked', 'auth/cancelled-popup-request', 'auth/operation-not-supported-in-this-environment'].includes(err?.code)) {
      try { await fb.signInWithRedirect(fb.auth, new fb.GoogleAuthProvider()); return; } catch (e2) { err = e2; }
    }
    showBanner('Sign-in failed — ' + (err.message || err), 'error');
  }
}
async function doSignOut() { try { await fb.signOut(fb.auth); } catch (e) { showBanner('Sign-out failed — ' + (e.message || e), 'error'); } }

function hasLocalData() {
  try {
    return (JSON.parse(localStorage.getItem(LS.transactions)) || []).length > 0 ||
      (JSON.parse(localStorage.getItem(LS.accounts)) || []).length > 0 ||
      (JSON.parse(localStorage.getItem(LS.budgets)) || []).length > 0;
  } catch { return false; }
}
function maybeOfferMigration() {
  if (!hasLocalData()) return;
  const n = (JSON.parse(localStorage.getItem(LS.transactions) || '[]') || []).length;
  showBanner(`Found data saved on this device${n ? ` (${n} transaction${n > 1 ? 's' : ''})` : ''}. ` +
    `<button id="migY" class="chip-btn primary">Add to my account</button> <button id="migN" class="chip-btn">Keep separate</button>`, 'info');
  $('migY').addEventListener('click', async () => {
    hideBanner();
    try {
      const la = JSON.parse(localStorage.getItem(LS.accounts) || '[]') || [];
      const lb = JSON.parse(localStorage.getItem(LS.budgets) || '[]') || [];
      const lt = JSON.parse(localStorage.getItem(LS.transactions) || '[]') || [];
      for (const a of la) await fb.setDoc(fb.doc(fb.db, 'users', user.uid, 'accounts', a.id), { name: a.name, type: a.type, initialBalance: a.initialBalance || 0, color: a.color || '#1f6feb' });
      for (const b of lb) await fb.setDoc(fb.doc(fb.db, 'users', user.uid, 'budgets', b.category), { category: b.category, limit: b.limit });
      for (const t of lt) await fb.setDoc(fb.doc(fb.db, 'users', user.uid, 'transactions', t.id), { type: t.type, desc: t.desc, amount: t.amount, category: t.category, date: t.date, accountId: t.accountId || 'cash', createdAt: fb.serverTimestamp() });
      localStorage.removeItem(LS.transactions); localStorage.removeItem(LS.accounts); localStorage.removeItem(LS.budgets);
      showBanner('Added to your account and syncing now. ✓', 'success'); setTimeout(hideBanner, 4000);
    } catch (err) { showBanner('Could not upload local data — ' + (err.message || err), 'error'); }
  });
  $('migN').addEventListener('click', hideBanner);
}

// ══════════════════════════════ Init ═══════════════════════════════════════
(function init() {
  let savedTheme = null; try { savedTheme = localStorage.getItem(LS.theme); } catch {}
  applyTheme(savedTheme || (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'));

  buildTabbar();

  // Navigation (sidebar + tab bar + in-card "goto" buttons)
  document.addEventListener('click', (e) => {
    const nav = e.target.closest('[data-view]'); if (nav) { switchView(nav.dataset.view); return; }
    const go = e.target.closest('[data-goto]'); if (go) switchView(go.dataset.goto);
  });

  // Month picker
  $('monthPrev').addEventListener('click', () => { selMonth = new Date(selMonth.getFullYear(), selMonth.getMonth() - 1, 1); renderAll(); });
  $('monthNext').addEventListener('click', () => { selMonth = new Date(selMonth.getFullYear(), selMonth.getMonth() + 1, 1); renderAll(); });

  // Theme
  $('themeToggle').addEventListener('click', () => applyTheme(document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark'));

  // Add buttons
  $('addTxBtn').addEventListener('click', () => openTxModal(null));
  $('addAccountBtn').addEventListener('click', () => openAccountModal(null));

  // Filters
  ['search', 'fType', 'fCategory', 'fAccount', 'fMonth'].forEach((id) => {
    const el = $(id); el.addEventListener(id === 'search' ? 'input' : 'change', renderTransactions);
  });

  // Local data shows immediately; cloud takes over on sign-in.
  loadLocal();
  renderAll();

  if (isFirebaseConfigured()) setupCloud().catch((err) => showBanner('Cloud sync unavailable — running locally. ' + (err.message || ''), 'error'));

  if ('serviceWorker' in navigator) window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
})();
