// ══════════════════════════════════════════════
// ATLAS — Criar Usuário | script.js
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

// ── Toggle visibilidade de senha / chaves ──────
// Senha principal
document.getElementById('toggleSenha').addEventListener('click', () => {
  toggleInputVisibility('inputSenha', 'eyeIconSenha');
});

// Toggles genéricos para chaves (via data-target)
document.querySelectorAll('.field-toggle-pw[data-target]').forEach(btn => {
  btn.addEventListener('click', () => {
    const inputId = btn.dataset.target;
    const input   = document.getElementById(inputId);
    const icon    = btn.querySelector('svg');
    if (!input || !icon) return;
    const isText = input.type === 'text';
    input.type = isText ? 'password' : 'text';
    icon.innerHTML = isText
      ? '<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>'
      : '<path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/>';
  });
});

function toggleInputVisibility(inputId, iconId) {
  const input = document.getElementById(inputId);
  const icon  = document.getElementById(iconId);
  if (!input || !icon) return;
  const isText = input.type === 'text';
  input.type = isText ? 'password' : 'text';
  icon.innerHTML = isText
    ? '<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>'
    : '<path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/>';
}

// ── Criar Usuário ──────────────────────────────
document.getElementById('btnCriar').addEventListener('click', async () => {
  esconderFeedback();
  esconderResposta();

  // Coleta valores
  const nome_completo  = document.getElementById('inputNome').value.trim();
  const user           = document.getElementById('inputUser').value.trim();
  const email          = document.getElementById('inputEmail').value.trim();
  const senha          = document.getElementById('inputSenha').value;
  const obs            = document.getElementById('inputObs').value.trim();
  const magicCriar     = document.getElementById('inputMagicCriar').value.trim();
  const magicRole      = document.getElementById('inputMagicRole').value.trim();
  const chaveNoPending = document.getElementById('inputNoPending').value.trim();

  // Validação mínima no front
  if (!nome_completo || !user || !email || !senha) {
    mostrarFeedback('error', '✗ Preencha nome, usuário, e-mail e senha.');
    return;
  }

  if (!magicCriar) {
    mostrarFeedback('error', '✗ A chave de criação (magicCriar) é obrigatória.');
    return;
  }

  // Monta payload exatamente como o schema do backend espera
  const payload = {
    nome_completo,
    user,
    email,
    senha,
    obs,
    magicCriar,
    magicRole,
    chaveNoPending,
  };

  setLoading(true);

  try {
    const res = await fetch(`${window.CONFIG.API_BASE_URL}api/user/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(payload)
    });

    const data = await res.json().catch(() => null);

    if (res.ok) {
      mostrarFeedback('success', '✓ Usuário criado com sucesso!');
    } else {
      mostrarFeedback('error', `✗ ${data?.message || data?.error || 'Erro ao criar usuário.'}`);
    }

    // Printa a resposta do backend sempre, seja sucesso ou erro
    exibirResposta(data);

  } catch (err) {
    console.error('[ATLAS] Erro ao criar usuário:', err);
    mostrarFeedback('error', '✗ Erro de conexão. Tente novamente.');
  } finally {
    setLoading(false);
  }
});

// ── Limpar formulário ──────────────────────────
document.getElementById('btnReset').addEventListener('click', () => {
  ['inputNome','inputUser','inputEmail','inputSenha','inputObs',
   'inputMagicCriar','inputMagicRole','inputNoPending'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });
  esconderFeedback();
  esconderResposta();
});

// ── UI Helpers ─────────────────────────────────
function setLoading(on) {
  const btn     = document.getElementById('btnCriar');
  const label   = document.getElementById('btnCriarLabel');
  const spinner = document.getElementById('btnCriarSpinner');
  btn.disabled = on;
  label.textContent = on ? 'Criando...' : 'Criar usuário';
  spinner.classList.toggle('hidden', !on);
}

function mostrarFeedback(tipo, msg) {
  const el = document.getElementById('formFeedback');
  el.textContent = msg;
  el.className = `form-feedback is-${tipo}`;
  if (tipo === 'success') setTimeout(() => esconderFeedback(), 5000);
}

function esconderFeedback() {
  const el = document.getElementById('formFeedback');
  el.className = 'form-feedback';
  el.textContent = '';
}

function exibirResposta(data) {
  const wrap = document.getElementById('backendResponse');
  const pre  = document.getElementById('backendResponseText');
  pre.textContent = JSON.stringify(data, null, 2);
  wrap.classList.remove('hidden');
}

function esconderResposta() {
  const wrap = document.getElementById('backendResponse');
  wrap.classList.add('hidden');
  document.getElementById('backendResponseText').textContent = '';
}