



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
  plainTextKEY: null, // Nova: Armazena a chave gerada
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
// Formato,  definido pelo oque cria, mas com o padrão de 4 bytes antes do header.
function parseVaultFile(bytes) {

  // lê uint32 big endian
  const view = new DataView(
    bytes.buffer,
    bytes.byteOffset,
    bytes.byteLength
  );

  const headerLen = view.getUint32(0, false);
  // false = big endian
  // equivalente ao ">I" do Python

  // lê header
  const headerBytes = bytes.slice(4, 4 + headerLen);

  const headerStr = new TextDecoder().decode(headerBytes);

  let header;

  try {
    header = JSON.parse(headerStr);
  } catch (err) {
    throw new Error("Header JSON inválido");
  }

  if (header.magic !== "PyVault Universal Format") {
    throw new Error("Magic inválida");
  }

  // restante do arquivo
  const remaining = bytes.slice(4 + headerLen);

  // resto = ciphertext
  const cipherBytes = remaining

  return {header, cipherBytes, headerBytes};
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
    const {header, cipherBytes, headerBytes} = parseVaultFile(state.rawFileBytes);

    // Derivar chave com Argon2
    const key = await deriveKey(password, header);
    state.plainTextKEY = password; // ARMAZENA A CHAVE GLOBALMENTE EM TEXTO PLANO (para salvar no futuro, com NOVO KDF)
    // e garantir aleatoriedade, não reutilizar salt e nem "nonce", gera KDF totalmente novo

    // Descriptografar com XChaCha20-Poly1305
    const plaintext = await decrypt(key, cipherBytes, header, headerBytes);

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
async function decrypt(keyBytes, cipherBytes, header, headerBytes) {
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

  //cipherBytes.slice(0, NONCE_LEN);
  const nonce = base64ToBytes(header.nonceXcha)

  const ciphertext = cipherBytes
  
  try {
    const plaintext = sodium.crypto_aead_xchacha20poly1305_ietf_decrypt(
      null,        // nsec
      ciphertext,
      headerBytes,        // ad
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
    el.onclick = () => openSecretPanel(i)
    el.innerHTML = `
      <div>
        <div class="entry-name">${esc(entry.titulo ?? `Entrada ${i + 1}`)}</div>
        <div class="entry-user">${esc(entry.user ?? '')}</div>
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
  return sodium.from_base64(
    b64,
    sodium.base64_variants.ORIGINAL
  );
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



// VISUALIZAÇÃO DOS SEGREDOS E DETALHES:

// ─── Lógica do Painel Lateral (Visualizar/Editar) ─────────────────────────────
let isEditing = false;

function openSecretPanel(index) {
  const secret = state.vault.segredos[index];
  if (!secret) return;

  document.getElementById('secret-panel').style.display = 'flex';
  document.getElementById('panel-index').value = index;
  
  // Preenche os inputs com os dados (ou string vazia se não existir)
  document.getElementById('panel-titulo').value = secret.titulo || '';
  document.getElementById('panel-user').value = secret.user || '';
  document.getElementById('panel-senha').value = secret.senha || '';
  document.getElementById('panel-servico').value = secret.servico || '';
  document.getElementById('panel-obs').value = secret.obs || '';

  // Ao abrir, garante que entra no modo Leitura
  setEditMode(false);
}

function closePanel() {
  document.getElementById('secret-panel').style.display = 'none';
  setEditMode(false);
}

function toggleEdit() {
  setEditMode(!isEditing);
}

// ─── Lógica Unificada do Painel (Visualizar/Editar/Salvar) ──────────────────

function setEditMode(enable) {
  isEditing = enable;
  const inputs = ['panel-titulo', 'panel-user', 'panel-senha', 'panel-servico', 'panel-obs'];
  const btnEdit = document.getElementById('btn-edit');
  const btnApply = document.getElementById('btn-apply-edit');
  
  // Ativa/Desativa a edição dos campos
  inputs.forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      el.readOnly = !enable;
      // Feedback visual: borda mais clara quando editável
      el.style.borderColor = enable ? '#666' : 'var(--border)';
    }
  });

  // Alterna visibilidade dos botões
  btnApply.style.display = enable ? 'block' : 'none';
  
  if (enable) {
    btnEdit.textContent = 'Modo Edição';
    btnEdit.classList.add('btn-editing');
  } else {
    btnEdit.textContent = 'Editar';
    btnEdit.classList.remove('btn-editing');
  }
}

// 1. Aplica as mudanças do formulário ao objeto em memória (state.vault)
function applyEdits() {
  const index = document.getElementById('panel-index').value;
  if (index === "") return;

  const updatedSecret = {
    titulo:  document.getElementById('panel-titulo').value,
    user:    document.getElementById('panel-user').value,
    senha:   document.getElementById('panel-senha').value,
    servico: document.getElementById('panel-servico').value,
    obs:     document.getElementById('panel-obs').value
  };

  // Atualiza o dado no estado global
  state.vault.segredos[index] = updatedSecret;
  
  // Atualiza a UI
  renderVault();
  setEditMode(false);
  alert("Alterações aplicadas na memória. Use o botão de download para salvar no arquivo.");
}



// função necessária para ORDENAR VALORES em JSON no arquivo , padrão deterministico.
function sortObjectKeys(obj) {
  if (Array.isArray(obj)) {
    return obj.map(sortObjectKeys);
  }

  if (obj !== null && typeof obj === "object") {
    return Object.keys(obj)
      .sort()
      .reduce((result, key) => {
        result[key] = sortObjectKeys(obj[key]);
        return result;
      }, {});
  }

  return obj;
}


async function packageAndDownload() {
  const sodium = await window.sodiumReadyPromise;

  if (!state.plainTextKEY) {
    alert("Erro: Chave de criptografia não encontrada.");
    return;
  }

  try {

    // =========================
    // plaintext
    // =========================
    const jsonStr = JSON.stringify(state.vault);
    const plaintext = new TextEncoder().encode(jsonStr);

    // =========================
    // nonce
    // =========================
    const nonce = sodium.randombytes_buf(
      sodium.crypto_aead_xchacha20poly1305_ietf_NPUBBYTES
    );
    
    // SALVA NO HEADER NOVO NONCE
    state.header.nonceXcha = sodium.to_base64(
      nonce,
      sodium.base64_variants.ORIGINAL
    );


    // gera NOVO SALT (para KDF da chave novamente)
    const salt = sodium.randombytes_buf(32); // Gera 32 bytes criptograficamente seguros

    // converte o salt para BASE64 para transporte no JSON
    const saltB64 = sodium.to_base64(salt, sodium.base64_variants.ORIGINAL); // Conversão limpa

    //salva no header NOVO SALT
    state.header.salt = saltB64

    // GERA A CHAVE DENOVO COM NOVO KDF E COM NOVO SALT
    const nova_chave_user_derivada = await deriveKey(state.plainTextKEY, state.header)

    // =========================
    // HEADER ORDENADO
    // equivalente ao:
    // json.dumps(sort_keys=True)
    // =========================

    const sortedHeader = sortObjectKeys(state.header);

    const headerJson = JSON.stringify(sortedHeader);

    const headerBytes = new TextEncoder().encode(headerJson);

    // =========================
    // encrypt
    // =========================
    const ciphertext = sodium.crypto_aead_xchacha20poly1305_ietf_encrypt(
      plaintext,
      headerBytes,
      null,
      nonce,
      nova_chave_user_derivada
    );

    // =========================
    // arquivo final
    // =========================

    const totalSize =
      4 +
      headerBytes.length +
      ciphertext.length

    const finalFile = new Uint8Array(totalSize);

    const view = new DataView(finalFile.buffer);

    // BIG ENDIAN
    view.setUint32(0, headerBytes.length, false);

    // header
    finalFile.set(headerBytes, 4);

    // ciphertext
    finalFile.set(ciphertext, 4 + headerBytes.length);


    // =========================
    // download
    // =========================

    const blob = new Blob(
      [finalFile],
      { type: 'application/octet-stream' }
    );

    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');

    a.href = url;

    a.download =
      state.filename.replace(".pvt", "") +
      "_update.pvt";

    a.click();

    URL.revokeObjectURL(url);

  } catch (err) {
    console.error(err);
    alert("Erro ao gerar o arquivo criptografado.");
  }
}

