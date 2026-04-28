/* ═══════════════════════════════════════════════════
   NEXWEALTH — SCRIPT.JS
   Auth · Financial Engine · Dashboard
═══════════════════════════════════════════════════ */

'use strict';

/* ─── DATA ──────────────────────────────────────── */
const STOCKS = [
  { sym: 'NVDA', name: 'NVIDIA Corporation',    price: 118.50, sector: 'Tecnología' },
  { sym: 'AAPL', name: 'Apple Inc.',             price: 211.30, sector: 'Tecnología' },
  { sym: 'MSFT', name: 'Microsoft Corporation',  price: 390.00, sector: 'Tecnología' },
  { sym: 'AMZN', name: 'Amazon.com Inc.',        price: 186.50, sector: 'E-Commerce'  },
  { sym: 'GOOGL',name: 'Alphabet Inc.',          price: 158.20, sector: 'Tecnología' },
  { sym: 'TSLA', name: 'Tesla Inc.',             price: 275.00, sector: 'Automotriz' },
  { sym: 'JPM',  name: 'JPMorgan Chase',         price: 240.00, sector: 'Financiero' },
  { sym: 'KO',   name: 'Coca-Cola Company',      price: 63.50,  sector: 'Consumo'    },
  { sym: 'F',    name: 'Ford Motor Company',     price: 10.80,  sector: 'Automotriz' },
  { sym: 'DIS',  name: 'Walt Disney Company',    price: 99.30,  sector: 'Entretenimiento' },
  { sym: 'INTC', name: 'Intel Corporation',      price: 21.00,  sector: 'Tecnología' },
  { sym: 'T',    name: 'AT&T Inc.',              price: 18.50,  sector: 'Telecom'    },
];

const ETF_FALLBACK = [
  { sym: 'ITOT', name: 'iShares Total Market ETF', price: 105.00, sector: 'ETF Diversificado' },
  { sym: 'VOO',  name: 'Vanguard S&P 500 ETF',     price: 512.00, sector: 'ETF S&P 500' },
  { sym: 'SCHB', name: 'Schwab Total Market ETF',   price: 23.50,  sector: 'ETF Diversificado' },
];

const BANKS = [
  { name: 'Marcus by Goldman Sachs', apy: 4.50, desc: 'Sin comisión de mantenimiento' },
  { name: 'Ally Bank',               apy: 4.20, desc: 'Sin mínimo requerido'          },
  { name: 'SoFi Checking & Savings', apy: 4.00, desc: 'Bonos por nómina directa'      },
];

const CHART_COLORS = ['#3b82f6','#10b981','#f59e0b','#8b5cf6'];

/* ─── HELPERS ───────────────────────────────────── */
const $  = id => document.getElementById(id);
const fmt = n  => n.toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 });

function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  $(id).classList.add('active');
  window.scrollTo(0, 0);
}

/* ─── AUTH ──────────────────────────────────────── */
let currentUser = null;

function getUsers()  { return JSON.parse(localStorage.getItem('nw_users') || '{}'); }
function saveUsers(u){ localStorage.setItem('nw_users', JSON.stringify(u)); }
function getSession(){ return localStorage.getItem('nw_session'); }
function setSession(e){ localStorage.setItem('nw_session', e); }
function clearSession(){ localStorage.removeItem('nw_session'); }

function initAuth() {
  // Tab switching
  document.querySelectorAll('.auth-tab').forEach(tab => {
    tab.addEventListener('click', () => switchTab(tab.dataset.tab));
  });
  document.querySelectorAll('[data-switch]').forEach(a => {
    a.addEventListener('click', e => { e.preventDefault(); switchTab(a.dataset.switch); });
  });

  $('btn-login').addEventListener('click', handleLogin);
  $('btn-register').addEventListener('click', handleRegister);

  // Enter key support
  ['login-email','login-pass'].forEach(id => {
    $(id).addEventListener('keydown', e => { if(e.key === 'Enter') handleLogin(); });
  });
  ['reg-name','reg-email','reg-pass'].forEach(id => {
    $(id).addEventListener('keydown', e => { if(e.key === 'Enter') handleRegister(); });
  });

  // Check existing session
  const email = getSession();
  if (email) {
    const users = getUsers();
    if (users[email]) { loginSuccess(users[email]); return; }
  }
  showScreen('screen-auth');
}

function switchTab(tab) {
  document.querySelectorAll('.auth-tab').forEach(t => t.classList.toggle('active', t.dataset.tab === tab));
  document.querySelectorAll('.auth-form').forEach(f => f.classList.toggle('active', f.id === `form-${tab}`));
}

function showError(id, msg) {
  const el = $(id); el.textContent = msg; el.classList.remove('hidden');
}
function hideError(id) { $(id).classList.add('hidden'); }

function handleLogin() {
  hideError('login-error');
  const email = $('login-email').value.trim().toLowerCase();
  const pass  = $('login-pass').value;
  if (!email || !pass) { showError('login-error', 'Por favor completa todos los campos.'); return; }
  const users = getUsers();
  if (!users[email] || users[email].pass !== btoa(pass)) {
    showError('login-error', 'Correo o contraseña incorrectos.'); return;
  }
  setSession(email);
  loginSuccess(users[email]);
}

function handleRegister() {
  hideError('reg-error');
  const name  = $('reg-name').value.trim();
  const email = $('reg-email').value.trim().toLowerCase();
  const pass  = $('reg-pass').value;
  if (!name || !email || !pass) { showError('reg-error', 'Por favor completa todos los campos.'); return; }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { showError('reg-error', 'Ingresa un correo válido.'); return; }
  if (pass.length < 6) { showError('reg-error', 'La contraseña debe tener al menos 6 caracteres.'); return; }
  const users = getUsers();
  if (users[email]) { showError('reg-error', 'Este correo ya está registrado.'); return; }
  users[email] = { name, email, pass: btoa(pass) };
  saveUsers(users);
  setSession(email);
  loginSuccess(users[email]);
}

function loginSuccess(user) {
  currentUser = user;
  $('nav-user').textContent = `👤 ${user.name.split(' ')[0]}`;
  initInvestScreen();
  showScreen('screen-invest');
}

function logout() {
  clearSession(); currentUser = null;
  $('invest-amount').value = '';
  showScreen('screen-auth');
}

/* ─── INVEST SCREEN ─────────────────────────────── */
function initInvestScreen() {
  buildTicker();
  $('btn-calculate').addEventListener('click', handleCalculate);
  $('btn-logout').addEventListener('click', logout);
  $('btn-logout-2').addEventListener('click', logout);
  $('btn-recalculate').addEventListener('click', () => showScreen('screen-invest'));

  document.querySelectorAll('.quick-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      $('invest-amount').value = btn.dataset.amount;
      document.querySelectorAll('.quick-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
    });
  });
}

function buildTicker() {
  const track = $('ticker-track');
  const items = [...STOCKS].map(s => {
    const chg = ((Math.random() - 0.48) * 3).toFixed(2);
    const dir = parseFloat(chg) >= 0 ? 'up' : 'down';
    const arrow = dir === 'up' ? '▲' : '▼';
    return `<span class="ticker-item">
      <span class="ticker-sym">${s.sym}</span>
      <span class="ticker-price">${fmt(s.price)}</span>
      <span class="ticker-chg ${dir}">${arrow} ${Math.abs(chg)}%</span>
      <span class="ticker-sep">·</span>
    </span>`;
  }).join('');
  // Duplicate for seamless loop
  track.innerHTML = items + items;
}

/* ─── FINANCIAL ENGINE ──────────────────────────── */
let donutChart = null;

function handleCalculate() {
  hideError('invest-error');
  const raw = parseFloat($('invest-amount').value);
  if (!raw || raw <= 0) { showError('invest-error', 'Por favor ingresa un monto válido.'); return; }

  const result = calculatePortfolio(raw);
  renderDashboard(result);
  showScreen('screen-dashboard');
}

function calculatePortfolio(total) {
  const equityBudget  = total * 0.60;
  const savingsBudget = total * 0.40;

  // Filter affordable stocks
  const affordable = STOCKS.filter(s => s.price <= total);

  let picks = [];
  let usedETF = false;

  if (affordable.length >= 1) {
    // Sort by descending price (higher price = more "premium") and pick top 3
    const sorted = [...affordable].sort((a, b) => b.price - a.price);
    picks = sorted.slice(0, 3);
  } else {
    // Capital very low — use cheapest ETFs the user can afford
    const cheapETFs = ETF_FALLBACK.filter(e => e.price <= total).sort((a,b) => a.price - b.price);
    if (cheapETFs.length === 0) {
      // Can't afford any single share — allocate all to savings
      picks = [];
    } else {
      picks = cheapETFs.slice(0, 3);
      usedETF = true;
    }
  }

  // Build equity allocation
  const equityAlloc = picks.map((stock, i) => {
    const weight = picks.length === 1 ? 1 : (i === 0 ? 0.50 : i === 1 ? 0.30 : 0.20);
    const allocated = equityBudget * weight;
    const shares = Math.floor(allocated / stock.price);
    const actualCost = shares * stock.price;
    return { ...stock, weight, allocated, shares, actualCost };
  });

  // Savings projections
  const bestBank = [...BANKS].sort((a,b) => b.apy - a.apy)[0];
  const projections = [1, 3, 5].map(yrs => ({
    years: yrs,
    value: savingsBudget * Math.pow(1 + bestBank.apy/100, yrs)
  }));

  // Tip generation
  let tip = generateTip(total, equityAlloc, usedETF, savingsBudget, bestBank);

  return { total, equityBudget, savingsBudget, equityAlloc, usedETF, projections, tip };
}

function generateTip(total, alloc, usedETF, savingsBudget, bestBank) {
  if (total < 100) return `Con un capital inicial pequeño como $${total.toFixed(0)}, el ahorro de alto rendimiento es tu mejor aliado. Considera incrementar aportaciones mensualmente para ampliar tus opciones de inversión en acciones.`;
  if (usedETF) return `Los ETFs de bajo costo son una excelente puerta de entrada al mercado con capital limitado. Ofrecen diversificación instantánea con un solo instrumento. A medida que acumules capital, podrás considerar acciones individuales.`;
  if (total > 50000) return `Con un portafolio de este tamaño, considera diversificar más allá de 3 acciones. Esta estrategia 60/40 es un punto de partida sólido, pero evalúa también bonos del tesoro y REITs para reducir la volatilidad.`;
  const topSym = alloc[0]?.sym || 'tu acción';
  return `Tu portafolio incluye ${topSym} como posición principal. Recuerda rebalancear trimestralmente y reinvertir los dividendos. El 40% en ahorro APY actúa como colchón de liquidez mientras tu cartera crece.`;
}

/* ─── DASHBOARD RENDER ──────────────────────────── */
function renderDashboard({ total, equityBudget, savingsBudget, equityAlloc, projections, tip }) {
  // Update nav user
  const navUsers = document.querySelectorAll('#nav-user');
  navUsers.forEach(el => el.textContent = `👤 ${currentUser.name.split(' ')[0]}`);

  // Header
  $('dash-total').textContent = fmt(total);
  $('equity-amount').textContent = fmt(equityBudget);
  $('savings-amount').textContent = fmt(savingsBudget);

  // Savings projections
  const projEl = $('savings-projection');
  projEl.innerHTML = projections.map(p => `
    <div class="proj-badge">
      <div class="proj-label">${p.years} año${p.years > 1 ? 's' : ''}</div>
      <div class="proj-val">${fmt(p.value)}</div>
    </div>
  `).join('');

  // Stock list
  const stocksEl = $('stocks-list');
  if (equityAlloc.length === 0) {
    stocksEl.innerHTML = `<p style="color:var(--slate-500);font-size:.85rem;">Capital insuficiente para adquirir acciones. Todo el portafolio está optimizado hacia ahorro.</p>`;
  } else {
    stocksEl.innerHTML = equityAlloc.map(s => `
      <div class="stock-item">
        <div class="stock-logo">${s.sym.slice(0,3)}</div>
        <div class="stock-info">
          <div class="stock-sym">${s.sym}</div>
          <div class="stock-name">${s.name}</div>
          <div class="stock-shares">${s.shares > 0 ? `≈ ${s.shares} acción${s.shares !== 1 ? 'es' : ''}` : 'Fracción disponible'}</div>
        </div>
        <div class="stock-right">
          <div class="stock-alloc">${fmt(s.allocated)}</div>
          <div class="stock-price">${fmt(s.price)} / acción</div>
        </div>
      </div>
    `).join('');
  }

  // Banks table
  const sortedBanks = [...BANKS].sort((a,b) => b.apy - a.apy);
  const bestApy = sortedBanks[0].apy;
  $('banks-tbody').innerHTML = sortedBanks.map(bank => {
    const gain = savingsBudget * (bank.apy/100);
    const isBest = bank.apy === bestApy;
    return `<tr class="${isBest ? 'best-bank' : ''}">
      <td><span class="bank-name">${bank.name}</span></td>
      <td><span class="bank-apy">${bank.apy}%</span></td>
      <td><span class="bank-gain">${fmt(gain)}</span></td>
      <td>${isBest ? '<span class="best-tag">⭐ Mejor</span>' : ''}</td>
    </tr>`;
  }).join('');

  // Tip
  $('tip-text').textContent = tip;

  // Donut chart
  renderChart(equityAlloc, savingsBudget, total);
}

function renderChart(equityAlloc, savingsBudget, total) {
  if (donutChart) { donutChart.destroy(); donutChart = null; }

  const labels = [...equityAlloc.map(s => s.sym), 'Ahorro APY'];
  const values = [...equityAlloc.map(s => s.allocated), savingsBudget];
  const colors = equityAlloc.map((_, i) => CHART_COLORS[i]).concat(CHART_COLORS[3]);

  const ctx = $('donut-chart').getContext('2d');
  donutChart = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels,
      datasets: [{
        data: values,
        backgroundColor: colors.map(c => c + 'cc'),
        borderColor: colors,
        borderWidth: 2,
        hoverOffset: 6,
      }]
    },
    options: {
      cutout: '68%',
      plugins: { legend: { display: false }, tooltip: {
        callbacks: {
          label: ctx => ` ${fmt(ctx.raw)} (${((ctx.raw/total)*100).toFixed(1)}%)`
        },
        backgroundColor: '#0f2040',
        borderColor: 'rgba(59,130,246,0.3)',
        borderWidth: 1,
        titleColor: '#fff',
        bodyColor: '#94a3b8',
      }},
      animation: { animateRotate: true, duration: 800 },
    }
  });

  // Custom legend
  const legendEl = $('chart-legend');
  legendEl.innerHTML = labels.map((lbl, i) => `
    <div class="legend-item">
      <div class="legend-dot" style="background:${colors[i]}"></div>
      <span class="legend-sym">${lbl}</span>
      <span class="legend-pct">${((values[i]/total)*100).toFixed(0)}%</span>
    </div>
  `).join('');
}

/* ─── INIT ──────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', initAuth);
