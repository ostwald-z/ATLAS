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
// ATLAS — User Dashboard | script.js
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

// ── Auth Check + Carregar Usuário ──────────────
async function checkAuth() {
  try {
    const res = await apiFetch(`${window.CONFIG.API_BASE_URL}api/user/apicheck`, {
      method: 'GET',
    });

    if (!res.ok) {
      window.location.href = '../../painelDeLogin/login/index.html';
      return;
    }

    const data = await res.json();
    console.log('Usuário autenticado:', data.user);

    preencherUI(data);

  } catch (err) {
    console.error('[ATLAS] Erro na verificação de token:', err);
    window.location.href = '../../painelDeLogin/login/index.html';
  }
};

// ── Preencher UI com dados do usuário ──────────
function preencherUI(user) {
  if (!user) return;

  const displayName = user.name || user.username || 'Usuário';
  const initials    = getInitials(displayName);
  const userId      = user.username ? `@${user.username}` : `ID: ${user.user}`;

  // Saudação
  const greetingName = document.getElementById('greetingName');
  if (greetingName) greetingName.textContent = displayName;

  // Avatar header
  const profileAvatar = document.getElementById('profileAvatar');
  if (profileAvatar) profileAvatar.textContent = initials;

  // Dropdown
  const dropdownAvatar = document.getElementById('dropdownAvatar');
  const dropdownName   = document.getElementById('dropdownName');
  const dropdownId     = document.getElementById('dropdownId');

  if (dropdownAvatar) dropdownAvatar.textContent = initials;
  if (dropdownName)   dropdownName.textContent   = displayName;
  if (dropdownId)     dropdownId.textContent     = userId;
}

// ── Utilitário: iniciais do nome ───────────────
function getInitials(name) {
  if (!name) return '?';
  const parts = name.trim().split(' ');
  if (parts.length === 1) return parts[0][0].toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

// ── Profile Dropdown ───────────────────────────
const profileBtn      = document.getElementById('profileBtn');
const profileDropdown = document.getElementById('profileDropdown');

profileBtn.addEventListener('click', (e) => {
  e.stopPropagation();
  const isOpen = profileDropdown.classList.contains('is-open');
  profileDropdown.classList.toggle('is-open', !isOpen);
  profileBtn.setAttribute('aria-expanded', String(!isOpen));
  profileDropdown.setAttribute('aria-hidden', String(isOpen));
});

document.addEventListener('click', (e) => {
  if (!profileBtn.contains(e.target) && !profileDropdown.contains(e.target)) {
    profileDropdown.classList.remove('is-open');
    profileBtn.setAttribute('aria-expanded', 'false');
    profileDropdown.setAttribute('aria-hidden', 'true');
  }
});

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    profileDropdown.classList.remove('is-open');
    profileBtn.setAttribute('aria-expanded', 'false');
    profileDropdown.setAttribute('aria-hidden', 'true');
  }
});

// ── Logout ─────────────────────────────────────
const btnLogout = document.getElementById('btnLogout');
if (btnLogout) {
  btnLogout.addEventListener('click', async () => {
    try {
      await apiFetch(`${window.CONFIG.API_BASE_URL}api/user/logout`, {
        method: 'POST',
      });
    } catch (err) {
      console.error('[ATLAS] Erro ao fazer logout:', err);
    } finally {
      window.location.href = '../../painelDeLogin/login/index.html';
    }
  });
}
