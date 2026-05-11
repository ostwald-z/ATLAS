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



// ══════════════════════════════════════════
// 1. VERIFICAÇÃO DE LOGIN
// ══════════════════════════════════════════
(async function checkAuth() {
  try {
    const res = await apiFetch(`${window.CONFIG.API_BASE_URL}api/user/apicheck`, {
      method: 'GET',
      credentials: 'include'
    });
    if (!res.ok) {
      redirectToLogin()
      //window.location.href = '../../../painelDeLogin/login/index.html';
      return;
    }
  } catch (err) {
    redirectToLogin(); 
    //window.location.href = '../../../painelDeLogin/login/index.html';
  }
})();

// ══════════════════════════════════════════
// 2. TEMA E HEADER (Herdado do Dashboard)
// ══════════════════════════════════════════
const html = document.documentElement;
const themeToggle = document.getElementById('themeToggle');
const themeIcon   = document.getElementById('themeIcon');

const ICON_LIGHT = `<circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>`;
const ICON_DARK  = `<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>`;

const savedTheme = localStorage.getItem('atlasTheme') || 'light';
html.setAttribute('data-theme', savedTheme);
themeIcon.innerHTML = savedTheme === 'dark' ? ICON_LIGHT : ICON_DARK;

themeToggle.addEventListener('click', () => {
  const next = html.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
  html.setAttribute('data-theme', next);
  localStorage.setItem('atlasTheme', next);
  themeIcon.innerHTML = next === 'dark' ? ICON_LIGHT : ICON_DARK;
});

// Dropdown Perfil
const profileBtn      = document.getElementById('profileBtn');
const profileDropdown = document.getElementById('profileDropdown');

profileBtn.addEventListener('click', (e) => {
  e.stopPropagation();
  const isOpen = profileDropdown.classList.contains('open');
  profileDropdown.classList.toggle('open', !isOpen);
  profileBtn.setAttribute('aria-expanded', String(!isOpen));
  profileDropdown.setAttribute('aria-hidden', String(isOpen));
});
document.addEventListener('click', () => {
  profileDropdown.classList.remove('open');
  profileBtn.setAttribute('aria-expanded', 'false');
  profileDropdown.setAttribute('aria-hidden', 'true');
});
profileDropdown.addEventListener('click', (e) => e.stopPropagation());

// Buscar Info do Admin
async function loadUserInfo() {
  try {
    const res = await apiFetch(`${window.CONFIG.API_BASE_URL}api/user/apicheck`, { method: 'GET', credentials: 'include' });
    if (!res.ok) throw new Error();
    const data = await res.json();
    const id = data.id || data.user || data._id || '—';
    const initials = String(id).slice(0, 2).toUpperCase();
    document.getElementById('profileAvatar').textContent  = initials;
    document.getElementById('dropdownAvatar').textContent = initials;
    document.getElementById('dropdownId').textContent     = `ID: ${id}`;
  } catch {
    document.getElementById('dropdownId').textContent = 'Admin';
  }
}


loadUserInfo();

// Logout
document.getElementById('btnLogout').addEventListener('click', async () => {
  try { await apiFetch(`${window.CONFIG.API_BASE_URL}api/user/logout`, { method: 'POST', credentials: 'include' }); } catch {}
  window.location.href = '../../../painelDeLogin/login/index.html';
});


// ══════════════════════════════════════════
// 3. SISTEMA DE NOTIFICAÇÕES (Toasts)
// ══════════════════════════════════════════
function showToast(message, type = 'success') {
  const container = document.getElementById('toastContainer');
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.textContent = message;
  container.appendChild(toast);
  setTimeout(() => {
    toast.classList.add('fade-out');
    toast.addEventListener('animationend', () => toast.remove());
  }, 4000);
}


// ══════════════════════════════════════════
// 4. LÓGICA DE GERENCIAMENTO DE USUÁRIOS
// ══════════════════════════════════════════
const userContainer = document.getElementById("userContainer");

// Modal Elements
const editModal = document.getElementById('editModal');
const closeModalBtn = document.getElementById('closeModalBtn');
const editForm = document.getElementById('editForm');

// Fechar modal
function closeModal() {
  editModal.classList.remove('active');
  editForm.reset();
}
closeModalBtn.addEventListener('click', closeModal);
editModal.addEventListener('click', (e) => {
  if (e.target === editModal) closeModal();
});

// Renderizar Tabela de Usuários
function renderUsers(usersArray) {
  userContainer.innerHTML = ""; 
  
  if (!usersArray || usersArray.length === 0) {
    userContainer.innerHTML = `<div class="empty-state"><p>Nenhum usuário encontrado.</p></div>`;
    return;
  }

  usersArray.forEach(user => {
    const row = document.createElement("div");
    row.classList.add("user-row");
    // Guardamos os dados originais aqui para comparação posterior no PATCH
    row.dataset.id = user.id;
    row.dataset.user = user.user;
    row.dataset.email = user.email;
    row.dataset.role = user.role.toLowerCase();
    row.dataset.nome_completo = user.nome_completo || "";
    row.dataset.obs = user.obs || "";

    const avatarInitials = (user.user || user.id || "??").substring(0, 2).toUpperCase();

    row.innerHTML = `
      <div class="user-info-main">
        <div class="user-avatar">${avatarInitials}</div>
        <div class="user-text">
          <span class="user-name">${user.user}</span>
          <span class="user-id">#${user.id}</span>
        </div>
      </div>
      <div class="user-email">${user.email}</div>
      <div><span class="badge ${user.role.toLowerCase()}">${user.role}</span></div>
      <div><button class="btn-edit btn-ghost" style="padding: 6px 12px; font-size: 12px;">Editar</button></div>
    `;

    row.querySelector('.btn-edit').addEventListener('click', () => {
      document.getElementById('userId').value = user.id;
      document.getElementById("nomeSobrenome").value = user.nome_completo || "";
      document.getElementById('nome').value = user.user;
      document.getElementById('email').value = user.email;
      document.getElementById('privilegio').value = user.role.toLowerCase();
      document.getElementById('obs').value = user.obs || '';
      document.getElementById('senha').value = ''; 
      editModal.classList.add('active');
    });

    userContainer.appendChild(row);
  });
}

// ── GET: LISTAR TODOS ──
document.getElementById("listarUsuariosBtn").addEventListener("click", async (e) => {
  e.preventDefault();
  userContainer.innerHTML = `<div class="empty-state"><p>Carregando...</p></div>`;

  try {
    const response = await apiFetch(`${window.CONFIG.API_BASE_URL}api/user/`, {
      method: "GET", credentials: "include"
    });
    const data = await response.json();

    if (!response.ok) {
      showToast(`ERRO: ${data.erro}`, 'error');
      userContainer.innerHTML = `<div class="empty-state"><p>Erro ao carregar usuários.</p></div>`;
      return;
    }
    renderUsers(data.resultado);
  } catch (err) {
    showToast('Falha na comunicação com o servidor.', 'error');
    userContainer.innerHTML = `<div class="empty-state"><p>Erro de rede.</p></div>`;
  }
});

// ── GET: LISTAR ESPECÍFICO ──
document.getElementById("formBusca").addEventListener("submit", async (e) => {
  e.preventDefault();
  const filtroId = document.getElementById("filtroId").value.trim();
  if(!filtroId) {
    showToast('Digite um ID para buscar', 'error');
    return;
  }

  userContainer.innerHTML = `<div class="empty-state"><p>Buscando...</p></div>`;

  try {
    const response = await apiFetch(`${window.CONFIG.API_BASE_URL}api/user/${filtroId}`, {
      method: "GET", credentials: "include"
    });
    const data = await response.json();

    if (!response.ok) {
      showToast(`ERRO: ${data.erro}`, 'error');
      userContainer.innerHTML = `<div class="empty-state"><p>Usuário não encontrado.</p></div>`;
      return;
    }
    renderUsers(data.resultado);
  } catch (err) {
    showToast('Falha na comunicação com o servidor.', 'error');
  }
});

// ── PATCH: SALVAR EDIÇÃO ──
editForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  
  const id = document.getElementById("userId").value;
  // Busca a linha correspondente na tabela para comparar valores
  const row = document.querySelector(`.user-row[data-id="${id}"]`);
  
  if (!row) {
    showToast("Erro ao localizar referência do usuário.", "error");
    return;
  }

  const inputs = {
    user: document.getElementById("nome").value.trim(),
    email: document.getElementById("email").value.trim(),
    roleEdit: document.getElementById("privilegio").value,
    nome_completo: document.getElementById("nomeSobrenome").value.trim(),
    obs: document.getElementById("obs").value.trim(),
    senha: document.getElementById("senha").value
  };

  // Criamos o payload apenas com o que MUDOU
  const payload = {};

  if (inputs.user !== row.dataset.user) payload.user = inputs.user;
  if (inputs.email !== row.dataset.email) payload.email = inputs.email;
  if (inputs.roleEdit !== row.dataset.role) payload.roleEdit = inputs.roleEdit;
  if (inputs.nome_completo !== row.dataset.nome_completo) payload.nome_completo = inputs.nome_completo;
  if (inputs.obs !== row.dataset.obs) payload.obs = inputs.obs;
  if (inputs.senha.length > 0) payload.senha = inputs.senha;

  // Se o payload estiver vazio, não faz sentido chamar a API
  if (Object.keys(payload).length === 0) {
    showToast("Nenhuma alteração detectada.", "info");
    closeModal();
    return;
  }

  try {
    const response = await apiFetch(`${window.CONFIG.API_BASE_URL}api/user/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    
    const data = await response.json();

    if (!response.ok) {
      showToast(`ERRO: ${data.erro || "Falha na atualização"}`, 'error');
    } else {
      showToast(data.message || "Usuário atualizado!", 'success');
      closeModal();
      document.getElementById("listarUsuariosBtn").click(); 
    }
  } catch (err) {
    showToast('Falha ao comunicar com o servidor.', 'error');
  }
});

// ── DELETE: EXCLUIR USUÁRIO ──
document.getElementById("deletarUser").addEventListener("click", async () => {
  const id = document.getElementById("userId").value;
  
  if(!confirm(`Tem certeza que deseja DELETAR o usuário #${id}? Esta ação é irreversível.`)){
    return;
  }

  try {
    const response = await apiFetch(`${window.CONFIG.API_BASE_URL}api/user/${id}`, {
      method: "DELETE", credentials: "include"
    });
    const data = await response.json();

    if (!response.ok) {
      showToast(`ERRO: ${data.erro}`, 'error');
    } else {
      showToast(data.message, 'success');
      closeModal();
      document.getElementById("listarUsuariosBtn").click(); // Atualiza a lista
    }
  } catch (err) {
    showToast('Falha ao deletar usuário.', 'error');
  }
});