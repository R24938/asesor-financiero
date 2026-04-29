/* ═══════════════════════════════════════════════════
   NEXWEALTH v2 — SCRIPT.JS
   Motor de Asesoría Dinámica en CLP
   Todo el texto / inteligencia se genera aquí.
═══════════════════════════════════════════════════ */
'use strict';

/* ─────────────────────────────────────────────────
   CONSTANTES: tipo de cambio y umbrales en CLP
───────────────────────────────────────────────── */
const USD_TO_CLP = 940;   // Tasa de referencia aproximada

// Umbrales de perfil (CLP)
const PERFIL = {
  MICRO:  200_000,      // < $200.000  → Perfil Ahorro Total
  BAJO:   500_000,      // < $500.000  → Perfil Conservador
  MEDIO: 1_000_000,     // < $1.000.000 → Perfil Moderado
  ALTO:  5_000_000,     // < $5.000.000 → Perfil Crecimiento
                        // >= $5.000.000 → Perfil Patrimonial
};

/* ─────────────────────────────────────────────────
   CATÁLOGO DE INSTRUMENTOS
   Precios en USD → se convierten internamente a CLP
───────────────────────────────────────────────── */
const ACCIONES = [
  { sym: 'MSFT',  name: 'Microsoft Corporation',   priceUSD: 390,  sector: 'Tecnología',
    rationale: 'Liderazgo en nube (Azure) e IA corporativa. Flujo de caja predecible y dividendo creciente.' },
  { sym: 'JPM',   name: 'JPMorgan Chase & Co.',    priceUSD: 240,  sector: 'Financiero',
    rationale: 'Banco más rentable de EE.UU. Beneficiario directo de tasas altas y expansión crediticia.' },
  { sym: 'NVDA',  name: 'NVIDIA Corporation',      priceUSD: 118,  sector: 'Semiconductores',
    rationale: 'Infraestructura esencial de la revolución IA. Márgenes operativos superiores al 55 %.' },
  { sym: 'AAPL',  name: 'Apple Inc.',              priceUSD: 211,  sector: 'Tecnología',
    rationale: 'Ecosistema de 2.000 MM de usuarios activos. Recompra masiva de acciones sostenida.' },
  { sym: 'TSLA',  name: 'Tesla Inc.',              priceUSD: 275,  sector: 'Automotriz/Energía',
    rationale: 'Líder en vehículos eléctricos y almacenamiento energético. Alto potencial, alta volatilidad.' },
  { sym: 'AMZN',  name: 'Amazon.com Inc.',         priceUSD: 186,  sector: 'E-Commerce / Cloud',
    rationale: 'AWS concentra el 70 % del beneficio operativo. Negocio publicitario en expansión acelerada.' },
  { sym: 'KO',    name: 'Coca-Cola Company',       priceUSD: 63,   sector: 'Consumo Defensivo',
    rationale: 'Dividendo ininterrumpido por +60 años. Refugio clásico ante ciclos recesivos.' },
  { sym: 'F',     name: 'Ford Motor Company',      priceUSD: 10,   sector: 'Automotriz',
    rationale: 'Acceso al mercado EV a precio accesible. Mayor riesgo, mayor potencial especulativo.' },
  { sym: 'T',     name: 'AT&T Inc.',               priceUSD: 18,   sector: 'Telecomunicaciones',
    rationale: 'Rendimiento por dividendo ~7 %. Opción de renta para perfiles conservadores.' },
  { sym: 'INTC',  name: 'Intel Corporation',       priceUSD: 21,   sector: 'Semiconductores',
    rationale: 'En proceso de reestructuración. Precio castigado que puede ofrecer rebote de valor.' },
];

const ETF_CATALOG = [
  { sym: 'ITOT', name: 'iShares Total Market ETF (EE.UU.)', priceUSD: 105,
    sector: 'ETF Diversificado', rationale: 'Exposición a más de 3.000 empresas americanas con comisión de solo 0,03 %. Ideal para comenzar.' },
  { sym: 'VOO',  name: 'Vanguard S&P 500 ETF',            priceUSD: 512,
    sector: 'ETF S&P 500', rationale: 'Las 500 empresas más grandes de EE.UU. en un solo instrumento. Rendimiento histórico ~10 % anual.' },
  { sym: 'SCHB', name: 'Schwab Total Market ETF',          priceUSD: 23,
    sector: 'ETF Diversificado', rationale: 'El ETF de menor precio por acción del mercado americano. Perfecto para capitales iniciales.' },
  { sym: 'IPSA', name: 'ETF IPSA (Mercado Chileno)',       priceUSD: 18,
    sector: 'ETF Chile', rationale: 'Replica el índice bursátil chileno. Exposición doméstica sin riesgo cambiario USD/CLP.' },
  { sym: 'IEF',  name: 'iShares 7-10yr Treasury Bond',    priceUSD: 93,
    sector: 'Renta Fija', rationale: 'Bonos del Tesoro americano de mediano plazo. Reduce la volatilidad del portafolio.' },
];

/* ─────────────────────────────────────────────────
   CATÁLOGO BANCARIO (tasas anuales en %)
   Selección dinámica según capital
───────────────────────────────────────────────── */
const BANCOS_BAJO = [
  { nombre: 'Mercado Pago',          tasa: 7.5,  tipo: 'Cuenta remunerada', nota: 'Liquidez inmediata · Sin saldo mínimo' },
  { nombre: 'MACH (BCI)',            tasa: 6.2,  tipo: 'Cuenta vista',      nota: 'Acceso 24/7 · Transferencias gratis' },
  { nombre: 'Coopeuch',              tasa: 5.8,  tipo: 'Depósito 30 días',  nota: 'Cooperativa · Sin costo de mantención' },
];

const BANCOS_ALTO = [
  { nombre: 'Banco de Chile (DAP)',  tasa: 5.10, tipo: 'Depósito a Plazo',  nota: 'Tasa fija garantizada · Plazo 90–365 días' },
  { nombre: 'Banco Estado (DAP)',    tasa: 4.90, tipo: 'Depósito a Plazo',  nota: 'Respaldo estatal · Ideal para patrimonios' },
  { nombre: 'Santander Chile',       tasa: 4.70, tipo: 'Depósito a Plazo',  nota: 'Red amplia · Renovación automática disponible' },
];

/* ─────────────────────────────────────────────────
   DATOS DE TENDENCIA SIMULADA (últimos 5 meses)
   Cada entrada: array de 5 valores % (puede ser
   positivo, negativo o plano)
───────────────────────────────────────────────── */
const TENDENCIAS = {
  MSFT:  [+2.1, +3.4, -1.2, +4.0, +1.8],
  JPM:   [+1.5, -0.8, +2.3, +3.1, +2.6],
  NVDA:  [+8.2, -4.1, +11.3, -2.0, +6.7],
  AAPL:  [+1.2, +2.8, -0.5, +1.9, +3.0],
  TSLA:  [-5.3, +9.1, -3.8, +7.2, -2.1],
  AMZN:  [+3.1, +1.4, +2.2, -0.9, +4.5],
  KO:    [+0.4, +0.6, +0.2, +0.8, +0.3],
  F:     [-2.1, +1.2, +3.4, -1.8, +2.0],
  T:     [+0.3, -0.2, +0.5, +0.4, +0.1],
  INTC:  [-3.2, -1.5, +2.1, -2.8, +1.3],
  ITOT:  [+1.3, +1.8, -0.4, +2.1, +1.5],
  VOO:   [+1.5, +2.0, -0.3, +2.4, +1.7],
  SCHB:  [+1.2, +1.7, -0.5, +2.2, +1.4],
  IPSA:  [+0.8, -1.2, +2.5, +1.0, +1.8],
  IEF:   [+0.2, +0.5, +0.1, -0.1, +0.4],
};

const MESES_LABELS = ['Nov', 'Dic', 'Ene', 'Feb', 'Mar'];
const CHART_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#f43f5e'];

/* ─────────────────────────────────────────────────
   HELPERS
───────────────────────────────────────────────── */
const $ = id => document.getElementById(id);

/** Formato CLP: $1.234.567 */
function fmtCLP(n) {
  return '$\u00A0' + Math.round(n).toLocaleString('es-CL');
}

/** Precio en CLP de un instrumento con priceUSD */
function priceCLP(instr) {
  return instr.priceUSD * USD_TO_CLP;
}

function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  $(id).classList.add('active');
  window.scrollTo(0, 0);
}

/* ─────────────────────────────────────────────────
   AUTH — LocalStorage
───────────────────────────────────────────────── */
let currentUser = null;

const getUsers   = () => JSON.parse(localStorage.getItem('nw_users') || '{}');
const saveUsers  = u  => localStorage.setItem('nw_users', JSON.stringify(u));
const getSession = () => localStorage.getItem('nw_session');
const setSession = e  => localStorage.setItem('nw_session', e);
const clearSession = () => localStorage.removeItem('nw_session');

function initAuth() {
  document.querySelectorAll('.auth-tab').forEach(t =>
    t.addEventListener('click', () => switchTab(t.dataset.tab)));
  document.querySelectorAll('[data-switch]').forEach(a =>
    a.addEventListener('click', e => { e.preventDefault(); switchTab(a.dataset.switch); }));
  $('btn-login').addEventListener('click', handleLogin);
  $('btn-register').addEventListener('click', handleRegister);
  ['login-email','login-pass'].forEach(id =>
    $(id).addEventListener('keydown', e => e.key === 'Enter' && handleLogin()));
  ['reg-name','reg-email','reg-pass'].forEach(id =>
    $(id).addEventListener('keydown', e => e.key === 'Enter' && handleRegister()));

  const email = getSession();
  if (email) {
    const u = getUsers()[email];
    if (u) { loginSuccess(u); return; }
  }
  showScreen('screen-auth');
}

function switchTab(tab) {
  document.querySelectorAll('.auth-tab').forEach(t => t.classList.toggle('active', t.dataset.tab === tab));
  document.querySelectorAll('.auth-form').forEach(f => f.classList.toggle('active', f.id === `form-${tab}`));
}

function showError(id, msg) { const el=$(id); el.textContent=msg; el.classList.remove('hidden'); }
function hideError(id) { $(id).classList.add('hidden'); }

function handleLogin() {
  hideError('login-error');
  const email = $('login-email').value.trim().toLowerCase();
  const pass  = $('login-pass').value;
  if (!email || !pass) { showError('login-error','Completa todos los campos.'); return; }
  const u = getUsers()[email];
  if (!u || u.pass !== btoa(pass)) { showError('login-error','Correo o contraseña incorrectos.'); return; }
  setSession(email); loginSuccess(u);
}

function handleRegister() {
  hideError('reg-error');
  const name  = $('reg-name').value.trim();
  const email = $('reg-email').value.trim().toLowerCase();
  const pass  = $('reg-pass').value;
  if (!name||!email||!pass) { showError('reg-error','Completa todos los campos.'); return; }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { showError('reg-error','Correo inválido.'); return; }
  if (pass.length < 6) { showError('reg-error','Mínimo 6 caracteres.'); return; }
  const users = getUsers();
  if (users[email]) { showError('reg-error','Este correo ya está registrado.'); return; }
  users[email] = { name, email, pass: btoa(pass) };
  saveUsers(users); setSession(email); loginSuccess(users[email]);
}

function loginSuccess(user) {
  currentUser = user;
  $('nav-user').textContent     = `👤 ${user.name.split(' ')[0]}`;
  $('nav-user-2').textContent   = `👤 ${user.name.split(' ')[0]}`;
  showScreen('screen-invest');
}

function logout() {
  clearSession(); currentUser = null;
  $('invest-amount').value = '';
  $('profile-preview').classList.add('hidden');
  showScreen('screen-auth');
}

/* ─────────────────────────────────────────────────
   PERFIL DE USUARIO (preview dinámico)
───────────────────────────────────────────────── */
function getPerfilData(clp) {
  if (clp < PERFIL.MICRO) return {
    icon: '🏦', name: 'Perfil Ahorro Total',
    desc: 'Capital inicial · Prioridad: consolidar con ahorro seguro',
    equityPct: 10, savingsPct: 90,
  };
  if (clp < PERFIL.BAJO) return {
    icon: '🌱', name: 'Perfil Conservador',
    desc: 'Capital bajo · ETFs de bajo costo + ahorro',
    equityPct: 30, savingsPct: 70,
  };
  if (clp < PERFIL.MEDIO) return {
    icon: '📈', name: 'Perfil Moderado',
    desc: 'Capital medio · Mix ETF + algunas acciones',
    equityPct: 50, savingsPct: 50,
  };
  if (clp < PERFIL.ALTO) return {
    icon: '💼', name: 'Perfil Crecimiento',
    desc: 'Buen capital · Acciones líderes + diversificación',
    equityPct: 60, savingsPct: 40,
  };
  return {
    icon: '🏛️', name: 'Perfil Patrimonial',
    desc: 'Capital significativo · Portafolio institucional',
    equityPct: 65, savingsPct: 35,
  };
}

/* ─────────────────────────────────────────────────
   PANTALLA DE INVERSIÓN
───────────────────────────────────────────────── */
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
      updateProfilePreview(parseFloat(btn.dataset.amount));
    });
  });

  $('invest-amount').addEventListener('input', () => {
    const v = parseFloat($('invest-amount').value);
    if (v > 0) updateProfilePreview(v);
    else $('profile-preview').classList.add('hidden');
  });
}

function updateProfilePreview(clp) {
  const p = getPerfilData(clp);
  $('profile-icon').textContent = p.icon;
  $('profile-name').textContent = p.name;
  $('profile-desc').textContent = p.desc;
  $('profile-preview').classList.remove('hidden');
}

function buildTicker() {
  const track = $('ticker-track');
  const all = [...ACCIONES, ...ETF_CATALOG];
  const items = all.map(s => {
    const trends = TENDENCIAS[s.sym] || [0,0,0,0,0];
    const lastChg = trends[trends.length-1].toFixed(1);
    const dir = parseFloat(lastChg) >= 0 ? 'up' : 'down';
    const arrow = dir === 'up' ? '▲' : '▼';
    return `<span class="ticker-item">
      <span class="ticker-sym">${s.sym}</span>
      <span class="ticker-price">${fmtCLP(priceCLP(s))}</span>
      <span class="ticker-chg ${dir}">${arrow} ${Math.abs(lastChg)}%</span>
      <span class="ticker-sep">·</span>
    </span>`;
  }).join('');
  track.innerHTML = items + items; // duplicar para scroll infinito
}

/* ─────────────────────────────────────────────────
   MOTOR DE CÁLCULO PRINCIPAL
───────────────────────────────────────────────── */
function handleCalculate() {
  hideError('invest-error');
  const raw = parseFloat($('invest-amount').value);
  if (!raw || raw < 1000) {
    showError('invest-error','Ingresa al menos $1.000 CLP para comenzar tu análisis.');
    return;
  }
  const result = calculatePortfolio(raw);
  renderDashboard(result);
  showScreen('screen-dashboard');
}

function calculatePortfolio(totalCLP) {
  const perfil    = getPerfilData(totalCLP);
  const equityBudget  = totalCLP * (perfil.equityPct / 100);
  const savingsBudget = totalCLP * (perfil.savingsPct / 100);

  /* ── Selección de instrumentos ── */
  let picks = [];
  let modoETF = false;

  if (totalCLP >= PERFIL.ALTO) {
    // Perfil alto/patrimonial → acciones líderes
    const afordables = ACCIONES.filter(a => priceCLP(a) <= totalCLP);
    const top = afordables.sort((a,b) => b.priceUSD - a.priceUSD);
    picks = top.slice(0, 3);
  } else if (totalCLP >= PERFIL.MEDIO) {
    // Perfil crecimiento → mix acciones asequibles
    const afordables = ACCIONES.filter(a => priceCLP(a) <= equityBudget * 0.5);
    picks = afordables.sort((a,b) => b.priceUSD - a.priceUSD).slice(0, 3);
    if (picks.length < 2) { picks = []; modoETF = true; }
  } else if (totalCLP >= PERFIL.BAJO) {
    // Perfil moderado → ETFs de precio accesible
    modoETF = true;
    picks = ETF_CATALOG.filter(e => priceCLP(e) <= equityBudget)
      .sort((a,b) => a.priceUSD - b.priceUSD).slice(0, 3);
  } else if (totalCLP >= PERFIL.MICRO) {
    // Perfil conservador → ETF más barato
    modoETF = true;
    const baratos = ETF_CATALOG.filter(e => priceCLP(e) <= equityBudget)
      .sort((a,b) => a.priceUSD - b.priceUSD);
    picks = baratos.slice(0, 2);
  } else {
    // Perfil micro → todo ahorro, sin instrumentos de renta variable
    modoETF = true;
    picks = [];
  }

  /* ── Pesos de asignación ── */
  const WEIGHTS = [0.50, 0.30, 0.20];
  const equityAlloc = picks.map((instr, i) => {
    const w   = picks.length === 1 ? 1 : (WEIGHTS[i] || 0.20);
    const aloc = equityBudget * w;
    const shares = Math.floor(aloc / priceCLP(instr));
    return { ...instr, weight: w, allocated: aloc, shares, priceCLP: priceCLP(instr) };
  });

  /* ── Bancos ── */
  const bancos = totalCLP < PERFIL.MEDIO ? BANCOS_BAJO : BANCOS_ALTO;
  const bestBank = [...bancos].sort((a,b) => b.tasa - a.tasa)[0];

  /* ── Proyecciones ── */
  const projections = [1,3,5].map(yrs => ({
    years: yrs,
    value: savingsBudget * Math.pow(1 + bestBank.tasa / 100, yrs),
  }));

  return {
    totalCLP, perfil, equityBudget, savingsBudget,
    equityAlloc, modoETF, bancos, bestBank, projections,
  };
}

/* ─────────────────────────────────────────────────
   GENERADOR DE TEXTO DEL ASESOR (100% dinámico)
───────────────────────────────────────────────── */
function generarAnalisisAsesor(data) {
  const { totalCLP, perfil, equityAlloc, modoETF, bestBank, savingsBudget } = data;
  const montoFmt = fmtCLP(totalCLP);
  const nombreUsuario = currentUser.name.split(' ')[0];

  let titulo = '';
  let cuerpo  = '';
  let tags    = [];

  if (totalCLP < PERFIL.MICRO) {
    titulo = `${nombreUsuario}, consolidemos tu base antes de invertir en bolsa`;
    cuerpo = `Basado en tu inversión de ${montoFmt} CLP, mi recomendación es destinar el 90 % a una cuenta de ahorro de alto rendimiento. Con este nivel de capital, los costos de transacción y la volatilidad del mercado accionario pueden erosionar rápidamente el patrimonio. Mercado Pago o MACH ofrecen tasas superiores al 6 % anual con liquidez inmediata, lo que te permite rescatar fondos cuando tu capital crezca. El objetivo de esta etapa es alcanzar al menos $500.000 CLP para comenzar a diversificar hacia ETFs de bajo costo.`;
    tags = [
      { txt: 'Riesgo Bajo', cls: 'tag-green' },
      { txt: 'Liquidez Inmediata', cls: 'tag-blue' },
      { txt: 'Horizonte: 0–6 meses', cls: 'tag-amber' },
    ];
  } else if (totalCLP < PERFIL.BAJO) {
    titulo = `${nombreUsuario}, ETFs de bajo costo: tu mejor puerta de entrada`;
    cuerpo = `Basado en tu inversión de ${montoFmt} CLP, mi recomendación es comenzar con ETFs diversificados en lugar de acciones individuales. Con este capital, comprar una sola acción de Microsoft (~$366.600 CLP) representaría más del 70 % de tu portafolio, una concentración demasiado alta para un portafolio sano. Los ETFs como SCHB o IPSA te dan exposición a cientos de empresas desde $21.000 CLP por unidad, reduciendo el riesgo específico de cada empresa. El 70 % restante en ahorro actúa como reserva de liquidez para incrementar posiciones gradualmente.`;
    tags = [
      { txt: 'Diversificación ETF', cls: 'tag-green' },
      { txt: 'Riesgo Controlado', cls: 'tag-blue' },
      { txt: 'Horizonte: 6–18 meses', cls: 'tag-amber' },
    ];
  } else if (totalCLP < PERFIL.MEDIO) {
    titulo = `${nombreUsuario}, balance estratégico entre crecimiento y protección`;
    const instrumento = equityAlloc[0] ? equityAlloc[0].sym : 'ETF diversificado';
    cuerpo = `Basado en tu inversión de ${montoFmt} CLP, mi recomendación es una estrategia 50/50 que combina renta variable con ahorro estructurado. ${instrumento} lidera tu portafolio de inversión. A este nivel de capital ya es posible adquirir ETFs diversificados y construir una base accionaria. El mercado chileno (IPSA) atraviesa actualmente un ciclo de recuperación con sectores de minería y retail mostrando tendencia positiva. Mantén el 50 % en ahorro hasta consolidar un fondo de emergencia equivalente a 3 meses de gastos.`;
    tags = [
      { txt: 'Portafolio Mixto', cls: 'tag-blue' },
      { txt: 'Mercado Chileno ↑', cls: 'tag-green' },
      { txt: 'Horizonte: 1–2 años', cls: 'tag-amber' },
    ];
  } else if (totalCLP < PERFIL.ALTO) {
    const syms = equityAlloc.map(e => e.sym).join(', ');
    titulo = `${nombreUsuario}, diversificación con acciones líderes globales`;
    cuerpo = `Basado en tu inversión de ${montoFmt} CLP, mi recomendación es construir un portafolio de acciones de alta calidad: ${syms || 'acciones líderes'}. Con este capital, la clave es la diversificación sectorial: no concentres más del 35 % en tecnología. MSFT aporta estabilidad de flujo de caja, JPM te da exposición financiera en un entorno de tasas altas, y TSLA agrega potencial de crecimiento con mayor volatilidad. El 40 % en Depósito a Plazo en Banco de Chile garantiza una tasa fija que protege tu patrimonio del ciclo bursátil.`;
    tags = [
      { txt: 'Acciones Líderes', cls: 'tag-blue' },
      { txt: 'Diversificación Sectorial', cls: 'tag-green' },
      { txt: 'Horizonte: 2–5 años', cls: 'tag-amber' },
    ];
  } else {
    const syms = equityAlloc.map(e => e.sym).join(', ');
    titulo = `${nombreUsuario}, gestión patrimonial con visión institucional`;
    cuerpo = `Basado en tu inversión de ${montoFmt} CLP, mi recomendación es un portafolio institucional con posiciones en ${syms || 'acciones de primer nivel'}. A este nivel patrimonial, considera adicionalmente bonos del Tesoro americano (IEF) para reducir la correlación con renta variable. El DAP en Banco de Chile o BancoEstado ofrece tasas competitivas con respaldo de primera línea. Evalúa también dividir el segmento de ahorro entre 2 instituciones para diversificar riesgo de contraparte. Rebalanceo trimestral recomendado.`;
    tags = [
      { txt: 'Portafolio Institucional', cls: 'tag-blue' },
      { txt: 'Gestión Activa', cls: 'tag-green' },
      { txt: 'Horizonte: 5+ años', cls: 'tag-amber' },
    ];
  }

  return { titulo, cuerpo, tags };
}

/* ─────────────────────────────────────────────────
   RENDER DEL DASHBOARD
───────────────────────────────────────────────── */
let donutChart = null;

function renderDashboard(data) {
  const {
    totalCLP, perfil, equityBudget, savingsBudget,
    equityAlloc, modoETF, bancos, bestBank, projections,
  } = data;

  // Nav
  $('nav-user-2').textContent = `👤 ${currentUser.name.split(' ')[0]}`;

  /* ── Análisis del asesor ── */
  const analisis = generarAnalisisAsesor(data);
  $('advisor-avatar').textContent = perfil.icon;
  $('advisor-title').textContent  = analisis.titulo;
  $('advisor-body').textContent   = analisis.cuerpo;
  $('advisor-tags').innerHTML = analisis.tags.map(t =>
    `<span class="advisor-tag ${t.cls}">${t.txt}</span>`).join('');

  /* ── Header ── */
  $('dash-total').textContent  = fmtCLP(totalCLP);
  $('equity-pct').textContent  = perfil.equityPct + '%';
  $('savings-pct').textContent = perfil.savingsPct + '%';
  $('equity-label').textContent = modoETF ? 'ETFs / Renta Variable' : 'Acciones';

  /* ── Instrumentos ── */
  $('instruments-title').innerHTML = `${modoETF ? 'ETFs recomendados' : 'Acciones recomendadas'}
    <span class="badge-dyn">${perfil.equityPct}% — ${fmtCLP(equityBudget)}</span>`;
  $('equity-badge').textContent = '';

  if (equityAlloc.length === 0) {
    $('stocks-list').innerHTML = `
      <div class="stock-item">
        <div class="stock-logo">🏦</div>
        <div class="stock-info">
          <div class="stock-sym">100% Ahorro</div>
          <div class="stock-rationale">Con tu capital actual, la estrategia óptima es concentrar el 100% en ahorro de alto rendimiento. Cuando alcances $200.000 CLP podrás comenzar a diversificar hacia ETFs.</div>
        </div>
      </div>`;
  } else {
    $('stocks-list').innerHTML = equityAlloc.map(s => `
      <div class="stock-item">
        <div class="stock-logo">${s.sym.slice(0,4)}</div>
        <div class="stock-info">
          <div class="stock-sym">${s.sym}</div>
          <div class="stock-name">${s.name} · ${s.sector}</div>
          <div class="stock-rationale">${s.rationale}</div>
        </div>
        <div class="stock-right">
          <div class="stock-alloc">${fmtCLP(s.allocated)}</div>
          <div class="stock-price">${fmtCLP(s.priceCLP)} / u.</div>
          <div class="stock-shares">${s.shares > 0 ? `≈ ${s.shares} unidad${s.shares !== 1 ? 'es' : ''}` : 'Fracción posible'}</div>
        </div>
      </div>`).join('');
  }

  /* ── Tendencias ── */
  renderTrends(equityAlloc);

  /* ── Ahorro ── */
  $('savings-amount').textContent = fmtCLP(savingsBudget);
  $('savings-card-title').textContent = totalCLP < PERFIL.MEDIO
    ? 'Cuenta de Ahorro Remunerada'
    : 'Depósito a Plazo (DAP)';
  $('savings-sub').textContent = `${perfil.savingsPct}% de tu capital · Tasa referencial ${bestBank.tasa}% anual`;
  $('savings-projection').innerHTML = projections.map(p => `
    <div class="proj-badge">
      <div class="proj-label">${p.years} año${p.years>1?'s':''}</div>
      <div class="proj-val">${fmtCLP(p.value)}</div>
    </div>`).join('');

  /* ── Bancos ── */
  $('banks-context').textContent = totalCLP < PERFIL.MEDIO
    ? 'Para capitales bajos, priorizamos liquidez inmediata. Estas cuentas permiten retirar en cualquier momento sin penalización.'
    : 'Para capitales significativos, un DAP garantiza una tasa fija durante el plazo pactado, protegiéndote de variaciones del mercado.';

  const maxTasa = Math.max(...bancos.map(b => b.tasa));
  $('banks-tbody').innerHTML = bancos.map(b => {
    const ganancia = savingsBudget * (b.tasa / 100);
    const isBest   = b.tasa === maxTasa;
    return `<tr class="${isBest ? 'best-bank' : ''}">
      <td>
        <div class="bank-name">${b.nombre}</div>
        <div style="font-size:0.72rem;color:var(--slate-500)">${b.nota}</div>
      </td>
      <td><span class="bank-rate">${b.tasa.toFixed(2)}%</span></td>
      <td><span class="bank-gain">${fmtCLP(ganancia)}</span></td>
      <td>${isBest ? '<span class="best-tag">⭐ Mejor</span>' : ''}</td>
    </tr>`;
  }).join('');

  /* Recomendación bancaria dinámica */
  const gananciaBest = savingsBudget * (bestBank.tasa / 100);
  $('bank-recommendation').innerHTML = `
    <strong>${bestBank.nombre}</strong> es tu mejor opción para el ${perfil.savingsPct}% de ahorro
    (${fmtCLP(savingsBudget)} CLP). Con una tasa del ${bestBank.tasa}% anual en ${bestBank.tipo},
    generarías <strong>${fmtCLP(gananciaBest)} CLP</strong> en intereses durante el primer año.
    ${totalCLP < PERFIL.MEDIO
      ? 'La liquidez inmediata es clave en esta etapa para reaccionar ante oportunidades.'
      : 'La tasa fija te protege de posibles bajas en las tasas de referencia del BCCh.'}`;

  /* ── Donut Chart ── */
  renderChart(equityAlloc, savingsBudget, totalCLP, perfil);
}

/* ─────────────────────────────────────────────────
   TENDENCIAS: mini-gráfico de 5 meses
───────────────────────────────────────────────── */
function renderTrends(equityAlloc) {
  const trendsEl = $('trends-list');
  const instrs = equityAlloc.length > 0 ? equityAlloc.slice(0, 3) : [];

  if (instrs.length === 0) {
    trendsEl.innerHTML = `
      <div class="trend-item">
        <span class="trend-sym" style="color:var(--slate-500)">—</span>
        <span style="font-size:0.8rem;color:var(--slate-500)">Sin instrumentos de renta variable en este perfil.</span>
      </div>`;
    return;
  }

  trendsEl.innerHTML = instrs.map(instr => {
    const data = TENDENCIAS[instr.sym] || [0,0,0,0,0];
    const total = data.reduce((a,b) => a+b, 0);
    const acum  = total >= 0 ? `+${total.toFixed(1)}%` : `${total.toFixed(1)}%`;

    const months = data.map((v, i) => {
      const cls = v > 0.2 ? 'up' : v < -0.2 ? 'down' : 'flat';
      const arrow = v > 0.2 ? '↑' : v < -0.2 ? '↓' : '→';
      return `<div class="trend-month ${cls}" title="${MESES_LABELS[i]}: ${v>0?'+':''}${v}%">
        ${arrow}
      </div>`;
    }).join('');

    const totalCls = total >= 0 ? 'color:var(--emerald-400)' : 'color:var(--rose-400)';
    return `
      <div class="trend-item">
        <span class="trend-sym">${instr.sym}</span>
        <div class="trend-months">${months}</div>
        <span class="trend-summary" style="${totalCls}">${acum}</span>
      </div>`;
  }).join('');

  // Labels de meses debajo
  const labelsRow = `
    <div class="trend-item" style="padding-top:0">
      <span class="trend-sym" style="color:transparent">---</span>
      <div class="trend-months">
        ${MESES_LABELS.map(m => `<div class="trend-month flat" style="background:transparent;color:var(--slate-600);font-size:0.62rem;font-weight:500">${m}</div>`).join('')}
      </div>
      <span class="trend-summary"></span>
    </div>`;
  trendsEl.innerHTML += labelsRow;
}

/* ─────────────────────────────────────────────────
   DONUT CHART
───────────────────────────────────────────────── */
function renderChart(equityAlloc, savingsBudget, totalCLP, perfil) {
  if (donutChart) { donutChart.destroy(); donutChart = null; }

  const labels = equityAlloc.length > 0
    ? [...equityAlloc.map(s => s.sym), 'Ahorro']
    : ['Ahorro 100%'];
  const values = equityAlloc.length > 0
    ? [...equityAlloc.map(s => s.allocated), savingsBudget]
    : [totalCLP];
  const colors = equityAlloc.length > 0
    ? equityAlloc.map((_, i) => CHART_COLORS[i]).concat(CHART_COLORS[3])
    : [CHART_COLORS[1]];

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
        hoverOffset: 8,
      }]
    },
    options: {
      cutout: '68%',
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: ctx => ` ${fmtCLP(ctx.raw)} (${((ctx.raw/totalCLP)*100).toFixed(1)}%)`,
          },
          backgroundColor: '#0f2040',
          borderColor: 'rgba(59,130,246,0.3)',
          borderWidth: 1,
          titleColor: '#fff',
          bodyColor: '#94a3b8',
        }
      },
      animation: { animateRotate: true, duration: 900 },
    }
  });

  $('chart-legend').innerHTML = labels.map((lbl, i) => `
    <div class="legend-item">
      <div class="legend-dot" style="background:${colors[i]}"></div>
      <span class="legend-sym">${lbl}</span>
      <span class="legend-pct">${((values[i]/totalCLP)*100).toFixed(0)}%</span>
    </div>`).join('');
}

/* ─────────────────────────────────────────────────
   INIT
───────────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {
  initInvestScreen(); // registra listeners UNA sola vez
  initAuth();
});
