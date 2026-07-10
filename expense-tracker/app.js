// ---- Money Tracker ----
// Lightweight expense tracker. State persists in localStorage.

const STORAGE_KEY = 'levelup.transactions';
const THEME_KEY = 'levelup.theme';

const CATEGORY_ICONS = {
  Food: '🍔', Transport: '🚗', Housing: '🏠', Shopping: '🛍️',
  Bills: '💡', Health: '🏥', Entertainment: '🎬', Salary: '💰', Other: '📦',
};

/** @type {{id:string,type:'income'|'expense',desc:string,amount:number,category:string,date:string}[]} */
let transactions = load();
let currentFilter = 'all';

// ---- Elements ----
const $ = (id) => document.getElementById(id);
const form = $('txForm');
const txList = $('txList');

// ---- Persistence ----
function load() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
  } catch {
    return [];
  }
}
function save() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(transactions));
}

// ---- Formatting ----
const fmt = (n) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n);

function formatDate(iso) {
  const d = new Date(iso + 'T00:00:00');
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

// ---- Rendering ----
function render() {
  renderSummary();
  renderList();
  renderBreakdown();
}

function renderSummary() {
  const income = transactions
    .filter((t) => t.type === 'income')
    .reduce((s, t) => s + t.amount, 0);
  const expense = transactions
    .filter((t) => t.type === 'expense')
    .reduce((s, t) => s + t.amount, 0);

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
    li.innerHTML = `
      <div class="tx-icon ${t.type}">${CATEGORY_ICONS[t.category] || '📦'}</div>
      <div class="tx-info">
        <div class="tx-desc"></div>
        <div class="tx-meta">${t.category} · ${formatDate(t.date)}</div>
      </div>
      <div class="tx-amount ${t.type}">${t.type === 'income' ? '+' : '−'}${fmt(t.amount)}</div>
      <button class="tx-del" title="Delete" aria-label="Delete">×</button>`;
    // Set description via textContent to avoid HTML injection
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
    row.innerHTML = `
      <div class="bd-top">
        <span class="bd-cat">${CATEGORY_ICONS[cat] || '📦'} ${cat}</span>
        <span class="bd-amt">${fmt(amt)} · ${pct.toFixed(0)}%</span>
      </div>
      <div class="bd-bar"><div class="bd-fill" style="width:${pct}%"></div></div>`;
    container.appendChild(row);
  }
}

// ---- Actions ----
function add(tx) {
  transactions.push(tx);
  save();
  render();
}
function remove(id) {
  transactions = transactions.filter((t) => t.id !== id);
  save();
  render();
}

// ---- Events ----
form.addEventListener('submit', (e) => {
  e.preventDefault();
  const amount = parseFloat($('amount').value);
  if (!(amount > 0)) return;

  add({
    id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
    type: form.type.value,
    desc: $('desc').value.trim() || 'Untitled',
    amount,
    category: $('category').value,
    date: $('date').value,
  });

  form.reset();
  $('typeExpense').checked = true;
  $('date').value = today();
  $('desc').focus();
});

$('filter').addEventListener('change', (e) => {
  currentFilter = e.target.value;
  renderList();
});

$('clearAll').addEventListener('click', () => {
  if (!transactions.length) return;
  if (confirm('Delete ALL transactions? This cannot be undone.')) {
    transactions = [];
    save();
    render();
  }
});

// ---- Theme ----
const themeToggle = $('themeToggle');
function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  themeToggle.textContent = theme === 'dark' ? '☀️' : '🌙';
  localStorage.setItem(THEME_KEY, theme);
}
themeToggle.addEventListener('click', () => {
  const cur = document.documentElement.getAttribute('data-theme');
  applyTheme(cur === 'dark' ? 'light' : 'dark');
});

// ---- Init ----
function today() {
  return new Date().toISOString().slice(0, 10);
}
applyTheme(
  localStorage.getItem(THEME_KEY) ||
    (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
);
$('date').value = today();
render();
