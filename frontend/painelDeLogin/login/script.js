(async function checkAuthRedirectLogin() {
  try {
    const res = await fetch(`${window.CONFIG.API_BASE_URL}api/user/apicheck`, {
      method: 'GET',
      credentials: 'include'
    });

    if (!res.ok) {
      // Token inválido ou não existe -> redireciona
      return;
    }

    const data = await res.json();
    console.log('Usuário autenticado:', data.user);

    if(data.role_user === "admin"){
      window.location.href = '../../dashboard/admin/index.html';
    }else{
      window.location.href = '../../dashboard/user/indexUser.html';
    }

  } catch (err) {
    console.error('Erro na verificação de token:', err);
  }
})();




// ══════════════════════════════════════════
// TEMA
// ══════════════════════════════════════════
const html = document.documentElement;
const themeToggle = document.getElementById('themeToggle');

const savedTheme = localStorage.getItem('atlasTheme') || 'light';
html.setAttribute('data-theme', savedTheme);

themeToggle.addEventListener('click', () => {
  const next = html.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
  html.setAttribute('data-theme', next);
  localStorage.setItem('atlasTheme', next);
});

// ══════════════════════════════════════════
// TOGGLE SENHA
// ══════════════════════════════════════════
document.getElementById('toggleSenha').addEventListener('click', () => {
  const input = document.getElementById('senha');
  const icon = document.getElementById('eyeIcon');
  if (input.type === 'password') {
    input.type = 'text';
    icon.innerHTML = '<path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/>';
  } else {
    input.type = 'password';
    icon.innerHTML = '<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>';
  }
});

// ══════════════════════════════════════════
// HELPERS
// ══════════════════════════════════════════
function setMsg(elId, text, type) {
  const el = document.getElementById(elId);
  if (!el) return;
  el.textContent = text;
  el.className = 'message ' + (type || '');
}

function setBtnLoading(btn, loading) {
  btn.disabled = loading;
  btn.classList.toggle('loading', loading);
}

// ══════════════════════════════════════════
// STEP TRANSITION
// ══════════════════════════════════════════
function showStep(stepId) {
  document.querySelectorAll('.step').forEach(s => {
    s.classList.remove('step--visible');
    s.classList.add('step--hidden');
    s.style.display = 'none';
  });
  const target = document.getElementById(stepId);
  target.style.display = 'block';
  requestAnimationFrame(() => {
    target.classList.remove('step--hidden');
    target.classList.add('step--visible');
  });
}

// guarda o role do usuario entre os dois steps
let _userRole = null;

// Inicia no step1
showStep('step1');

// ══════════════════════════════════════════
// ENTER NOS INPUTS
// ══════════════════════════════════════════
document.getElementById('user').addEventListener('keydown', e => {
  if (e.key === 'Enter') document.getElementById('senha').focus();
});
document.getElementById('senha').addEventListener('keydown', e => {
  if (e.key === 'Enter') document.getElementById('login').click();
});

// ══════════════════════════════════════════
// HELPERS DE REDIRECIONAMENTO
// ══════════════════════════════════════════
function redirectByRole(role) {
  if (role === 'admin') {
    window.location.href = '../../dashboard/admin/index.html';
  } else {
    window.location.href = '../../dashboard/user/indexUser.html';
  }
}

// ══════════════════════════════════════════
// LOGIN — 1ª REQUISIÇÃO (user + senha)
// ══════════════════════════════════════════
document.getElementById('login').addEventListener('click', async (e) => {
  e.preventDefault();

  const user = document.getElementById('user').value.trim();
  const senha = document.getElementById('senha').value.trim();
  const btn = document.getElementById('login');

  if (!user || !senha) {
    setMsg('login-message', 'Preencha todos os campos.', 'error');
    return;
  }

  setMsg('login-message', '', '');
  setBtnLoading(btn, true);

  try {
    const res = await fetch(`${window.CONFIG.API_BASE_URL}api/user/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ user, senha })
    });

    const data = await res.json();

    if (!res.ok) {
      setMsg('login-message', data.erro || 'Usuário ou senha inválidos.', 'error');
      return;
    }

    // ── Credenciais OK ──────────────────────────────────────
    _userRole = data.role;

    if (data.totpStatus === 'falsetotp') {
      // Usuário ainda não configurou 2FA:
      // backend já entregou o token geral (via cookie), só redireciona
      // abre aba de setup do 2FA (faremos depois — por ora abre em branco)
      window.open('../gerar2FAcode/index.html', '_blank');
      redirectByRole(data.role);
      return;
    }

    // Usuário já tem 2FA ativado → vai para o step de código
    showStep('step2');
    setTimeout(() => document.querySelector('.twofa-cell').focus(), 100);

  } catch (err) {
    setMsg('login-message', 'Erro de conexão.', 'error');
  } finally {
    setBtnLoading(btn, false);
  }
});

// ══════════════════════════════════════════
// 2FA — CÉLULAS
// ══════════════════════════════════════════
const cells = Array.from(document.querySelectorAll('.twofa-cell'));

cells.forEach((cell, i) => {

  cell.addEventListener('keydown', e => {
    if (e.key === 'Enter') {
      e.preventDefault();
      document.getElementById('btn2fa').click();
      return;
    }
    if (e.key === 'Backspace' && !cell.value && i > 0) {
      cells[i - 1].focus();
      cells[i - 1].value = '';
      cells[i - 1].classList.remove('filled');
    }
    if (e.key === 'ArrowLeft' && i > 0) cells[i - 1].focus();
    if (e.key === 'ArrowRight' && i < cells.length - 1) cells[i + 1].focus();
  });

  cell.addEventListener('input', () => {
    cell.value = cell.value.replace(/\D/g, '').slice(-1);

    if (cell.value) {
      cell.classList.add('filled');
      if (i < cells.length - 1) cells[i + 1].focus();
      if (i === cells.length - 1) {
        const code = cells.map(c => c.value).join('');
        if (code.length === 6) setTimeout(() => document.getElementById('btn2fa').click(), 80);
      }
    } else {
      cell.classList.remove('filled');
    }
  });

  // colar código completo
  cell.addEventListener('paste', e => {
    e.preventDefault();
    const pasted = (e.clipboardData || window.clipboardData)
      .getData('text').replace(/\D/g, '').slice(0, 6);
    pasted.split('').forEach((ch, j) => {
      if (cells[j]) {
        cells[j].value = ch;
        cells[j].classList.add('filled');
      }
    });
    const nextEmpty = cells.findIndex(c => !c.value);
    (nextEmpty !== -1 ? cells[nextEmpty] : cells[cells.length - 1]).focus();
    if (pasted.length === 6) setTimeout(() => document.getElementById('btn2fa').click(), 80);
  });
});

// ══════════════════════════════════════════
// VERIFICAR 2FA — 2ª REQUISIÇÃO (só o código)
// ══════════════════════════════════════════
document.getElementById('btn2fa').addEventListener('click', async () => {
  const code = cells.map(c => c.value).join('');
  const btn = document.getElementById('btn2fa');

  if (code.length < 6) {
    setMsg('twofa-message', 'Insira os 6 dígitos.', 'error');
    cells.forEach(c => c.classList.add('error-cell'));
    setTimeout(() => cells.forEach(c => c.classList.remove('error-cell')), 600);
    return;
  }

  setMsg('twofa-message', '', '');
  setBtnLoading(btn, true);

  const codigo2fa = String(code)

  try {
    const res = await fetch(`${window.CONFIG.API_BASE_URL}api/user/check-2fa`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',          // cookie temporário com ID do usuário
      body: JSON.stringify({ totpcode: codigo2fa })
    });

    const data = await res.json();

    if (!res.ok) {
      setMsg('twofa-message', data.erro || 'Código inválido.', 'error');
      cells.forEach(c => { c.classList.add('error-cell'); c.classList.remove('filled'); c.value = ''; });
      setTimeout(() => cells.forEach(c => c.classList.remove('error-cell')), 600);
      cells[0].focus();
      return;
    }

    setMsg('twofa-message', 'Verificado!', 'success');

    // usa o role guardado no step1, ou o que o backend retornar (fallback)
    const role = _userRole || data.role;
    setTimeout(() => redirectByRole(role), 500);

  } catch (err) {
    setMsg('twofa-message', 'Erro de conexão.', 'error');
  } finally {
    setBtnLoading(btn, false);
  }
});

// ══════════════════════════════════════════
// VOLTAR AO LOGIN
// ══════════════════════════════════════════
document.getElementById('voltarLogin').addEventListener('click', () => {
  showStep('step1');
  cells.forEach(c => { c.value = ''; c.classList.remove('filled', 'error-cell'); });
  setMsg('twofa-message', '', '');
  _userRole = null;
});

// ══════════════════════════════════════════
// AÇÕES EXTERNAS
// ══════════════════════════════════════════
document.getElementById('specialLogin').addEventListener('click', () => {
  window.open('../impersonate/index.html', '_blank');
});

document.getElementById('criaruser').addEventListener('click', () => {
  window.open('../criarUser/index.html', '_blank');
});