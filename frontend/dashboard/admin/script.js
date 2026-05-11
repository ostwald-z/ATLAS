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
// ATLAS — Admin Dashboard | script.js
// ══════════════════════════════════════════════

// ── Dark Mode ──────────────────────────────────
(function iniciaDarkMode() {
  const saved = localStorage.getItem('atlasTheme') || 'light';
  document.documentElement.setAttribute('data-theme', saved);
  atualizarIconeTema();
})();

function atualizarIconeTema() {
  const btn  = document.getElementById('themeToggle');
  const icon = document.getElementById('themeIcon');
  if (!btn || !icon) return;
  const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
  // Ícone sol (light) ou lua (dark)
  icon.innerHTML = isDark
    ? '<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>'
    : '<circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>';
  btn.title = isDark ? 'Modo claro' : 'Modo escuro';
}

document.getElementById('themeToggle').addEventListener('click', () => {
  const next = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', next);
  localStorage.setItem('atlasTheme', next);
  atualizarIconeTema();
});

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
  }
});

// ── Auth Check + Carregar Usuário ──────────────
(async function checkAuth() {
  try {
    const res = await apiFetch(`${window.CONFIG.API_BASE_URL}api/user/apicheck`, {
      method: 'GET',
      credentials: 'include'
    });
    if (!res.ok) {
      window.location.href = '../../painelDeLogin/login/index.html';
      return;
    }
    const data = await res.json();
    preencherUI(data);
  } catch (err) {
    console.error('[ATLAS] Erro na verificação de token:', err);
    window.location.href = '../../painelDeLogin/login/index.html';
  }
})();

function preencherUI(user) {
  if (!user) return;
  const displayName = user.name || 'admin';
  const initials    = getInitials(displayName);
  const userId      = user.user ? `@${user.user}` : `ID: ${user.user}`;

  // Saudação
  const greeting = document.getElementById('greetingName');
  if (greeting) greeting.textContent = displayName;

  // Avatar header
  const av = document.getElementById('profileAvatar');
  if (av) av.textContent = initials;

  // Dropdown
  const dAv = document.getElementById('dropdownAvatar');
  const dId = document.getElementById('dropdownId');
  if (dAv) dAv.textContent = initials;
  if (dId) dId.textContent = userId;
}

function getInitials(name) {
  if (!name) return '?';
  const parts = name.trim().split(/[\s_\-]+/);
  if (parts.length === 1) return parts[0][0].toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

// ── Logout ─────────────────────────────────────
const btnLogout = document.getElementById('btnLogout');
if (btnLogout) {
  btnLogout.addEventListener('click', async () => {
    try {
      await apiFetchh(`${window.CONFIG.API_BASE_URL}api/user/logout`, {
        method: 'POST',
      });
    } catch { /* ignora */ } finally {
      window.location.href = '../../painelDeLogin/login/index.html';
    }
  });
}