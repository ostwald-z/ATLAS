/*(async function checkAuth() {
  try {
    const res = await fetch(`${window.CONFIG.API_BASE_URL}api/user/apicheck`, {
      method: 'GET',
      credentials: 'include'
    });

    if (!res.ok) {
      // Token inválido ou não existe -> redireciona
      window.location.href = '../../painelDeLogin/login/index.html';
      return;
    }

    const data = await res.json();
    console.log('Usuário autenticado:', data.user);

  } catch (err) {
    console.error('Erro na verificação de token:', err);
    window.location.href = '../../painelDeLogin/login/index.html';
  }
})();


*/



// ══════════════════════════════════════════
// TEMA
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

// ══════════════════════════════════════════
// DROPDOWN DE PERFIL
// ══════════════════════════════════════════
const profileBtn      = document.getElementById('profileBtn');
const profileDropdown = document.getElementById('profileDropdown');

profileBtn.addEventListener('click', (e) => {
  e.stopPropagation();
  const isOpen = profileDropdown.classList.contains('open');
  profileDropdown.classList.toggle('open', !isOpen);
  profileBtn.setAttribute('aria-expanded', String(!isOpen));
  profileDropdown.setAttribute('aria-hidden', String(isOpen));
});

// fecha ao clicar fora
document.addEventListener('click', () => {
  profileDropdown.classList.remove('open');
  profileBtn.setAttribute('aria-expanded', 'false');
  profileDropdown.setAttribute('aria-hidden', 'true');
});

profileDropdown.addEventListener('click', (e) => e.stopPropagation());

// ══════════════════════════════════════════
// BUSCAR ID DO USUÁRIO LOGADO
// ══════════════════════════════════════════
async function loadUserInfo() {
  try {
    const res = await fetch(`${window.CONFIG.API_BASE_URL}api/user/me`, {
      method: 'GET',
      credentials: 'include',
    });

    if (!res.ok) throw new Error('Não autorizado');

    const data = await res.json();
    const id = data.id || data.userId || data._id || '—';

    // avatar: primeiros 2 chars do ID em maiúsculo
    const initials = String(id).slice(0, 2).toUpperCase();

    document.getElementById('profileAvatar').textContent   = initials;
    document.getElementById('dropdownAvatar').textContent  = initials;
    document.getElementById('dropdownId').textContent      = `ID: ${id}`;

  } catch {
    // falhou silenciosamente — mantém placeholder
    document.getElementById('dropdownId').textContent = 'ID não disponível';
  }
}

loadUserInfo();

// ══════════════════════════════════════════
// LOGOUT
// ══════════════════════════════════════════
document.getElementById('btnLogout').addEventListener('click', async () => {
  try {
    await fetch(`${window.CONFIG.API_BASE_URL}api/user/logout`, {
      method: 'POST',
      credentials: 'include',
    });
  } catch { /* ignora erro de rede */ }

  window.location.href = '../../login/index.html';
});