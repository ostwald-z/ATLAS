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
// ATLAS — Editar Perfil | script.js
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

// ── Estado do usuário carregado ────────────────
let usuarioAtual = null;
let usuarioAtualID = null;




// ── Auth Check + Carregar Dados ────────────────
(async function checkAuth() {
  try {
    const res = await apiFetch(`${window.CONFIG.API_BASE_URL}api/user/apicheck`, {
      method: 'GET',
    });

    if (!res.ok) {
      window.location.href = '../../painelDeLogin/login/index.html';
      return;
    }

    const data = await res.json();
    usuarioAtual = data;
    usuarioAtualID = data.user;
    preencherFormulario(data);

  } catch (err) {
    console.error('[ATLAS] Erro na verificação de token:', err);
    window.location.href = '../../painelDeLogin/login/index.html';
  }
})();

// ── Preencher formulário com dados vindos da API ─
function preencherFormulario(user) {
  if (!user) return;

  // ID (somente leitura)
  const displayId = document.getElementById('displayId');
  if (displayId) {
    displayId.textContent = user.user || '—';
  }

  // Campos editáveis — guarda o valor original nos inputs
  setValue('inputName',     user.name     || '');
  setValue('inputUsername', user.username || '');
  setValue('inputEmail',    user.email    || '');
  setValue('inputObs',      user.obs      || '');
  // Senha sempre vazia (intencional)

  // Role
  setRole(user.role_user || 'user');
}

function setValue(id, value) {
  const el = document.getElementById(id);
  if (el) {
    el.value = value;
    el.dataset.original = value; // guarda original para comparação
  }
}

// ── Role Selector ──────────────────────────────
let roleSelecionado = 'user';

function setRole(role) {
  roleSelecionado = role;
  document.querySelectorAll('.role-option').forEach(btn => {
    btn.classList.toggle('role-option--active', btn.dataset.role === role);
  });
}

document.querySelectorAll('.role-option').forEach(btn => {
  btn.addEventListener('click', () => setRole(btn.dataset.role));
});

// ── Toggle senha visível ───────────────────────
document.getElementById('togglePassword').addEventListener('click', () => {
  const input = document.getElementById('inputPassword');
  const icon  = document.getElementById('eyeIcon');
  const isText = input.type === 'text';
  input.type = isText ? 'password' : 'text';
  // Troca ícone olho aberto / fechado
  icon.innerHTML = isText
    ? '<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>'
    : '<path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/>';
});

// ── Salvar alterações ──────────────────────────
document.getElementById('btnSave').addEventListener('click', async () => {
  if (!usuarioAtual) return;

  const payload = montarPayload();

  // UX: Se o objeto estiver vazio, nada mudou
  if (Object.keys(payload).length === 0) {
    mostrarFeedback('info', 'ℹ Nenhuma alteração foi feita.');
    return;
  }

  setLoading(true);
  esconderFeedback();

  try {
    const res = await apiFetch(`${window.CONFIG.API_BASE_URL}api/user/${usuarioAtualID}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (res.ok) {
      mostrarFeedback('success', '✓ Alterações aplicadas com sucesso!');
      
      // Atualiza os estados originais para o próximo salvamento
      ['inputName', 'inputUsername', 'inputEmail', 'inputObs'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.dataset.original = el.value;
      });
      
      // Atualiza a role no objeto de referência
      usuarioAtual.role_user = roleSelecionado;
      
      // Limpa o campo de senha por segurança
      document.getElementById('inputPassword').value = '';
      
    } else {
      const err = await res.json();
      mostrarFeedback('error', `✗ ${err.erro || 'Erro ao salvar alterações.'}`);
    }

  } catch (err) {
    console.error('[ATLAS] Erro ao salvar:', err);
    mostrarFeedback('error', '✗ Erro de conexão. Tente novamente.');
  } finally {
    setLoading(false);
  }
});

// ── Montar payload — envia só o que mudou, resto vazio ──
function montarPayload() {
  const campos = [
    { chave: 'nome_completo', id: 'inputName'     },
    { chave: 'user',          id: 'inputUsername' },
    { chave: 'email',         id: 'inputEmail'    },
    { chave: 'obs',           id: 'inputObs'      },
  ];

  const payload = {};

  campos.forEach(({ chave, id }) => {
    const el = document.getElementById(id);
    if (!el) return;
    
    const atual    = el.value.trim();
    const original = (el.dataset.original || '').trim();

    // SÓ adiciona ao payload se houver mudança real
    if (atual !== original) {
      payload[chave] = atual;
    }
  });

  // Senha: só inclui se o usuário digitou algo (mínimo de segurança/lógica)
  const senha = document.getElementById('inputPassword').value;
  if (senha.length > 0) {
    payload.senha = senha;
  }

  // Role: compara com a role que veio da API no checkAuth
  if (roleSelecionado !== usuarioAtual.role_user) {
    payload.roleEdit = roleSelecionado;
  }

  return payload;
}



// ── UI Helpers ─────────────────────────────────
function setLoading(on) {
  const btn     = document.getElementById('btnSave');
  const label   = document.getElementById('btnSaveLabel');
  const spinner = document.getElementById('btnSaveSpinner');
  btn.disabled = on;
  label.textContent = on ? 'Salvando...' : 'Aplicar alterações';
  spinner.classList.toggle('hidden', !on);
}

function mostrarFeedback(tipo, msg) {
  const el = document.getElementById('formFeedback');
  el.textContent = msg;
  el.className = `form-feedback is-${tipo}`;
  // Auto-esconde sucesso após 4s
  if (tipo === 'success') {
    setTimeout(() => esconderFeedback(), 4000);
  }
}

function esconderFeedback() {
  const el = document.getElementById('formFeedback');
  el.className = 'form-feedback';
  el.textContent = '';
}