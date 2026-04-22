// ══════════════════════════════════════════════
// ATLAS — Pedidos Pendentes | script.js
// ══════════════════════════════════════════════

// ── Dark Mode ──────────────────────────────────
(function iniciaDarkMode() {
  const saved = localStorage.getItem('atlasTheme') || 'light';
  document.documentElement.setAttribute('data-theme', saved);
  atualizarIconeDarkMode();
})();

function atualizarIconeDarkMode() {
  const btn = document.getElementById('darkModeToggle');
  if (!btn) return;
  const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
  btn.textContent = isDark ? '☀️' : '🌙';
  btn.title = isDark ? 'Modo claro' : 'Modo escuro';
}

document.getElementById('darkModeToggle').addEventListener('click', () => {
  const current = document.documentElement.getAttribute('data-theme');
  const next = current === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', next);
  localStorage.setItem('atlasTheme', next);
  atualizarIconeDarkMode();
});

// ── Auth Check ─────────────────────────────────
(async function checkAuth() {
  try {
    const res = await fetch(`${window.CONFIG.API_BASE_URL}api/user/apicheck`, {
      method: 'GET',
      credentials: 'include'
    });
    if (!res.ok) {
      window.location.href = '../../../painelDeLogin/login/index.html';
      return;
    }
    const data = await res.json();
    console.log('Usuário autenticado:', data.user);
  } catch (err) {
    console.error('[ATLAS] Erro na verificação de token:', err);
    window.location.href = '../../../painelDeLogin/login/index.html';
  }
})();

// ── Carregar pedidos ───────────────────────────
document.getElementById('reload').addEventListener('click', carregarPedidos);

async function carregarPedidos() {
  const btn  = document.getElementById('reload');
  const list = document.getElementById('requestsList');
  const empty = document.getElementById('emptyState');

  btn.classList.add('loading');
  list.innerHTML = '';
  empty.classList.add('hidden');

  try {
    const res  = await fetch(`${window.CONFIG.API_BASE_URL}api/gatekeeper`, {
      method: 'GET',
      credentials: 'include'
    });
    const data = await res.json();

    if (!res.ok) {
      mostrarEmptyState('Erro ao carregar', data.erro || 'Não foi possível buscar os pedidos.');
      return;
    }

    const pedidos = data.resultado;

    // Atualiza contador
    const countBadge = document.getElementById('countBadge');
    countBadge.innerHTML = pedidos.length > 0
      ? `<span>${pedidos.length}</span> pedido${pedidos.length !== 1 ? 's' : ''} pendente${pedidos.length !== 1 ? 's' : ''}`
      : '— pedidos';

    if (pedidos.length === 0) {
      mostrarEmptyState('Nenhum pedido pendente', 'Tudo certo por aqui. Não há solicitações aguardando revisão.');
      return;
    }

    pedidos.forEach((pedido, i) => {
      const card = criarCard(pedido, i);
      list.appendChild(card);
    });

  } catch (err) {
    console.error('[ATLAS] Erro:', err);
    mostrarEmptyState('Erro de conexão', 'Verifique a conexão e tente novamente.');
  } finally {
    btn.classList.remove('loading');
  }
}

// ── Criar card de pedido ───────────────────────
function criarCard(pedido, index) {
  const card = document.createElement('div');
  card.className = 'request-card';
  card.style.setProperty('--i', index);
  card.dataset.id = pedido.id;

  const initials = getInitials(pedido.user);

  card.innerHTML = `
    <div class="card-header">
      <div class="card-avatar">${initials}</div>
      <div class="card-info">
        <div class="card-name">${escHtml(pedido.user)}</div>
        <div class="card-meta">
          <span class="card-email">${escHtml(pedido.email)}</span>
          <span class="card-id">#${escHtml(String(pedido.id))}</span>
        </div>
      </div>
      <span class="card-date">${formatarData(pedido.DATA)}</span>
      <svg class="card-chevron" xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
    </div>

    <div class="card-body">
      <div class="card-body-inner">

        <div class="card-fields">
          <div class="card-field">
            <span class="card-field-label">ID</span>
            <input class="card-field-input" type="text" value="${escHtml(String(pedido.id))}" disabled />
          </div>
          <div class="card-field">
            <span class="card-field-label">Data</span>
            <input class="card-field-input" type="text" value="${escHtml(pedido.DATA)}" disabled />
          </div>
      
          <div class="card-field">
            <span class="card-field-label">Nome E Sobrenome</span>
            <input class="card-field-input js-field-nome-completo" type="text" value="${escHtml(pedido.nome_completo)}" />
          </div>

          <div class="card-field">
            <span class="card-field-label">Usuário</span>
            <input class="card-field-input js-field-nome" type="text" value="${escHtml(pedido.user)}" />
          </div>
          <div class="card-field">
            <span class="card-field-label">E-mail</span>
            <input class="card-field-input js-field-email" type="email" value="${escHtml(pedido.email)}" />
          </div>
          <div class="card-field">
            <span class="card-field-label">Privilégio</span>
            <input class="card-field-input js-field-role" type="text" value="" placeholder="Carregando..." />
          </div>
          <div class="card-field card-field--full">
            <span class="card-field-label">Observações</span>
            <textarea class="card-field-input card-field-textarea js-field-obs" placeholder="Sem observações"></textarea>
          </div>
        </div>

        <div class="card-feedback js-feedback"></div>

        <div class="card-actions">
          <button class="btn-action btn-action--approve js-btn-aprovar">
            <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
            Aprovar
          </button>
          <button class="btn-action btn-action--edit js-btn-editar">
            <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
            Salvar edição
          </button>
          <button class="btn-action btn-action--reject js-btn-recusar">
            <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            Recusar
          </button>
        </div>

      </div>
    </div>
  `;

  // Toggle expand ao clicar no header
  card.querySelector('.card-header').addEventListener('click', () => {
    const isOpen = card.classList.contains('is-open');
    // Fecha todos
    document.querySelectorAll('.request-card.is-open').forEach(c => c.classList.remove('is-open'));
    if (!isOpen) {
      card.classList.add('is-open');
      // Carrega detalhes se ainda não carregou
      if (!card.dataset.loaded) carregarDetalhes(card, pedido.id);
    }
  });

  // Botões de ação
  card.querySelector('.js-btn-aprovar').addEventListener('click', (e) => {
    e.stopPropagation();
    aprovar(card, pedido.id);
  });
  card.querySelector('.js-btn-recusar').addEventListener('click', (e) => {
    e.stopPropagation();
    recusar(card, pedido.id);
  });
  card.querySelector('.js-btn-editar').addEventListener('click', (e) => {
    e.stopPropagation();
    editar(card, pedido.id);
  });

  return card;
}

// ── Carregar detalhes do pedido ────────────────
async function carregarDetalhes(card, id) {
  try {
    const res  = await fetch(`${window.CONFIG.API_BASE_URL}api/gatekeeper/${id}`, {
      method: 'GET',
      credentials: 'include'
    });
    const data = await res.json();
    if (!res.ok || !data.resultado?.[0]) return;

    const detalhe = data.resultado[0];
    card.querySelector('.js-field-role').value = detalhe.role || '';
    card.querySelector('.js-field-obs').value  = detalhe.obs  || '';
    card.dataset.loaded = 'true';
  } catch (err) {
    console.error('[ATLAS] Erro ao carregar detalhes:', err);
  }
}

// ── Aprovar ────────────────────────────────────
async function aprovar(card, id) {
  setCardLoading(card, true);
  try {
    const res  = await fetch(`${window.CONFIG.API_BASE_URL}api/gatekeeper/${id}`, {
      method: 'POST',
      credentials: 'include'
    });
    const data = await res.json();
    if (res.ok) {
      mostrarFeedbackCard(card, 'success', `✓ ${data.message || 'Pedido aprovado!'}`);
      setTimeout(() => removerCard(card), 1800);
    } else {
      mostrarFeedbackCard(card, 'error', `✗ ${data.erro || 'Erro ao aprovar.'}`);
    }
  } catch (err) {
    mostrarFeedbackCard(card, 'error', '✗ Erro de conexão.');
  } finally {
    setCardLoading(card, false);
  }
}

// ── Recusar ────────────────────────────────────
async function recusar(card, id) {
  setCardLoading(card, true);
  try {
    const res  = await fetch(`${window.CONFIG.API_BASE_URL}api/gatekeeper/${id}`, {
      method: 'DELETE',
      credentials: 'include'
    });
    const data = await res.json();
    if (res.ok) {
      mostrarFeedbackCard(card, 'success', `✓ ${data.message || 'Pedido recusado.'}`);
      setTimeout(() => removerCard(card), 1800);
    } else {
      mostrarFeedbackCard(card, 'error', `✗ ${data.erro || 'Erro ao recusar.'}`);
    }
  } catch (err) {
    mostrarFeedbackCard(card, 'error', '✗ Erro de conexão.');
  } finally {
    setCardLoading(card, false);
  }
}

// ── Editar ─────────────────────────────────────
async function editar(card, id) {
  setCardLoading(card, true);
  const user  = card.querySelector('.js-field-nome').value.trim();
  const email = card.querySelector('.js-field-email').value.trim();
  const role  = card.querySelector('.js-field-role').value.trim();
  const obs   = card.querySelector('.js-field-obs').value.trim();
  const nome_completo = card.querySelector('.js-field-nome-completo').value.trim();

  try {
    const res  = await fetch(`${window.CONFIG.API_BASE_URL}api/gatekeeper/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ user, email, role, obs, nome_completo })
    });
    const data = await res.json();
    if (res.ok) {
      mostrarFeedbackCard(card, 'success', `✓ ${data.message}`);
      // Atualiza o nome no header do card
      card.querySelector('.card-name').textContent = user;
      card.querySelector('.card-email').textContent = email;
      card.querySelector('.card-avatar').textContent = getInitials(user);
    } else {
      mostrarFeedbackCard(card, 'error', `✗ ${data.erro || 'Erro ao editar.'}`);
    }
  } catch (err) {
    mostrarFeedbackCard(card, 'error', '✗ Erro de conexão.');
  } finally {
    setCardLoading(card, false);
  }
}

// ── Remover card com animação ──────────────────
function removerCard(card) {
  card.style.transition = 'opacity 0.4s ease, transform 0.4s ease, max-height 0.4s ease';
  card.style.opacity = '0';
  card.style.transform = 'translateX(16px)';
  card.style.maxHeight = card.offsetHeight + 'px';
  setTimeout(() => {
    card.style.maxHeight = '0';
    card.style.marginBottom = '0';
    card.style.paddingBottom = '0';
  }, 50);
  setTimeout(() => {
    card.remove();
    atualizarContador();
  }, 450);
}

function atualizarContador() {
  const total = document.querySelectorAll('.request-card').length;
  const badge = document.getElementById('countBadge');
  if (total === 0) {
    badge.innerHTML = '— pedidos';
    mostrarEmptyState('Tudo revisado!', 'Não há mais pedidos pendentes por agora.');
  } else {
    badge.innerHTML = `<span>${total}</span> pedido${total !== 1 ? 's' : ''} pendente${total !== 1 ? 's' : ''}`;
  }
}

// ── UI Helpers ─────────────────────────────────
function setCardLoading(card, on) {
  card.querySelectorAll('.btn-action').forEach(b => b.disabled = on);
}



function mostrarFeedbackCard(card, tipo, msg) {
  // 🔥 REMOVE TODOS os feedbacks existentes (garantia total)
  card.querySelectorAll('.js-feedback').forEach(el => {
    if (el._timeout) clearTimeout(el._timeout);
    el.remove();
  });

  // 🔥 cria UM único feedback novo
  const el = document.createElement('div');
  el.className = `card-feedback js-feedback is-${tipo}`;
  el.textContent = msg;

  card.querySelector('.card-body-inner')?.appendChild(el);

  // 🔥 auto-remove se for sucesso
  if (tipo === 'success') {
    el._timeout = setTimeout(() => {
      el.remove();
    }, 3000);
  }

  if (tipo === 'error') {
    el._timeout = setTimeout(() => {
      el.remove();
    }, 4000);
  }

}



function mostrarEmptyState(titulo, sub) {
  const empty = document.getElementById('emptyState');
  document.getElementById('emptyTitle').textContent = titulo;
  document.getElementById('emptySub').textContent   = sub;
  empty.classList.remove('hidden');
}

function getInitials(name) {
  if (!name) return '?';
  const parts = name.trim().split(/[\s_\-]+/);
  if (parts.length === 1) return parts[0][0].toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function formatarData(dataStr) {
  if (!dataStr) return '—';
  try {
    return new Date(dataStr).toLocaleDateString('pt-BR', {
      day: '2-digit', month: 'short', year: 'numeric'
    });
  } catch { return dataStr; }
}

function escHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}