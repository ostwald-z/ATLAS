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
    const res = await fetch(`${window.CONFIG.API_BASE_URL}api/user/apicheck`, {
      method: 'GET',
      credentials: 'include'
    });

    if (!res.ok) {
      window.location.href = '../../painelDeLogin/login/index.html';
      return;
    }

    const data = await res.json();
    usuarioAtual = data.username;
    usuarioAtualID = data.user
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

  setLoading(true);
  esconderFeedback();

  try {
    const res = await fetch(`${window.CONFIG.API_BASE_URL}api/user/${usuarioAtualID}`, {
      method: 'PATCH',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (res.ok) {
      mostrarFeedback('success', '✓ Alterações aplicadas com sucesso!');
      // Atualiza os originais para evitar reenvio em salvamentos futuros
      ['inputName', 'inputUsername', 'inputEmail', 'inputObs'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.dataset.original = el.value;
      });
      usuarioAtual.role = roleSelecionado;
    } else {
      const err = await res.json()
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
    { chave: 'nome_completo',     id: 'inputName'     },
    { chave: 'user',     id: 'inputUsername' },
    { chave: 'email',    id: 'inputEmail'    },
    { chave: 'obs',      id: 'inputObs'      },
  ];

  const payload = {};

  campos.forEach(({ chave, id }) => {
    const el = document.getElementById(id);
    if (!el) return;
    const atual   = el.value.trim();
    const original = (el.dataset.original || '').trim();
    // Se mudou → envia o novo valor. Se não mudou → envia string vazia
    payload[chave] = atual !== original ? atual : '';
  });

  // Senha — só inclui se o usuário digitou algo
  const senha = document.getElementById('inputPassword').value;
  payload.senha = senha.length > 0 ? senha : '';

  // Role — só envia se mudou
  payload.roleEdit = roleSelecionado !== usuarioAtual?.role ? roleSelecionado : '';

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