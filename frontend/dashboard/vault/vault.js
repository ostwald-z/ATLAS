



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
  deriveKey: null, // salva KDF da chave, para LOCK de vault ser mais rapido.
  nonceBytes: null,
  lockedBytes:        null,   // ← ADICIONAR
  lockedHeader:       null,   // ← ADICIONAR
  lockedHeaderBytes:  null,   // ← ADICIONAR
};



// Reset completo (trocar arquivo a partir da tela de lock)
function fullReset() {
  state = {
    rawFileBytes: null, header: null, vault: null,
    filename: '', plainTextKEY: null, deriveKey: null,
    lockedBytes: null, lockedHeader: null, lockedHeaderBytes: null,
  };
  document.getElementById('password-input').value = '';
  document.getElementById('locked-pass-input').value = '';
  document.getElementById('drop-label').textContent = 'Clique para abrir arquivo .pvt';
  clearError('locked');
  showScreen('open');
}




// ─── Referências DOM ─────────────────────────────────────────────────────────
const screens = {
  open:     document.getElementById('screen-open'),
  password: document.getElementById('screen-password'),
  vault:    document.getElementById('screen-vault'),
  create:   document.getElementById('screen-create'),
  locked:   document.getElementById('screen-locked'),
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




// ─── Força de senha (tela criar) ──────────────────────────────────────────────
document.getElementById('create-pass').addEventListener('input', function () {
  const wrap  = document.getElementById('create-strength');
  const bar   = document.getElementById('create-strength-bar');
  const label = document.getElementById('create-strength-label');
  const v = this.value;

  if (!v) { wrap.style.display = 'none'; return; }
  wrap.style.display = 'flex';

  let score = 0;
  if (v.length >= 8)  score++;
  if (v.length >= 14) score++;
  if (/[A-Z]/.test(v) && /[a-z]/.test(v)) score++;
  if (/\d/.test(v)) score++;
  if (/[^A-Za-z0-9]/.test(v)) score++;

  const levels = [
    { color: '#8a4040', text: 'fraca'  },
    { color: '#8a6040', text: 'fraca'  },
    { color: '#8a7a40', text: 'média'  },
    { color: '#5a7a40', text: 'boa'    },
    { color: '#3a7a5a', text: 'forte'  },
    { color: '#3a6a8a', text: 'ótima'  },
  ];
  const lvl = levels[Math.min(score, 5)];
  bar.style.background = lvl.color;
  bar.style.width = `${(score / 5) * 100}%`;
  label.textContent = lvl.text;
  label.style.color = lvl.color;
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
    state.deriveKey = key // armazena pra LOCK VAULT visual ser mais rapido, com criptografia de um KDF da chave pronto, sendo mais rápido.
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
  

  if (cipherBytes.length < 16) {
    throw Object.assign(
      new Error('Ciphertext muito curto para ser válido.'),
      { userMessage: 'Arquivo corrompido ou senha incorreta.' }
    );
  }

  //cipherBytes.slice(0, NONCE_LEN);
  const nonce = base64ToBytes(header.nonceXcha)
  state.nonceBytes = nonce

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




const nextFrame = () => new Promise(requestAnimationFrame);

// ─── Lock: re-encripta o vault atual e limpa o plaintext da memória ───────────
async function lockVault() {

  showScreen('locked')
  await nextFrame()

  const sodium = await window.sodiumReadyPromise;

  if (!state.vault || !state.plainTextKEY) {
    fullReset();
    return;
  }

  try {



    const lockHeader = state.header;

    const plaintext   = new TextEncoder().encode(JSON.stringify(state.vault));
    const sortedHdr   = sortObjectKeys(lockHeader);
    const headerBytes = new TextEncoder().encode(JSON.stringify(sortedHdr));

    const ciphertext = sodium.crypto_aead_xchacha20poly1305_ietf_encrypt(
      plaintext, headerBytes, null, state.nonceBytes, state.deriveKey
    );

    // Persiste cifrado
    state.lockedBytes       = ciphertext;
    state.lockedHeader      = lockHeader;
    state.lockedHeaderBytes = headerBytes;

    // Apaga plaintext e chave da memória e kdf e etc
    state.vault        = null;
    state.plainTextKEY = null;
    state.deriveKey = null;
    state.nonceBytes = null;

    document.getElementById('locked-filename').textContent = state.filename;
    document.getElementById('locked-pass-input').value = '';
    clearError('locked');

  } catch (err) {
    console.error('[Atlas Vault] Erro ao bloquear:', err);
    alert('Erro ao bloquear vault.');
  }
}




// ─── Unlock a partir da tela de lock ──────────────────────────────────────────
document.getElementById('locked-pass-input').addEventListener('keydown', function (e) {
  if (e.key === 'Enter') unlockLocked();
});

async function unlockLocked() {
  const sodium = await window.sodiumReadyPromise;
  clearError('locked');

  const pass = document.getElementById('locked-pass-input').value;
  if (!pass) { showError('locked', 'Insira a senha.'); return; }

  const btn = document.getElementById('btn-unlock-locked');
  btn.disabled = true;
  btn.textContent = 'Verificando...';

  try {
    const key = await deriveKey(pass, state.lockedHeader);
    state.deriveKey = key; // guarda "novo" KDF para possivel outro uso em BLOQUEAR
    // lembrando que, ao usuario BAIXAR arquivo atualizado = outro KDF será gerado.
    
    const nonce = base64ToBytes(state.lockedHeader.nonceXcha);
    state.nonceBytes = lockHeader.nonceXcha;


    // pegamos KDF e nonceBytes novamente, pois POR SEGURANÇA, pós lockVault
    // zeramos todas as infos que temos do usuário, então naquele momento especifico = não sabemos de nada, apenas de seu Header.

    const plaintext = sodium.crypto_aead_xchacha20poly1305_ietf_decrypt(
      null,
      state.lockedBytes, //ciphertext  (vault)
      state.lockedHeaderBytes,
      nonce,
      key
    );

    // Restaura vault com todas as edições intactas
    state.vault        = JSON.parse(new TextDecoder().decode(plaintext));
    state.plainTextKEY = pass;

    // Limpa estado de lock
    state.lockedBytes       = null;
    state.lockedHeader      = null;
    state.lockedHeaderBytes = null;

    renderVault();
    showScreen('vault');

  } catch (err) {
    showError('locked', 'Senha incorreta ou vault corrompido.');
  } finally {
    btn.disabled = false;
    btn.textContent = 'Desbloquear';
  }
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



// ─── Visualizar Senha (Bugfix) ───────────────────────────────────────────────
function toggleViewPass(inputId) {
  const input = document.getElementById(inputId);
  if (input.type === 'password') {
    input.type = 'text';
  } else {
    input.type = 'password';
  }
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



// ─── Criar e Excluir Segredos ────────────────────────────────────────────────

function createNewSecret() {
  document.getElementById('secret-panel').style.display = 'flex';
  
  // Usamos 'new' como flag para saber que não estamos editando um existente
  document.getElementById('panel-index').value = 'new';
  
  // Limpa todos os campos para o novo segredo
  document.getElementById('panel-titulo').value = '';
  document.getElementById('panel-user').value = '';
  document.getElementById('panel-senha').value = '';
  document.getElementById('panel-servico').value = '';
  document.getElementById('panel-obs').value = '';

  // Já abre direto no modo de edição
  setEditMode(true);
  document.getElementById('panel-titulo').focus();
}

function deleteSecret() {
  const index = document.getElementById('panel-index').value;
  
  // Se o cara clicou em "Novo" e logo em seguida clicou em "Excluir", só fecha o painel
  if (index === 'new' || index === "") {
    closePanel();
    return;
  }

  // Confirmação de segurança para não apagar sem querer
  if (confirm("Tem certeza que deseja excluir este segredo permanentemente?")) {
    state.vault.segredos.splice(index, 1); // Remove do array no estado da memória
    closePanel();
    renderVault();
    alert("Segredo removido! Use o botão 'Baixar Vault Atualizado' para salvar no arquivo .pvt.");
  }
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
  const tituloInput = document.getElementById('panel-titulo').value.trim();
  
  // REGRA: Título não pode ser vazio
  if (!tituloInput) {
    alert("O título do segredo é obrigatório! Preencha para não quebrar o Vault.");
    document.getElementById('panel-titulo').focus();
    return;
  }

  const updatedSecret = {
    titulo:  tituloInput,
    user:    document.getElementById('panel-user').value,
    senha:   document.getElementById('panel-senha').value,
    servico: document.getElementById('panel-servico').value,
    obs:     document.getElementById('panel-obs').value
  };

  // Se o array de segredos não existir por algum motivo, inicializa ele
  if (!state.vault.segredos) {
    state.vault.segredos = [];
  }

  if (index === 'new') {
    // É um segredo totalmente novo: empurra pro array
    state.vault.segredos.push(updatedSecret);
    // Atualiza o index oculto para o ID real recém-criado (caso o usuário continue editando)
    document.getElementById('panel-index').value = state.vault.segredos.length - 1;
  } else {
    // É uma edição de um segredo existente: apenas atualiza
    state.vault.segredos[index] = updatedSecret;
  }
  
  // Atualiza a UI
  renderVault();
  setEditMode(false);
  alert("Alterações aplicadas na memória. Use o botão de download para salvar no arquivo .pvt.");
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






// ─── Criar novo vault ─────────────────────────────────────────────────────────
async function createVault() {
  const sodium = await window.sodiumReadyPromise;
  clearError('create');

  const name    = document.getElementById('create-name').value.trim();
  const pass    = document.getElementById('create-pass').value;
  const pass2   = document.getElementById('create-pass2').value;

  if (!name)          { showError('create', 'Insira um nome para o vault.'); return; }
  if (!pass)          { showError('create', 'Insira a senha mestra.'); return; }
  if (pass !== pass2) { showError('create', 'As senhas não coincidem.'); return; }

  const btn = document.getElementById('btn-create');
  btn.disabled = true;
  btn.textContent = 'Derivando chave...';

  try {
    // Vault vazio inicial
    const vault = { segredos: [] };

    // Criptografia: gera salt e nonce frescos
    const salt  = sodium.randombytes_buf(32);
    const nonce = sodium.randombytes_buf(sodium.crypto_aead_xchacha20poly1305_ietf_NPUBBYTES);

    const saltB64  = sodium.to_base64(salt,  sodium.base64_variants.ORIGINAL);
    const nonceB64 = sodium.to_base64(nonce, sodium.base64_variants.ORIGINAL);

    // Header PyVault v3 — mesmos campos do Python
    const header = {
      version:       3.0,
      magic:         "PyVault Universal Format",
      "spec-intern": "OGWD Secure Vault Specification v3",
      creator:       "Ostwald Gerhardt Wolffdick",
      kdf:           "Argon2id",
      kdf_params: {
        time_cost:    3,
        memory_cost:  65536,   // 64 MB em KB
        parallelism:  4,
      },
      salt:      saltB64,
      nonceXcha: nonceB64,
      cipher:    "XChaCha20-poly1305",
    };

    // Deriva chave com Argon2id
    const key = await deriveKey(pass, header);

    btn.textContent = 'Cifrando...';

    const plaintext   = new TextEncoder().encode(JSON.stringify(vault));
    const sortedHdr   = sortObjectKeys(header);
    const headerJson  = JSON.stringify(sortedHdr);
    const headerBytes = new TextEncoder().encode(headerJson);

    // Cifra com XChaCha20-Poly1305 (header como AAD)
    const ciphertext = sodium.crypto_aead_xchacha20poly1305_ietf_encrypt(
      plaintext,
      headerBytes,
      null,
      nonce,
      key
    );

    // Monta arquivo: [4 bytes big-endian header_len][header][ciphertext]
    const totalSize = 4 + headerBytes.length + ciphertext.length;
    const finalFile = new Uint8Array(totalSize);
    new DataView(finalFile.buffer).setUint32(0, headerBytes.length, false);
    finalFile.set(headerBytes, 4);
    finalFile.set(ciphertext, 4 + headerBytes.length);

    // Download direto
    const blob = new Blob([finalFile], { type: 'application/octet-stream' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = name.replace(/[^a-zA-Z0-9_\-]/g, '_') + '.pvt';
    a.click();
    URL.revokeObjectURL(url);

    // Limpa e volta pra tela inicial
    document.getElementById('create-name').value  = '';
    document.getElementById('create-pass').value  = '';
    document.getElementById('create-pass2').value = '';
    document.getElementById('create-strength').style.display = 'none';
    showScreen('open');

  } catch (err) {
    console.error('[Atlas Vault] Erro ao criar vault:', err);
    showError('create', 'Erro ao criar: ' + (err.message || 'verifique o console.'));
  } finally {
    btn.disabled = false;
    btn.textContent = 'Criar e Baixar .pvt';
  }
}


