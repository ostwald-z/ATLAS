










window.sodiumReadyPromise = (async () => {
  const sodium = await import("https://cdn.jsdelivr.net/npm/libsodium-wrappers@0.7.13/+esm");
  await sodium.default.ready;
  window.sodium = sodium.default;
  return sodium.default;
})();


let vaultListRequestId = 0;

// ─── Estado em memória ───────────────────────────────────────────────────────
let state = {
  rawFileBytes: null,   // Uint8Array do arquivo completo
  header: null,         // objeto JSON do header parseado
  vault: null,          // vault descriptografado (objeto)
  filename: '',
  plainTextKEY: null, // Nova: Armazena a chave gerada
  deriveKey: null, // salva KDF da chave, para LOCK de vault ser mais rapido.
  nonceBytes: null,
  lockedBytes:        null,  
  lockedHeader:       null,   
  lockedHeaderBytes:  null,   
  syncedVaultName: null,  // nome do vault que veio do servidor (null = arquivo local)
  isLoggedIn: false,      // true após backend confirmar autenticação
};



// Reset completo (trocar arquivo a partir da tela de lock)
function fullReset() {
  state = {
    rawFileBytes: null, header: null, vault: null,
    filename: '', plainTextKEY: null, deriveKey: null,
    lockedBytes: null, lockedHeader: null, lockedHeaderBytes: null,
    syncedVaultName: null, // ← limpa origem do vault
    isLoggedIn: state.isLoggedIn, // ← preserva status de login entre resets
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
  state.syncedVaultName = null;  // ← limpa origem
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
  // Garantir que temos pelo menos os 4 bytes do tamanho do header
  if (bytes.length < 4) throw new Error("Arquivo muito curto");

  // Lê uint32 big endian diretamente dos bytes
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const headerLen = view.getUint32(0, false);

  if (headerLen <= 0 || headerLen > bytes.length - 4) {
    throw new Error("Tamanho do header inválido ou arquivo corrompido");
  }

  // Extrai o header usando subarray (mais eficiente que slice)
  const headerBytes = bytes.subarray(4, 4 + headerLen);
  const headerStr = new TextDecoder().decode(headerBytes);

  let header;
  try {
    header = JSON.parse(headerStr);
  } catch (err) {
    console.error("Conteúdo que falhou no parse:", headerStr);
    throw new Error("Header JSON inválido");
  }

  if (header.magic !== "PyVault Universal Format") {
    throw new Error("Magic inválida: Este arquivo não é um Atlas Vault válido.");
  }

  const cipherBytes = bytes.subarray(4 + headerLen);

  return { header, cipherBytes, headerBytes };
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


  // ── Alterna botões de salvar conforme origem do vault ──────────────────────
  // Se o vault veio do servidor: mostra "Salvar Banco" + "Baixar atualizado"
  // Se é arquivo local: mostra apenas o botão original de download
  const btnSaveLocal   = document.getElementById('btn-save-local');
  const btnSaveServer  = document.getElementById('btn-save-server');
  const btnDownloadUpd = document.getElementById('btn-download-updated');

  if (state.syncedVaultName) {
    btnSaveLocal.style.display   = 'none';
    btnSaveServer.style.display  = 'flex';
    btnDownloadUpd.style.display = 'flex';
  } else {
    btnSaveLocal.style.display   = 'flex';
    btnSaveServer.style.display  = 'none';
    btnDownloadUpd.style.display = 'none';
  }



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


// ─── Extrai a lógica de recriptografia em função reutilizável ─────────────────
// Usada tanto pelo download quanto pelo envio ao servidor.
async function buildVaultBlob(sodium) {
  const jsonStr   = JSON.stringify(state.vault);
  const plaintext = new TextEncoder().encode(jsonStr);

  // Gera nonce e salt novos (nunca reutiliza)
  const nonce = sodium.randombytes_buf(
    sodium.crypto_aead_xchacha20poly1305_ietf_NPUBBYTES
  );
  state.header.nonceXcha = sodium.to_base64(nonce, sodium.base64_variants.ORIGINAL);

  const salt    = sodium.randombytes_buf(32);
  state.header.salt = sodium.to_base64(salt, sodium.base64_variants.ORIGINAL);

  // Deriva chave com novo KDF + novo salt
  const novaChave    = await deriveKey(state.plainTextKEY, state.header);
  const sortedHeader = sortObjectKeys(state.header);
  const headerJson   = JSON.stringify(sortedHeader);
  const headerBytes  = new TextEncoder().encode(headerJson);

  const ciphertext = sodium.crypto_aead_xchacha20poly1305_ietf_encrypt(
    plaintext, headerBytes, null, nonce, novaChave
  );

  // Monta arquivo: [4 bytes big-endian header_len][header][ciphertext]
  const totalSize = 4 + headerBytes.length + ciphertext.length;
  const finalFile = new Uint8Array(totalSize);
  new DataView(finalFile.buffer).setUint32(0, headerBytes.length, false);
  finalFile.set(headerBytes, 4);
  finalFile.set(ciphertext, 4 + headerBytes.length);

  return new Blob([finalFile], { type: 'application/octet-stream' });
}


// ─── Baixar arquivo .pvt atualizado (comportamento original) ──────────────────
async function packageAndDownload() {
  const sodium = await window.sodiumReadyPromise;

  if (!state.plainTextKEY) {
    alert("Erro: Chave de criptografia não encontrada.");
    return;
  }

  try {
    const blob = await buildVaultBlob(sodium);
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = state.filename.replace('.pvt', '') + '_update.pvt';
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
  let kdf_memory   = document.getElementById('kdf-memory').value;
  let kdf_time_cost   = document.getElementById('kdf-time').value;
  let kdf_paralelism   = document.getElementById('kdf-paralelism').value;

  if (!name)          { showError('create', 'Insira um nome para o vault.'); return; }
  if (!pass)          { showError('create', 'Insira a senha mestra.'); return; }
  if (pass !== pass2) { showError('create', 'As senhas não coincidem.'); return; }


  if(!kdf_memory) {kdf_memory = 65536}
  if(!kdf_time_cost) {kdf_time_cost = 3}
  if(!kdf_paralelism) {kdf_paralelism = 4}


  const kdf_memory_integer     = parseInt(kdf_memory, 10);
  const kdf_time_cost_integer  = parseInt(kdf_time_cost, 10);
  const kdf_paralelism_integer = parseInt(kdf_paralelism, 10);

  const kdf_memory_kb = kdf_memory_integer * 1024;


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
        time_cost:    kdf_time_cost_integer ?? 3,
        memory_cost:  kdf_memory_kb ?? 65000,   //em KB
        parallelism:  kdf_paralelism_integer ?? 4,
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
    fullReset()

  } catch (err) {
    console.error('[Atlas Vault] Erro ao criar vault:', err);
    showError('create', 'Erro ao criar: ' + (err.message || 'verifique o console.'));
  } finally {
    btn.disabled = false;
    btn.textContent = 'Criar e Baixar .pvt';
  }
}






// ═══════════════════════════════════════════════════════════════════════════════
//  MÓDULO DE SINCRONIZAÇÃO COM SERVIDOR
// ─────────────────────────────────────────────────────────────────────────────
//
//  CONTRATO DE API ESPERADO:
//
//  GET    /api/vaults           → { vaults: ["nome1.pvt", "nome2.pvt", ...] }
//                                 401 / 403 → não autenticado
//
//  GET    /api/vaults/:name     → binary blob (.pvt)
//                                 Content-Type: application/octet-stream
//
//  PUT    /api/vaults/:name     → body: binary blob (.pvt)
//                                 Sobrescreve arquivo no disco
//                                 → { ok: true }
//
//  DELETE /api/vaults/:name     → remove vault do disco
//                                 → { ok: true }
//
//  AUTENTICAÇÃO: por padrão usa cookie HttpOnly (credentials: 'include').
//  Se usar Bearer token, descomente as linhas de Authorization abaixo.
// ═══════════════════════════════════════════════════════════════════════════════




// ─── 1. Buscar lista de vaults ao carregar a página ───────────────────────────
async function fetchUserVaults() {
  
  const currentRequestId = ++vaultListRequestId;
  
  
  const listEl = document.getElementById('server-vault-list');




  // Skeleton loader enquanto aguarda resposta
  listEl.innerHTML = `
    <div class="svl-loading">
      <div class="svl-loading-bar"></div>
      <div class="svl-loading-bar"></div>
      <div class="svl-loading-bar"></div>
    </div>`;

  try {
    const res = await fetch(`${window.CONFIG.API_BASE_URL}api/vault/listar`, {
      method: 'GET',
      credentials: 'include',
      cache: 'no-store',
      // headers: { 'Authorization': `Bearer ${seuToken}` }, // ← Bearer token
    });


    // 2. AQUI ESTÁ A MUDANÇA: Se for 404, ele ESTÁ logado, mas não tem vaults
    if (res.status === 404) {
      state.isLoggedIn = true; // Define como logado
      _renderVaultListEmpty(); // Chamamos uma função para mostrar a sua mensagem
      return;
    }


    // SE EXISTE REQUEST MAIS NOVA → IGNORA ESTA
    if (currentRequestId !== vaultListRequestId) {
      return;
    }

    if (res.status === 401 || res.status === 403) {
      // Não autenticado — app continua funcionando, só sem sync
      state.isLoggedIn = false;
      _renderVaultListNotLoggedIn();
      return;
    }

    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const data   = await res.json();

    // NOVAMENTE verifica se ficou velha DURANTE await json()
    if (currentRequestId !== vaultListRequestId) {
      return;
    }

    const vaults = data.vaults ?? []; // espera array de strings com nomes

    state.isLoggedIn = true;
    _renderVaultList(vaults);

  } catch (err) {
    // Erro de rede → trata como não autenticado silenciosamente
    console.warn('[Atlas Vault] Servidor inacessível:', err.message);
    state.isLoggedIn = false;
    _renderVaultListNotLoggedIn();
  }
}


// ─── 2. Renderiza lista de vaults na sidebar ──────────────────────────────────
function _renderVaultList(vaults) {
  const listEl = document.getElementById('server-vault-list');
  listEl.innerHTML = '';


  // Se a lista está vazia mas chegou aqui, é porque o status foi 200 (logado)
  if (vaults.length === 0) {
    listEl.innerHTML = `
      <div class="svl-status">
        Você está logado,<br>
        mas não tem vaults<br>
        para listar.
      </div>`;
    return;
  }

  if (vaults.length === 0) {
    listEl.innerHTML = `<div class="svl-status">Nenhum vault encontrado no servidor.</div>`;
    return;
  }

  vaults.forEach(name => {
    const item = document.createElement('div');
    item.className       = 'svl-item';
    item.dataset.vaultName = name;
    item.innerHTML = `
      <span class="svl-icon">▪</span>
      <span class="svl-name" title="${esc(name)}">${esc(name)}</span>
    `;

    // Clique simples → seleção visual
    item.addEventListener('click', () => {
      document.querySelectorAll('.svl-item').forEach(i => i.classList.remove('selected'));
      item.classList.add('selected');
    });

    // Duplo clique → abre vault do servidor
    item.addEventListener('dblclick', () => openVaultFromServer(name));

    // Botão direito → menu de contexto
    item.addEventListener('contextmenu', e => {
      e.preventDefault();
      _showContextMenu(e.clientX, e.clientY, name);
    });

    listEl.appendChild(item);
  });
}


// ─── 3. Estado: não autenticado ───────────────────────────────────────────────
function _renderVaultListNotLoggedIn() {
  document.getElementById('server-vault-list').innerHTML = `
    <div class="svl-status">
      você não está<br>logado.<br>
      <span style="opacity:0.5;font-size:10px;">
        Abra ou crie um<br>arquivo local abaixo.
      </span>
    </div>`;
}


// ─── 4. Buscar blob de vault específico do servidor e abrir ───────────────────
async function openVaultFromServer(vaultName) {
  clearError('open');
  const item = document.querySelector(`.svl-item[data-vault-name="${CSS.escape(vaultName)}"]`);
  if (item) item.style.opacity = '0.4';

  try {
    const res = await fetch(
      `${window.CONFIG.API_BASE_URL}api/vault/pegarVault/${encodeURIComponent(vaultName)}`,
      { method: 'GET', credentials: 'include' }
    );

    if (!res.ok) {
        // Se o servidor retornar erro, tentamos ler a mensagem de erro
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.message || `Erro ${res.status} ao buscar vault.`);
    }

    // Pega o blob e converte para arrayBuffer
    const blob = await res.blob();
    const arrayBuffer = await blob.arrayBuffer();
    const bytes = new Uint8Array(arrayBuffer);

    // Validação extra: se o arquivo começar com '{', provavelmente o servidor 
    // enviou um JSON de erro com status 200 por engano.
    if (bytes[0] === 123) { // 123 é o código ASCII para '{'
        const text = new TextDecoder().decode(bytes);
        try {
            const json = JSON.parse(text);
            if (json.erro || json.message) throw new Error(json.erro || json.message);
        } catch(e) { /* não é JSON, segue o fluxo */ }
    }

    const parsed = parseVaultFile(bytes);

    state.rawFileBytes    = bytes;
    state.header          = parsed.header;
    state.filename        = vaultName;
    state.syncedVaultName = vaultName;

    document.getElementById('vault-filename').textContent = vaultName;
    showScreen('password');
    setTimeout(() => document.getElementById('password-input').focus(), 50);

  } catch (err) {
    console.error('[Atlas Vault]', err);
    showError('open', err.message);
  } finally {
    if (item) item.style.opacity = '1';
  }
}


// ─── 5. Salvar vault no servidor (recriptografa e envia blob) ─────────────────
async function saveVaultToServer() {
  const sodium = await window.sodiumReadyPromise;

  if (!state.plainTextKEY)    { alert('Erro: chave não encontrada.'); return; }
  if (!state.syncedVaultName) { alert('Este vault não está associado a nenhum servidor.'); return; }

  const btn     = document.getElementById('btn-save-server');
  const btnSpan = btn.querySelector('span');
  btn.disabled  = true;
  btnSpan.textContent = 'Cifrando...';

  try {
    const blob = await buildVaultBlob(sodium); // recriptografa com novos salt/nonce

    btnSpan.textContent = 'Enviando...';

    const res = await fetch(
      `${window.CONFIG.API_BASE_URL}api/vault/atualizarVault/${encodeURIComponent(state.syncedVaultName)}`,
      {
        method: 'PUT',
        credentials: 'include',
        // headers: { 'Authorization': `Bearer ${seuToken}` },
        headers: { 'Content-Type': 'application/octet-stream' },
        body: blob,
      }
    );

    if (!res.ok) throw new Error(`Servidor retornou ${res.status}`);

    // Feedback de sucesso temporário
    btnSpan.textContent = '✓ Salvo';
    setTimeout(() => {
      btnSpan.textContent = 'Salvar Banco de Senhas';
      btn.disabled = false;
    }, 2500);

  } catch (err) {
    console.error('[Atlas Vault] Erro ao salvar no servidor:', err);
    alert(`Erro ao salvar no servidor: ${err.message}`);
    btnSpan.textContent = 'Salvar Banco de Senhas';
    btn.disabled = false;
  }
}


// ─── 6. Deletar vault do servidor e atualizar lista ───────────────────────────
async function deleteVaultFromServer(vaultName) {
  if (!confirm(`Remover "${vaultName}" do servidor?\n\nEsta ação não pode ser desfeita.`)) return;

  try {
    const res = await fetch(
      `${window.CONFIG.API_BASE_URL}api/vault/deletarVault/${encodeURIComponent(vaultName)}`,
      {
        method: 'DELETE',
        credentials: 'include',
      }
    );

    if (!res.ok) throw new Error(`Servidor retornou ${res.status}`);

    await fetchUserVaults(); // atualiza lista

  } catch (err) {
    console.error('[Atlas Vault] Erro ao deletar vault:', err);
    alert(`Erro ao remover vault: ${err.message}`);
  }
}


// ─── 7. Menu de contexto (botão direito na lista) ─────────────────────────────
const _ctxMenu = document.getElementById('ctx-menu');
let _ctxTargetVault = null;

function _showContextMenu(x, y, vaultName) {
  _ctxTargetVault    = vaultName;
  _ctxMenu.style.left    = `${x}px`;
  _ctxMenu.style.top     = `${y}px`;
  _ctxMenu.style.display = 'block';
}

function _hideContextMenu() {
  _ctxMenu.style.display = 'none';
  _ctxTargetVault = null;
}

// Fecha o menu ao clicar em qualquer lugar fora dele
document.addEventListener('click', _hideContextMenu);


// ─── Inicialização: busca vaults assim que o DOM estiver pronto ───────────────
document.addEventListener('DOMContentLoaded', fetchUserVaults);




function _renderVaultListEmpty() {
  const listEl = document.getElementById('server-vault-list');
  listEl.innerHTML = `
    <div class="svl-status">
      Você está logado,<br>
      mas não tem vaults<br>
      para listar.
    </div>`;
}