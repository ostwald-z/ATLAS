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
    const res = await fetch(`${window.CONFIG.API_BASE_URL}api/user/apicheck`, {
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
  filtroTexto:    '',
  filtroStatus:   'all',    // 'all' | 'sucesso' | 'falha'
  ordemDesc:      true,
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
    const res  = await fetch(`${window.CONFIG.API_BASE_URL}api/logs/${file}`, {
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

  // Atualiza estatísticas
  atualizarStats(logs);

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

  const status  = (log.status || '').toLowerCase();
  const dotClass = status === 'sucesso' ? 'success' : status === 'falha' ? 'fail' : 'unknown';
  const hasMatch = termoBusca && JSON.stringify(log).toLowerCase().includes(termoBusca);
  if (hasMatch) card.classList.add('has-match');

  // Texto de resumo contextual por tipo
  const resumo = getResumoPrimario(log, tipo);
  const subInfo = getSubInfo(log, tipo);

  card.innerHTML = `
    <div class="log-card-top">
      <span class="log-type-pill log-type-pill--${tipo}">${getTipoLabel(tipo)}</span>
      <span class="log-status-dot log-status-dot--${dotClass}"></span>
      <div class="log-summary">
        <span class="log-detail-text">${highlight(resumo, termoBusca)}</span>
        ${subInfo ? `<span class="log-user-chip">${highlight(subInfo, termoBusca)}</span>` : ''}
      </div>
      <span class="log-time">${formatarHorario(log.horario || log.utcBR)}</span>
      <svg class="log-chevron" xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
    </div>
    <div class="log-card-body">
      <div class="log-card-inner">
        ${renderizarCampos(log, tipo, termoBusca)}
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
    card.classList.toggle('expanded');
  });

  return card;
}

// ── Renderizar campos formatados ───────────────
function renderizarCampos(log, tipo, termo) {
  const campos = [];

  const add = (key, label, val) => {
    if (val === undefined || val === null || val === '') return;
    const valStr = String(val);
    const valHtml = termo && valStr.toLowerCase().includes(termo)
      ? `<span class="log-field-val highlight">${highlight(valStr, termo)}</span>`
      : `<span class="log-field-val">${escHtml(valStr)}</span>`;
    campos.push(`
      <div class="log-field">
        <span class="log-field-key">${label}</span>
        ${valHtml}
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
    add('location', 'Local',    log.location);
  }

  if (tipo === 'create') {
    add('user',          'Usuário',    log.user);
    add('nome_completo', 'Nome',       log.nome_completo);
    add('email',         'E-mail',     log.email);
    add('obs',           'Obs',        log.obs);
    add('chaveCriar',    'ChaveCriar', log.chaveCriar);
    add('ip',            'IP',         log.ip);
  }

  if (tipo === 'delete') {
    add('idAlvo', 'ID Alvo', log.idAlvo);
    add('Autor',  'Autor ID', log.Autor);
    add('ip',     'IP',       log.ip);
  }

  if (tipo === 'update') {
    add('actor.id',  'Actor ID',  log.actor?.id);
    add('target.id', 'Target ID', log.target?.id);
    const ip = log.context?.ip;
    if (ip) add('ip', 'IP', ip);
  }

  if (tipo === 'impersonate') {
    add('idAlvo',   'ID Alvo',   log.idAlvo);
    add('ip',       'IP',        log.ip);
    add('location', 'Local',     log.location);
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

function escHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

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