
window.sodiumReadyPromise = (async () => {
  const sodium = await import("https://cdn.jsdelivr.net/npm/libsodium-wrappers@0.7.13/+esm");
  await sodium.default.ready;
  window.sodium = sodium.default;
  return sodium.default;
})();


// ─── Estado em memória ───────────────────────────────────────────────────────
let state = {
  rawFileBytes: null,   // Uint8Array do arquivo completo
  header: null,         // objeto JSON do header parseado
  vault: null,          // vault descriptografado (objeto)
  filename: '',
};

// ─── Referências DOM ─────────────────────────────────────────────────────────
const screens = {
  open:     document.getElementById('screen-open'),
  password: document.getElementById('screen-password'),
  vault:    document.getElementById('screen-vault'),
};

// ─── Navegação entre telas ───────────────────────────────────────────────────
function showScreen(name) {
  Object.values(screens).forEach(s => s.classList.remove('active'));
  screens[name].classList.add('active');
}

function goBack() {
  resetState();
  clearError('pass');
  showScreen('open');
}

function resetState() {
  state.rawFileBytes = null;
  state.header = null;
  state.vault = null;
  state.filename = '';
  document.getElementById('password-input').value = '';
}

// ─── Leitura de arquivo ───────────────────────────────────────────────────────
document.getElementById('file-input').addEventListener('change', function () {
  const file = this.files[0];
  if (!file) return;
  loadFile(file);
});

// Drag & drop
const dropZone = document.getElementById('drop-zone');
dropZone.addEventListener('dragover', e => { e.preventDefault(); dropZone.classList.add('drag-over'); });
dropZone.addEventListener('dragleave', () => dropZone.classList.remove('drag-over'));
dropZone.addEventListener('drop', e => {
  e.preventDefault();
  dropZone.classList.remove('drag-over');
  const file = e.dataTransfer.files[0];
  if (file) loadFile(file);
});

function loadFile(file) {
  clearError('open');
  const reader = new FileReader();
  reader.onload = function (e) {
    try {
      const bytes = new Uint8Array(e.target.result);
      const parsed = parseVaultFile(bytes);

      state.rawFileBytes = bytes;
      state.header = parsed.header;
      state.filename = file.name;

      document.getElementById('vault-filename').textContent = file.name;
      document.getElementById('drop-label').textContent = file.name;
      showScreen('password');
      setTimeout(() => document.getElementById('password-input').focus(), 50);
    } catch (err) {
      console.error('[Atlas Vault] Erro ao ler arquivo:', err);
      showError('open', err.message);
    }
  };
  reader.readAsArrayBuffer(file);
}

// ─── Parse do arquivo ────────────────────────────────────────────────────────
// Formato: <JSON_HEADER>\n<ciphertext_bytes>
// O header termina com o primeiro \n após o fechamento do objeto JSON '}'
function parseVaultFile(bytes) {
  // Encontra fim do header JSON: busca o primeiro \n após o '}'
  let headerEnd = -1;
  for (let i = 0; i < bytes.length; i++) {
    if (bytes[i] === 0x7D) { // '}'
      headerEnd = i + 1;
      break;
    }
  }

  if (headerEnd === -1) {
    throw new Error('Arquivo não é proprietário, portanto não tem estrutura interna válida para nós');
  }

  const headerStr = new TextDecoder('utf-8').decode(bytes.slice(0, headerEnd));

  let header;
  try {
    header = JSON.parse(headerStr);
  } catch (err) {
    throw new Error('Arquivo não é proprietário, portanto não tem estrutura interna válida para nós');
  }

  if (!header.magic || header.magic !== 'PYVAULT') {
    throw new Error('Arquivo não é proprietário, portanto não tem estrutura interna válida para nós');
  }

  // O restante (pula \n se houver) é o ciphertext
  let cipherStart = headerEnd;
  if (bytes[cipherStart] === 0x0A) cipherStart++; // pula \n

  const cipherBytes = bytes.slice(cipherStart);

  return { header, cipherBytes };
}

// ─── Unlock ───────────────────────────────────────────────────────────────────
document.getElementById('password-input').addEventListener('keydown', function (e) {
  if (e.key === 'Enter') unlockVault();
});

async function unlockVault() {
  const sodium = await window.sodiumReadyPromise;
  clearError('pass');
  const password = document.getElementById('password-input').value;
  if (!password) { showError('pass', 'Insira a senha.'); return; }

  const btn = document.getElementById('btn-unlock');
  btn.disabled = true;
  btn.textContent = 'Derivando chave...';

  try {
    const { header, cipherBytes } = parseVaultFile(state.rawFileBytes);

    // Derivar chave com Argon2
    const key = await deriveKey(password, header);

    // Descriptografar com XChaCha20-Poly1305
    const plaintext = await decrypt(key, cipherBytes, header);

    // Parse do vault
    const vaultText = new TextDecoder('utf-8').decode(plaintext);
    state.vault = JSON.parse(vaultText);

    renderVault();
    showScreen('vault');
  } catch (err) {
    console.error('[Atlas Vault] Erro ao abrir vault:', err);
    showError('pass', err.userMessage || 'Senha incorreta ou arquivo corrompido.');
  } finally {
    btn.disabled = false;
    btn.textContent = 'Abrir Vault';
  }
}

// ─── Derivação de chave: Argon2 ───────────────────────────────────────────────
async function deriveKey(password, header) {

  // Requer argon2-browser (carregado externamente) OU fallback via WASM
  // Tenta usar argon2 global (argon2-browser CDN)
  if (typeof argon2 === 'undefined') {
    throw Object.assign(
      new Error('Biblioteca Argon2 não carregada. Inclua argon2-browser no HTML.'),
      { userMessage: 'Dependência Argon2 não encontrada. Veja o console.' }
    );
  }

  const kdf = header.kdf_params;
  const saltBytes = base64ToBytes(header.salt);

  const result = await argon2.hash({
    pass: password,
    salt: saltBytes,
    time: kdf.time_cost,
    mem:  kdf.memory_cost,
    parallelism: kdf.parallelism,
    hashLen: 32,
    type: argon2.ArgonType.Argon2id,
  });

  return result.hash; // Uint8Array de 32 bytes
}

// ─── Descriptografia: XChaCha20-Poly1305 ─────────────────────────────────────
// XChaCha20 usa nonce de 24 bytes. Esperamos: [24 bytes nonce][ciphertext+tag]
async function decrypt(keyBytes, cipherBytes, header) {
  // Aguarda inicialização do WASM (seguro chamar múltiplas vezes)
  const sodium = await window.sodiumReadyPromise;

  if (typeof sodium === 'undefined') {
    throw Object.assign(
      new Error('Biblioteca libsodium não carregada.'),
      { userMessage: 'Dependência libsodium não encontrada. Veja o console.' }
    );
  }
  

  const NONCE_LEN = 24;
  if (cipherBytes.length < NONCE_LEN + 16) {
    throw Object.assign(
      new Error('Ciphertext muito curto para ser válido.'),
      { userMessage: 'Arquivo corrompido ou senha incorreta.' }
    );
  }

  const nonce      = cipherBytes.slice(0, NONCE_LEN);
  const ciphertext = cipherBytes.slice(NONCE_LEN);

  try {
    const plaintext = sodium.crypto_aead_xchacha20poly1305_ietf_decrypt(
      null,        // nsec
      ciphertext,
      null,        // ad
      nonce,
      keyBytes
    );
    return plaintext;
  } catch (err) {
    throw Object.assign(
      new Error('Falha na descriptografia: ' + err.message),
      { userMessage: 'Senha incorreta ou arquivo corrompido.' }
    );
  }
}

// ─── Render vault ─────────────────────────────────────────────────────────────
function renderVault() {
  const list = document.getElementById('entries-list');
  const infoEl = document.getElementById('vault-info');

  const segredos = state.vault?.segredos ?? [];
  infoEl.textContent = `${segredos.length} entrada(s)  ·  ${state.filename}`;

  list.innerHTML = '';

  if (segredos.length === 0) {
    list.innerHTML = '<div class="empty-state">Vault vazio.</div>';
    return;
  }

  segredos.forEach((entry, i) => {
    const el = document.createElement('div');
    el.className = 'entry-item';
    el.innerHTML = `
      <div>
        <div class="entry-name">${esc(entry.nome ?? entry.titulo ?? entry.name ?? `Entrada ${i + 1}`)}</div>
        <div class="entry-user">${esc(entry.usuario ?? entry.username ?? entry.email ?? '')}</div>
      </div>
    `;
    list.appendChild(el);
  });
}

// ─── Lock ─────────────────────────────────────────────────────────────────────
function lockVault() {
  // Limpa tudo da memória
  state.vault = null;
  state.header = null;
  state.rawFileBytes = null;
  document.getElementById('password-input').value = '';
  document.getElementById('entries-list').innerHTML = '';
  showScreen('open');
}

// ─── Utilidades ───────────────────────────────────────────────────────────────
function base64ToBytes(b64) {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

function esc(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function showError(screen, msg) {
  const el = document.getElementById(`error-${screen}`);
  el.textContent = msg;
  el.style.display = 'block';
}

function clearError(screen) {
  const el = document.getElementById(`error-${screen}`);
  el.textContent = '';
  el.style.display = 'none';
}
