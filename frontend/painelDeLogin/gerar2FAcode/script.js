// ══════════════════════════════════════════
// TEMA
// ══════════════════════════════════════════
const html = document.documentElement;
const themeToggle = document.getElementById('themeToggle');
const themeIcon = document.getElementById('themeIcon');

const ICON_LIGHT = `<circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>`;
const ICON_DARK  = `<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>`;

// herda o tema do login se estiver definido, senão usa light
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
// HELPERS DE STEP
// ══════════════════════════════════════════
function showStep(stepId) {
  document.querySelectorAll('.step').forEach(s => {
    s.classList.remove('step--visible');
    s.classList.add('step--hidden');
    s.style.display = 'none';
  });
  const target = document.getElementById(stepId);
  target.style.display = 'flex';
  requestAnimationFrame(() => {
    target.classList.remove('step--hidden');
    target.classList.add('step--visible');
  });
}

showStep('step-warning');

// ══════════════════════════════════════════
// GERAR 2FA
// ══════════════════════════════════════════
document.getElementById('btnGerar').addEventListener('click', async () => {
  const btn     = document.getElementById('btnGerar');
  const text    = document.getElementById('btnGerarText');
  const spinner = document.getElementById('btnGerarSpinner');
  const icon    = document.getElementById('btnGerarIcon');
  const errEl   = document.getElementById('step-error');

  // loading state
  btn.disabled = true;
  text.textContent = 'Gerando código...';
  spinner.classList.remove('hidden');
  icon.classList.add('hidden');
  errEl.classList.add('hidden');

  try {
    const res = await fetch(`${window.CONFIG.API_BASE_URL}api/user/gerar-2fa`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',   // token geral do sistema
    });

    const data = await res.json();

    console.log(data.qrCode);

    if (!res.ok) {
      throw new Error(data.erro || 'Não foi possível gerar o código. Tente novamente.');
    }

    // backend retorna { qrCode: "data:image/png;base64,..." }
    document.getElementById('qrImage').src = data.qrCode;

    // vai pro step do QR
    showStep('step-qr');

  } catch (err) {
    errEl.textContent = err.message;
    errEl.classList.remove('hidden');

    // restaura botão
    btn.disabled = false;
    text.textContent = 'Gerar meu código 2FA';
    spinner.classList.add('hidden');
    icon.classList.remove('hidden');
  }
});

// ══════════════════════════════════════════
// FECHAR JANELA
// ══════════════════════════════════════════
document.getElementById('btnFechar').addEventListener('click', () => {
  window.close();
  // fallback caso o navegador bloqueie window.close()
  // (acontece se a aba não foi aberta via script)
  setTimeout(() => {
    document.getElementById('btnFechar').textContent = 'Você já pode fechar esta aba.';
    document.getElementById('btnFechar').disabled = true;
  }, 300);
});