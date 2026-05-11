// ════════════════════════════════════════════════════════
// AUTH GLOBAL WRAPPER (COOKIE-BASED)
// ════════════════════════════════════════════════════════

window.AUTH = {
  vaultToken: null,
  refreshPromise: null
};

// =======================================================
// VAULT TOKEN
// =======================================================

function setVaultToken(token) {
  window.AUTH.vaultToken = token;
}

function clearVaultToken() {
  window.AUTH.vaultToken = null;
}

// =======================================================
// AUTH CONTROL
// =======================================================

function clearAuth() {
  clearVaultToken();
}

function redirectToLogin() {
  if (window.location.pathname.includes('/login/')) return;
  window.location.href = '../../index.html';
}

async function forceLogout() {
  try {
    await fetch(`${window.CONFIG.API_BASE_URL}api/user/logout`, {
      method: 'POST',
      credentials: 'include'
    });
  } catch (_) {}

  clearAuth();
  redirectToLogin();
}

// =======================================================
// REFRESH TOKEN (COOKIE-BASED)
// =======================================================

async function refreshAccessToken() {
  if (window.AUTH.refreshPromise) {
    return window.AUTH.refreshPromise;
  }

  window.AUTH.refreshPromise = (async () => {
    try {
      const res = await fetch(
        `${window.CONFIG.API_BASE_URL}api/user/refresh`,
        {
          method: 'POST',
          credentials: 'include'
        }
      );

      if (!res.ok) {
        throw new Error('refresh_failed');
      }

      // access token volta automaticamente via cookie
      return true;

    } catch (err) {
      clearAuth();
      await forceLogout();
      throw err;

    } finally {
      window.AUTH.refreshPromise = null;
    }
  })();

  return window.AUTH.refreshPromise;
}

// =======================================================
// API FETCH
// =======================================================

async function apiFetch(url, options = {}, retry = true) {

  const headers = new Headers(options.headers || {});

  // =====================================================
  // VAULT TOKEN
  // só envia se explicitamente solicitado
  // =====================================================

  if (options.useVaultToken && window.AUTH.vaultToken) {
    headers.set(
      'X-Vault-Token',
      `Bearer ${window.AUTH.vaultToken}`
    );
  }

  // =====================================================
  // CONFIG FINAL
  // credentials include = cookies automáticos
  // =====================================================

  const config = {
    ...options,
    headers,
    credentials: 'include'
  };

  let response = await fetch(url, config);

  // =====================================================
  // VAULT TOKEN EXPIRADO
  // não tenta refresh do auth principal
  // =====================================================

  if (response.status === 401 && options.useVaultToken) {
    clearVaultToken();

    if (typeof mostrarVaultExpirado === 'function') {
      mostrarVaultExpirado();
    }

    return response;
  }

  // =====================================================
  // ACCESS TOKEN EXPIRADO
  // tenta refresh via cookie refresh token
  // =====================================================

  if (response.status === 401 && retry) {
    try {

      await refreshAccessToken();

      // retry automático
      response = await fetch(url, config);

    } catch (_) {
      return response;
    }
  }

  return response;
}

// ════════════════════════════════════════════════════════
// FIM
// ════════════════════════════════════════════════════════


// ══════════════════════════════════════════════
// ATLAS — Auditoria do Sistema | script.js
// ══════════════════════════════════════════════

// ── Dark Mode ──────────────────────────────────
(function iniciaDarkMode() {
  const saved = localStorage.getItem('atlasTheme') || 'light';
  document.documentElement.setAttribute('data-theme', saved);
  atualizarIconeTema();
})();

function atualizarIconeTema() {
  const btn = document.getElementById('themeToggle');
  if (!btn) return;
  const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
  btn.textContent = isDark ? '☀️' : '🌙';
  btn.title = isDark ? 'Modo claro' : 'Modo escuro';
}

document.getElementById('themeToggle').addEventListener('click', () => {
  const next = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', next);
  localStorage.setItem('atlasTheme', next);
  atualizarIconeTema();
});

// ── Auth Check ─────────────────────────────────
(async function checkAuth() {
  try {
    const res = await apiFetch(`${window.CONFIG.API_BASE_URL}api/user/apicheck`, {
      method: 'GET', credentials: 'include'
    });
    if (!res.ok) {
      window.location.href = '../../../painelDeLogin/login/index.html';
      return;
    }
    const data = await res.json();
    console.log('[ATLAS] Autenticado:', data.user);
  } catch {
    window.location.href = '../../../painelDeLogin/login/index.html';
  }
})();

// ── Estado global ──────────────────────────────
const state = {
  arquivoAtual:   null,     // nome do arquivo selecionado
  tipoAtual:      null,     // 'auth' | 'create' | 'delete' | 'update'
  logsOriginais:  [],       // todos os logs parseados do arquivo atual
  logSelecionadoId: null,   // log em foco para investigação
  filtroTexto:    '',
  filtroStatus:   'all',    // 'all' | 'sucesso' | 'falha'
  ordemDesc:      true,
  quickSearch: {
    usuario: '',
    ip: '',
    regiao: '',
    local: '',
    região: '',
  },
};

// ── Mapeamento arquivo → tipo ──────────────────
const TIPO_MAP = {
  'auth.log':        'auth',
  'create.log':      'create',
  'deletarUser.log': 'delete',
  'updateUser.log':  'update',
  'impersonateUser.log':  'impersonate',
};

// ── Selecionar arquivo ─────────────────────────
document.querySelectorAll('.file-item').forEach(btn => {
  btn.addEventListener('click', () => {
    const file = btn.dataset.file;
    const tipo = btn.dataset.type;
    selecionarArquivo(file, tipo, btn);
  });
});

async function selecionarArquivo(file, tipo, btnEl) {
  // Atualiza UI da sidebar
  document.querySelectorAll('.file-item').forEach(b => b.classList.remove('active'));
  btnEl.classList.add('active');

  state.arquivoAtual = file;
  state.tipoAtual    = tipo;
  state.logSelecionadoId = null;

  await carregarLogs(file, tipo);
}

// ── Recarregar ─────────────────────────────────
document.getElementById('btnRefresh').addEventListener('click', () => {
  if (state.arquivoAtual) carregarLogs(state.arquivoAtual, state.tipoAtual);
});

// ── Carregar logs do backend ───────────────────
async function carregarLogs(file, tipo) {
  const refreshBtn = document.getElementById('btnRefresh');
  const liveLabel  = document.getElementById('liveLabel');
  const liveDot    = document.querySelector('.live-dot');

  refreshBtn.classList.add('spinning');
  liveLabel.textContent = 'carregando...';
  liveDot.classList.remove('active');

  try {
    const res  = await apiFetch(`${window.CONFIG.API_BASE_URL}api/logs/${file}`, {
      method: 'GET', credentials: 'include'
    });

    if (!res.ok) {
      mostrarErroLogs(`Erro ${res.status} ao buscar ${file}`);
      return;
    }

    // Backend devolve o conteúdo cru do arquivo (texto)
    const texto = await res.text();
    const logs  = parsearLogs(texto);

    state.logsOriginais = logs;

    // Atualiza contador na sidebar
    const countId = `count-${tipo}`;
    const countEl = document.getElementById(countId);
    if (countEl) countEl.textContent = logs.length;

    // Atualiza live indicator
    liveLabel.textContent = file;
    liveDot.classList.add('active');

    renderizarLogs();

  } catch (err) {
    console.error('[ATLAS] Erro ao carregar logs:', err);
    mostrarErroLogs('Erro de conexão ao buscar logs.');
  } finally {
    refreshBtn.classList.remove('spinning');
  }
}

// ── Parser: texto cru → array de objetos ──────
function parsearLogs(texto) {
  const linhas = texto.split('\n').map(l => l.trim()).filter(l => l.length > 0);
  const logs = [];
  for (const linha of linhas) {
    try {
      const obj = JSON.parse(linha);
      logs.push(obj);
    } catch {
      // Linha inválida — ignora
    }
  }
  return logs;
}

// ── Filtros ────────────────────────────────────
const filterInput = document.getElementById('filterText');
const filterClear = document.getElementById('filterClear');
const quickSearchBar = document.getElementById('quickSearchBar');
const quickFilterUser = document.getElementById('quickFilterUser');
const quickFilterIp = document.getElementById('quickFilterIp');
const quickFilterRegion = document.getElementById('quickFilterRegion');
const quickFilterClear = document.getElementById('quickFilterClear');

filterInput.addEventListener('input', () => {
  state.filtroTexto = filterInput.value.trim().toLowerCase();
  filterClear.classList.toggle('hidden', state.filtroTexto === '');
  renderizarLogs();
});

filterClear.addEventListener('click', () => {
  filterInput.value = '';
  state.filtroTexto = '';
  filterClear.classList.add('hidden');
  renderizarLogs();
});

quickFilterClear.addEventListener('click', () => {
  state.quickSearch.usuario = '';
  state.quickSearch.ip = '';
  state.quickSearch.regiao = '';
  renderQuickSearchUI();
  renderizarLogs();
});

// Chips de status
document.querySelectorAll('.chip').forEach(chip => {
  chip.addEventListener('click', () => {
    document.querySelectorAll('.chip').forEach(c => {
      c.classList.remove('chip--active', 'selected');
    });
    const status = chip.dataset.status;
    state.filtroStatus = status;

    if (status === 'all') {
      chip.classList.add('chip--active');
    } else {
      chip.classList.add('selected');
    }

    renderizarLogs();
  });
});

// Ordenação
document.getElementById('sortDesc').addEventListener('click', () => {
  state.ordemDesc = true;
  document.getElementById('sortDesc').classList.add('active');
  document.getElementById('sortAsc').classList.remove('active');
  renderizarLogs();
});
document.getElementById('sortAsc').addEventListener('click', () => {
  state.ordemDesc = false;
  document.getElementById('sortAsc').classList.add('active');
  document.getElementById('sortDesc').classList.remove('active');
  renderizarLogs();
});

// ── Aplicar filtros e renderizar ───────────────
function renderizarLogs() {
  const logArea = document.getElementById('logArea');
  logArea.innerHTML = '';

  let logs = [...state.logsOriginais];

  // Ordena
  logs.sort((a, b) => {
    const tA = a.utcBR || a.horario || '';
    const tB = b.utcBR || b.horario || '';
    return state.ordemDesc
      ? tB.localeCompare(tA)
      : tA.localeCompare(tB);
  });

  // Filtro de status
  if (state.filtroStatus !== 'all') {
    logs = logs.filter(log => {
      const s = (log.status || '').toLowerCase();
      return s === state.filtroStatus;
    });
  }

  // Filtro de texto — busca em qualquer campo
  const termoBusca = state.filtroTexto;
  if (termoBusca) {
    logs = logs.filter(log => {
      const jsonStr = JSON.stringify(log).toLowerCase();
      return jsonStr.includes(termoBusca);
    });
  }

  // QuickSearch por IP e Regiao (podem combinar entre si)
  if (state.quickSearch.usuario) {
    logs = logs.filter(log => {
      const usuario = getLogUsuario(log, state.tipoAtual).toLowerCase();
      return usuario === state.quickSearch.usuario;
    });
  }
  if (state.quickSearch.ip) {
    logs = logs.filter(log => {
      const ip = getLogIp(log, state.tipoAtual).toLowerCase();
      return ip === state.quickSearch.ip;
    });
  }
  if (state.quickSearch.regiao) {
    logs = logs.filter(log => {
      const regiao = getLogRegiao(log, state.tipoAtual).toLowerCase();
      return regiao === state.quickSearch.regiao;
    });
  }

  // Atualiza estatísticas
  atualizarStats(logs);

  const idsVisiveis = new Set(logs.map(log => getLogId(log, state.tipoAtual)));
  if (state.logSelecionadoId && !idsVisiveis.has(state.logSelecionadoId)) {
    state.logSelecionadoId = null;
  }

  if (logs.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'log-empty';
    empty.innerHTML = `
      <div class="log-empty-icon">
        <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
      </div>
      <p class="log-empty-title">Nenhum resultado</p>
      <p class="log-empty-sub">Nenhum log corresponde aos filtros aplicados. Tente ampliar a busca.</p>
    `;
    logArea.appendChild(empty);
    return;
  }

  // Renderiza cada log
  logs.forEach((log, i) => {
    const card = criarCardLog(log, i, state.tipoAtual, termoBusca);
    logArea.appendChild(card);
  });
}

// ── Estatísticas ───────────────────────────────
function atualizarStats(logs) {
  const total   = state.logsOriginais.length;
  const filtrado = logs.length;
  const sucesso = logs.filter(l => (l.status || '').toLowerCase() === 'sucesso').length;
  const falha   = logs.filter(l => (l.status || '').toLowerCase() === 'falha').length;

  document.getElementById('statTotal').textContent    = total;
  document.getElementById('statFiltered').textContent = filtrado;
  document.getElementById('statSuccess').textContent  = sucesso;
  document.getElementById('statFail').textContent     = falha;
}

// ── Criar card de log ──────────────────────────
function criarCardLog(log, index, tipo, termoBusca) {
  const card = document.createElement('div');
  card.className = 'log-card';
  card.style.setProperty('--i', Math.min(index, 20));
  const logId = getLogId(log, tipo);
  const quickTerms = getQuickSearchTerms();
  const highlightTerms = getHighlightTerms(termoBusca, quickTerms);
  const isSelected = state.logSelecionadoId === logId;

  const status  = (log.status || '').toLowerCase();
  const dotClass = status === 'sucesso' ? 'success' : status === 'falha' ? 'fail' : 'unknown';
  const hasMatch = highlightTerms.length > 0 && highlightTerms.some(termo =>
    JSON.stringify(log).toLowerCase().includes(termo)
  );
  if (hasMatch) card.classList.add('has-match');
  if (isSelected) card.classList.add('selected');
  if (state.logSelecionadoId && !isSelected) card.classList.add('dimmed');

  // Texto de resumo contextual por tipo
  const resumo = getResumoPrimario(log, tipo);
  const subInfo = getSubInfo(log, tipo);
  const quickBadgeHtml = getQuickBadgeHtml(log, tipo, quickTerms);

  card.innerHTML = `
    <div class="log-card-top">
      <span class="log-type-pill log-type-pill--${tipo}">${getTipoLabel(tipo)}</span>
      <span class="log-status-dot log-status-dot--${dotClass}"></span>
      <div class="log-summary">
        <span class="log-detail-text">${highlightByTerms(resumo, highlightTerms)}</span>
        ${subInfo ? `<span class="log-user-chip">${highlightByTerms(subInfo, highlightTerms)}</span>` : ''}
        ${quickBadgeHtml}
      </div>
      <span class="log-time">${formatarHorario(log.horario || log.utcBR)}</span>
      <svg class="log-chevron" xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
    </div>
    <div class="log-card-body">
      <div class="log-card-inner">
        ${renderizarCampos(log, tipo, highlightTerms, quickTerms)}
        ${renderizarChanges(log)}
        <button class="log-raw-toggle" onclick="toggleRaw(this)">
          <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>
          Ver JSON bruto
        </button>
        <pre class="log-raw">${escHtml(JSON.stringify(log, null, 2))}</pre>
      </div>
    </div>
  `;

  // Toggle expand
  card.querySelector('.log-card-top').addEventListener('click', () => {
    const jaSelecionado = state.logSelecionadoId === logId;
    const jaExpandido = card.classList.contains('expanded');

    if (jaSelecionado && jaExpandido) {
      limparFocoLogs();
      return;
    }

    state.logSelecionadoId = logId;
    atualizarSelecaoVisualLog(card, logId);

    const body = card.querySelector('.log-card-body');
    const shouldExpand = true;
    const area = card.parentElement;

    area?.querySelectorAll('.log-card.expanded').forEach(otherCard => {
      if (otherCard === card) return;
      otherCard.classList.remove('expanded');
      const otherBody = otherCard.querySelector('.log-card-body');
      if (otherBody) otherBody.style.maxHeight = '0px';
    });

    card.classList.toggle('expanded');
    body.style.maxHeight = shouldExpand ? `${body.scrollHeight}px` : '0px';
  });

  card.querySelectorAll('.quick-search-trigger').forEach(trigger => {
    trigger.addEventListener('click', (ev) => {
      ev.stopPropagation();
      ev.preventDefault();

      const tipoFiltro = trigger.dataset.quickType;
      const valor = (trigger.dataset.quickValue || '').trim().toLowerCase();
      if (!valor) return;

      if (tipoFiltro === 'ip') {
        state.quickSearch.ip = state.quickSearch.ip === valor ? '' : valor;
      }
      if (tipoFiltro === 'regiao') {
        state.quickSearch.regiao = state.quickSearch.regiao === valor ? '' : valor;
      }
      if (tipoFiltro === 'usuario') {
        state.quickSearch.usuario = state.quickSearch.usuario === valor ? '' : valor;
      }

      renderQuickSearchUI();
      renderizarLogs();
    });
  });

  return card;
}

// ── Renderizar campos formatados ───────────────
function renderizarCampos(log, tipo, termosHighlight, quickTerms) {
  const campos = [];
  const localFormatado = formatarLocalizacao(log, tipo);

  const add = (key, label, val) => {
    if (val === undefined || val === null || val === '') return;
    const valStr = String(val);
    const quickType = getQuickTypeByField(key);
    const quickValue = valStr.trim().toLowerCase();
    const quickAtivo = quickType && state.quickSearch[quickType] === quickValue;
    const valLower = valStr.toLowerCase();
    const temHighlight = termosHighlight.some(termo => valLower.includes(termo));
    const quickHit = quickTerms.some(termo => valLower.includes(termo));
    const classes = ['log-field-val'];
    if (temHighlight) classes.push('highlight');
    if (quickHit) classes.push('quick-hit');
    const valHtml = `<span class="${classes.join(' ')}">${highlightByTerms(valStr, termosHighlight)}</span>`;

    const quickBtn = quickType
      ? `
        <button class="quick-search-trigger ${quickAtivo ? 'active' : ''}" data-quick-type="${quickType}" data-quick-value="${escHtml(quickValue)}" title="QuickSearch por ${getQuickTypeLabel(quickType)}">
          <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
        </button>
      `
      : '';

    campos.push(`
      <div class="log-field">
        <span class="log-field-key">${label}</span>
        <div class="log-field-val-row">
          ${valHtml}
          ${quickBtn}
        </div>
      </div>
    `);
  };

  // Campos comuns
  add('status',   'Status',   log.status);
  add('detalhes', 'Detalhe',  log.detalhes);

  // Campos por tipo
  if (tipo === 'auth') {
    add('userUser', 'Usuário',  log.userUser);
    add('userId',   'User ID',  log.userId);
    add('email',    'E-mail',   log.email);
    add('ip',       'IP',       log.ip);
    add('location', 'LOCAL',    localFormatado);
  }

  if (tipo === 'create') {
    add('user',          'Usuário',    log.user);
    add('nome_completo', 'Nome',       log.nome_completo);
    add('email',         'E-mail',     log.email);
    add('obs',           'Obs',        log.obs);
    add('chaveCriar',    'ChaveCriar', log.chaveCriar);
    add('ip',            'IP',         log.ip);
    add('location',      'LOCAL',      localFormatado);
  }

  if (tipo === 'delete') {
    add('idAlvo', 'ID Alvo', log.idAlvo);
    add('Autor',  'Autor ID', log.Autor);
    add('ip',     'IP',       log.ip);
    add('location', 'LOCAL',  localFormatado);
  }

  if (tipo === 'update') {
    add('actor.id',  'Actor ID',  log.actor?.id);
    add('target.id', 'Target ID', log.target?.id);
    const ip = log.context?.ip;
    if (ip) add('ip', 'IP', ip);
    add('location', 'LOCAL', localFormatado);
  }

  if (tipo === 'impersonate') {
    add('idAlvo',   'ID Alvo',   log.idAlvo);
    add('ip',       'IP',        log.ip);
    add('location', 'LOCAL',     localFormatado);
  }

  // User agent (todos)
  const ua = log.userAgent || log.context?.userAgent;
  if (ua) add('userAgent', 'User Agent', ua);

  return `<div class="log-fields">${campos.join('')}</div>`;
}

// ── Renderizar diff de changes (update) ────────
function renderizarChanges(log) {
  if (!log.changes || !Array.isArray(log.changes) || log.changes.length === 0) return '';

  const rows = log.changes.map(c => `
    <div class="log-change-row">
      <span class="change-field">${escHtml(c.field)}</span>
      <span class="change-before">${escHtml(String(c.before))}</span>
      <span class="change-arrow">→</span>
      <span class="change-after">${escHtml(String(c.after))}</span>
    </div>
  `).join('');

  return `
    <div class="log-changes">
      <span class="log-field-key" style="margin-bottom:4px;">Alterações</span>
      ${rows}
    </div>
  `;
}

// ── Toggle JSON bruto ──────────────────────────
function toggleRaw(btn) {
  const pre = btn.nextElementSibling;
  pre.classList.toggle('visible');
  btn.childNodes[2].textContent = pre.classList.contains('visible')
    ? ' Ocultar JSON'
    : ' Ver JSON bruto';

  const card = btn.closest('.log-card');
  const body = card?.querySelector('.log-card-body');
  if (card && body && card.classList.contains('expanded')) {
    body.style.maxHeight = `${body.scrollHeight}px`;
  }
}

// ── Helpers de conteúdo ────────────────────────
function getTipoLabel(tipo) {
  return {
    auth:        'LOGIN',
    create:      'CRIAR',
    delete:      'DELETAR',
    update:      'UPDATE',
    impersonate: 'IMPERSONATE',
  }[tipo] || tipo.toUpperCase();
}

function getResumoPrimario(log, tipo) {
  if (tipo === 'auth')   return log.detalhes || log.type || '—';
  if (tipo === 'create') return log.detalhes || `Tentativa: ${log.user || '—'}`;
  if (tipo === 'delete') return log.detalhes || `ID alvo: ${log.idAlvo || '—'}`;
  if (tipo === 'update') return log.detalhes || log.type || '—';
  if (tipo === 'impersonate') return log.detalhes || `Alvo: ${log.idAlvo || '—'}`;
  return log.detalhes || '—';
}

function getSubInfo(log, tipo) {
  if (tipo === 'auth')   return log.userUser ? `@${log.userUser}` : null;
  if (tipo === 'create') return log.user ? `@${log.user}` : null;
  if (tipo === 'delete') return log.Autor ? `autor: ${log.Autor}` : null;
  if (tipo === 'update') return log.actor?.id ? `actor: ${log.actor.id}` : null;
  if (tipo === 'impersonate') return log.idAlvo ? `alvo: ${log.idAlvo}` : null;
  return null;
}

function formatarHorario(str) {
  if (!str) return '—';
  // Se vier no formato "22/04/2026, 05:53:30"
  if (str.includes('/')) return str;
  // Se vier no formato ISO
  try {
    return new Date(str).toLocaleString('pt-BR', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit', second: '2-digit'
    });
  } catch { return str; }
}

// ── Highlight de texto ─────────────────────────
function highlight(texto, termo) {
  if (!termo || !texto) return escHtml(String(texto || ''));
  const escaped = escHtml(String(texto));
  const termoEscaped = escHtml(termo);
  const regex = new RegExp(`(${termoEscaped.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
  return escaped.replace(regex, '<mark class="atlas-mark">$1</mark>');
}

function highlightByTerms(texto, termos = []) {
  if (texto === undefined || texto === null) return '';
  let html = escHtml(String(texto));
  const ordenados = [...new Set((termos || []).map(t => String(t).trim()).filter(Boolean))]
    .sort((a, b) => b.length - a.length);
  for (const termo of ordenados) {
    const escaped = escHtml(termo);
    const regex = new RegExp(`(${escaped.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    html = html.replace(regex, '<mark class="atlas-mark">$1</mark>');
  }
  return html;
}

function escHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function getQuickTypeByField(field) {
  const normalizado = String(field || '').toLowerCase();
  if (normalizado === 'user' || normalizado === 'useruser' || normalizado === 'autor' || normalizado === 'actor.id') {
    return 'usuario';
  }
  if (normalizado === 'ip') return 'ip';
  if (normalizado === 'location' || normalizado === 'local' || normalizado === 'regiao' || normalizado === 'região') {
    return 'regiao';
  }
  return null;
}

function getQuickTypeLabel(tipo) {
  if (tipo === 'usuario') return 'usuário';
  if (tipo === 'ip') return 'IP';
  if (tipo === 'regiao') return 'região';
  return tipo;
}

function getLogIp(log, tipo) {
  if (tipo === 'update') return String(log.context?.ip || '');
  return String(log.ip || '');
}

function getLogRegiao(log, tipo) {
  return formatarLocalizacao(log, tipo).toLowerCase();
}

function formatarLocalizacao(log, tipo) {
  const locationRaw = tipo === 'update'
    ? (log.context?.location ?? log.location ?? log.local ?? log.regiao ?? log.região)
    : (log.location ?? log.local ?? log.regiao ?? log.região);

  if (!locationRaw) return '';

  if (typeof locationRaw === 'string') {
    return locationRaw;
  }

  if (typeof locationRaw === 'object') {
    const pais = expandirNomePais(locationRaw.country || locationRaw.pais);
    const estado = expandirNomeEstadoBR(locationRaw.region || locationRaw.estado);
    const cidade = locationRaw.city || locationRaw.cidade;
    const partes = [pais, estado, cidade]
      .map(valor => String(valor || '').trim())
      .filter(Boolean);

    if (partes.length) {
      return partes.join(', ');
    }
  }

  return String(locationRaw);
}

function expandirNomePais(valor) {
  const codigo = String(valor || '').trim().toUpperCase();
  if (!codigo) return '';

  const PAISES = {
    BR: 'Brasil',
    US: 'Estados Unidos',
    AR: 'Argentina',
    UY: 'Uruguai',
    PY: 'Paraguai',
    CL: 'Chile',
    BO: 'Bolivia',
    PE: 'Peru',
    CO: 'Colombia',
    VE: 'Venezuela',
    EC: 'Equador',
    MX: 'Mexico',
    PT: 'Portugal',
    ES: 'Espanha',
    FR: 'Franca',
    DE: 'Alemanha',
    IT: 'Italia',
    GB: 'Reino Unido',
    CA: 'Canada',
    AU: 'Australia',
    JP: 'Japao',
    CN: 'China',
    IN: 'India',
  };

  return PAISES[codigo] || String(valor).trim();
}

function expandirNomeEstadoBR(valor) {
  const uf = String(valor || '').trim().toUpperCase();
  if (!uf) return '';

  const ESTADOS_BR = {
    AC: 'Acre',
    AL: 'Alagoas',
    AP: 'Amapa',
    AM: 'Amazonas',
    BA: 'Bahia',
    CE: 'Ceara',
    DF: 'Distrito Federal',
    ES: 'Espirito Santo',
    GO: 'Goias',
    MA: 'Maranhao',
    MT: 'Mato Grosso',
    MS: 'Mato Grosso do Sul',
    MG: 'Minas Gerais',
    PA: 'Para',
    PB: 'Paraiba',
    PR: 'Parana',
    PE: 'Pernambuco',
    PI: 'Piaui',
    RJ: 'Rio de Janeiro',
    RN: 'Rio Grande do Norte',
    RS: 'Rio Grande do Sul',
    RO: 'Rondonia',
    RR: 'Roraima',
    SC: 'Santa Catarina',
    SP: 'Sao Paulo',
    SE: 'Sergipe',
    TO: 'Tocantins',
  };

  return ESTADOS_BR[uf] || String(valor).trim();
}

function getLogUsuario(log, tipo) {
  if (tipo === 'auth') return String(log.userUser || '');
  if (tipo === 'create') return String(log.user || '');
  if (tipo === 'delete') return String(log.Autor || '');
  if (tipo === 'update') return String(log.actor?.id || '');
  if (tipo === 'impersonate') return String(log.Autor || log.actor?.id || '');
  return '';
}

function getLogId(log, tipo) {
  const horario = String(log.horario || log.utcBR || '');
  const status = String(log.status || '');
  const resumo = String(getResumoPrimario(log, tipo) || '');
  const json = JSON.stringify(log);
  return `${horario}|${status}|${resumo}|${json}`;
}

function getQuickSearchTerms() {
  return [state.quickSearch.usuario, state.quickSearch.ip, state.quickSearch.regiao]
    .map(v => String(v || '').trim().toLowerCase())
    .filter(Boolean);
}

function getHighlightTerms(termoBusca, quickTerms) {
  const termos = [];
  if (termoBusca) termos.push(String(termoBusca).trim().toLowerCase());
  termos.push(...quickTerms);
  return [...new Set(termos.filter(Boolean))];
}

function getQuickBadgeHtml(log, tipo, quickTerms) {
  if (!quickTerms.length) return '';
  const ip = getLogIp(log, tipo).toLowerCase();
  const regiao = getLogRegiao(log, tipo).toLowerCase();
  const usuario = getLogUsuario(log, tipo).toLowerCase();
  const bateUsuario = !!usuario && quickTerms.includes(usuario);
  const bateIp = !!ip && quickTerms.includes(ip);
  const bateRegiao = !!regiao && quickTerms.includes(regiao);
  if (!bateUsuario && !bateIp && !bateRegiao) return '';

  const badges = [];
  if (bateUsuario) badges.push('<span class="log-match-badge">match usuario</span>');
  if (bateIp) badges.push('<span class="log-match-badge">match IP</span>');
  if (bateRegiao) badges.push('<span class="log-match-badge">match regiao</span>');
  return badges.join('');
}

function atualizarSelecaoVisualLog(cardAtual, logId) {
  const area = cardAtual.parentElement;
  if (!area) return;

  area.querySelectorAll('.log-card').forEach(card => {
    const isSelected = card === cardAtual;
    card.classList.toggle('selected', isSelected);
    card.classList.toggle('dimmed', !isSelected && !!logId);
  });
}

function renderQuickSearchUI() {
  const usuarioAtivo = !!state.quickSearch.usuario;
  const ipAtivo = !!state.quickSearch.ip;
  const regiaoAtiva = !!state.quickSearch.regiao;
  const hasAny = usuarioAtivo || ipAtivo || regiaoAtiva;

  quickSearchBar.classList.toggle('hidden', !hasAny);

  quickFilterUser.classList.toggle('hidden', !usuarioAtivo);
  quickFilterIp.classList.toggle('hidden', !ipAtivo);
  quickFilterRegion.classList.toggle('hidden', !regiaoAtiva);

  quickFilterUser.textContent = usuarioAtivo ? `Usuario: ${state.quickSearch.usuario}` : '';
  quickFilterIp.textContent = ipAtivo ? `IP: ${state.quickSearch.ip}` : '';
  quickFilterRegion.textContent = regiaoAtiva ? `Regiao: ${state.quickSearch.regiao}` : '';
}

function limparFocoLogs() {
  state.logSelecionadoId = null;
  document.querySelectorAll('.log-card.selected, .log-card.dimmed, .log-card.expanded').forEach(card => {
    card.classList.remove('selected', 'dimmed', 'expanded');
    const body = card.querySelector('.log-card-body');
    if (body) body.style.maxHeight = '0px';
  });
}

document.addEventListener('click', (ev) => {
  const clickedInsideCard = ev.target.closest('.log-card');
  if (clickedInsideCard) return;
  limparFocoLogs();
});

renderQuickSearchUI();

// ── Estado vazio / erro ────────────────────────
function mostrarErroLogs(msg) {
  const logArea = document.getElementById('logArea');
  logArea.innerHTML = `
    <div class="log-empty">
      <div class="log-empty-icon">
        <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
      </div>
      <p class="log-empty-title">Erro ao carregar</p>
      <p class="log-empty-sub">${escHtml(msg)}</p>
    </div>
  `;
  document.getElementById('liveLabel').textContent = 'erro';
  document.querySelector('.live-dot').classList.remove('active');
}