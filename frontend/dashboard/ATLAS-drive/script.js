// ════════════════════════════════════════════════════════
// WRAPPER GLOBAL DE AUTENTICAÇÃO (COOKIE-BASED)
// ════════════════════════════════════════════════════════

window.AUTH = {
  refreshPromise: null
};

// Fallback seguro caso window.CONFIG não esteja injetado ainda
const API_BASE_URL = window.CONFIG?.API_BASE_URL || '/';

async function forceLogout() {
  try {
    await fetch(`${API_BASE_URL}api/user/logout`, {
      method: 'POST',
      credentials: 'include'
    });
  } catch (_) {}
  window.location.href = '../../index.html';
}

async function refreshAccessToken() {
  if (window.AUTH.refreshPromise) {
    return window.AUTH.refreshPromise;
  }

  window.AUTH.refreshPromise = (async () => {
    try {
      const res = await fetch(`${API_BASE_URL}api/user/refresh`, {
        method: 'POST',
        credentials: 'include'
      });

      if (!res.ok) throw new Error('refresh_failed');
      return true;
    } catch (err) {
      await forceLogout();
      throw err;
    } finally {
      window.AUTH.refreshPromise = null;
    }
  })();

  return window.AUTH.refreshPromise;
}

async function apiFetch(url, options = {}, retry = true) {
  const headers = new Headers(options.headers || {});
  const config = {
    ...options,
    headers,
    credentials: 'include' // Envio dos Cookies HttpOnly automática
  };

  let response = await fetch(url, config);

  // Se o Token falhar/expirar, tenta dar Refresh Token silencioso
  if (response.status === 401 && retry) {
    try {
      await refreshAccessToken();
      response = await fetch(url, config); // Segunda tentativa automática
    } catch (_) {
      return response;
    }
  }

  return response;
}


// ════════════════════════════════════════════════════════
// REGRAS DE ESTADO E NAVEGAÇÃO DO DRIVE
// ════════════════════════════════════════════════════════

let currentPath = '/';

// Retorna o emoji simples correto baseado no tipo ou nome do arquivo
function getFileIcon(nome, tipo) {
  if (tipo === 'pasta') return '📁';
  
  const ext = nome.toLowerCase().split('.').pop();
  if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext)) return '🖼️';
  if (['pdf', 'txt', 'md'].includes(ext)) return '📄';
  if (['zip', 'rar', 'tar', 'gz'].includes(ext)) return '📦';
  if (['mp3', 'wav', 'ogg'].includes(ext)) return '🎵';
  if (['mp4', 'mov', 'avi'].includes(ext)) return '🎬';
  
  return '📄'; // Fallback
}

// Converte bytes para formato legível de forma leve
function formatBytes(bytes) {
  if (!bytes || bytes === 0) return '—';
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return (bytes / Math.pow(1024, i)).toFixed(1) + ' ' + sizes[i];
}


// ════════════════════════════════════════════════════════
// REQUISIÇÕES E RENDERIZAÇÃO
// ════════════════════════════════════════════════════════

async function listFolderContents(path = '/') {

  if (isMoveMode && !isMoveNavigating) {
    deactivateMoveMode();
  }

  currentPath = path;
  const container = document.getElementById('fileListContainer');
  container.innerHTML = `<div class="loading-state">Buscando diretórios...</div>`;
  
  renderBreadcrumbs();

  try {
    const response = await apiFetch(`${API_BASE_URL}api/atlas-drive/cloud?path=${encodeURIComponent(path)}`, {
      method: 'GET'
    });

    if (!response.ok) throw new Error('Não foi possível listar os arquivos');

    const data = await response.json();
    const filesList = Array.isArray(data.arquivos) ? data.arquivos : [];

    
    // Ordenação básica: pastas primeiro, depois arquivos por ordem alfabética
    const orderedFiles = [
      ...filesList.filter(f => f.tipo === 'pasta').sort((a, b) => a.nome.localeCompare(b.nome)),
      ...filesList.filter(f => f.tipo !== 'pasta').sort((a, b) => a.nome.localeCompare(b.nome))
    ];

    renderRows(orderedFiles);

  } catch (error) {
    console.error('Erro na requisição:', error);
    container.innerHTML = `<div class="empty-state" style="color: red;">Erro ao carregar pasta atual.</div>`;
  }
}

function renderRows(files) {
  const container = document.getElementById('fileListContainer');
  container.innerHTML = '';

  if (files.length === 0) {
    container.innerHTML = `<div class="empty-state">Esta pasta está vazia.</div>`;
    return;
  }

  files.forEach(file => {
    const nomeExibido = file.nome_original || file.nome; // fallback pro nome físico se vier null
    const sizeStr = file.tipo === 'pasta' ? '—' : formatBytes(file.tamanho);
    const icon = getFileIcon(nomeExibido, file.tipo);

    const row = document.createElement('div');
    row.className = `file-row ${file.tipo === 'pasta' ? 'is-folder' : 'is-file'}`;
    row.innerHTML = `
      <div class="col-main">
        <span class="file-icon">${icon}</span>
        <span>${nomeExibido}</span>
      </div>
      <div class="col-meta">${sizeStr}</div>
    `;

    // Duplo clique entra se for pasta (bloqueado no modo download)
    row.ondblclick = () => {
      if (isDownloadMode || isDeleteMode || isRenameMode || (isMoveMode && !isMoveNavigating)) return;
      if (file.tipo === 'pasta') {
        const targetPath = currentPath === '/' ? `/${file.nome_original}` : `${currentPath}/${file.nome_original}`;
        listFolderContents(targetPath);
      }
    };


    // Controle do clique único (Mobile e modo Download global)
    row.onclick = (e) => {
      if (isDownloadMode) {
        e.stopPropagation(); // impede fechar o toggle pelo clique global
        if (file.tipo !== 'pasta') {
          executeFileDownload(file);
        }
        return;
      }

      if (isOpenTxtMode) {
        e.stopPropagation();
        executeOpenTxtClick(file);
        return;
      }

      if (isDeleteMode) {
        e.stopPropagation();
        executeFileDelete(file);
        return;
      }

      if (isRenameMode) {
        e.stopPropagation();
        openRenameModal(file);
        return;
      }


      //Intercepta o clique para selecionar os arquivos/pastas que serão movidos
      if (isMoveMode && !isMoveNavigating) {
        e.stopPropagation();
        toggleMoveSelection(file, row);
        return;
      }

      if (window.innerWidth <= 768 && file.tipo === 'pasta') {
        const targetPath = currentPath === '/' ? `/${file.nome_original}` : `${currentPath}/${file.nome_original}`;
        listFolderContents(targetPath);
      }
    };

    container.appendChild(row);
  });
}

function renderBreadcrumbs() {
  const container = document.getElementById('breadcrumbs');
  container.innerHTML = '';

  // Elemento Root primário
  const rootSpan = document.createElement('span');
  rootSpan.className = 'breadcrumb-item';
  rootSpan.textContent = 'meu drive';
  rootSpan.onclick = () => listFolderContents('/');
  container.appendChild(rootSpan);

  if (currentPath === '/' || !currentPath) return;

  const parts = currentPath.split('/').filter(p => p);
  let accumulatedPath = '';

  parts.forEach((part) => {
    accumulatedPath += `/${part}`;
    
    const separator = document.createElement('span');
    separator.className = 'breadcrumb-separator';
    separator.textContent = ' / ';
    container.appendChild(separator);

    const currentTarget = accumulatedPath; // Escopo imutável da iteração
    const partSpan = document.createElement('span');
    partSpan.className = 'breadcrumb-item';
    partSpan.textContent = part;
    partSpan.onclick = () => listFolderContents(currentTarget);
    container.appendChild(partSpan);
  });
}



// ════════════════════════════════════════════════════════
// LÓGICA DO MODAL DE NOME (REUTILIZÁVEL) & EDITOR TXT
// ════════════════════════════════════════════════════════

const namePromptModal = document.getElementById('folderModal');
const namePromptInput = document.getElementById('folderNameInput');
const namePromptTitle = document.querySelector('#folderModal .modal-title');
const namePromptForm  = document.querySelector('#folderModal form');

let promptMode = 'folder'; // Pode ser 'folder' ou 'txt'
let currentTxtName = '';

// 1. Botão NOVA PASTA
document.getElementById('newFolderBtn').addEventListener('click', () => {
  promptMode = 'folder';
  namePromptTitle.textContent = 'Nova pasta';
  namePromptInput.value = ''; 
  namePromptInput.placeholder = 'Nome da pasta';
  namePromptModal.showModal(); 
});

// 2. Botão CRIAR TXT
document.getElementById('newTxtBtn').addEventListener('click', () => {
  promptMode = 'txt';
  namePromptTitle.textContent = 'Criar novo arquivo';
  namePromptInput.value = 'novo-arquivo.txt'; // Pré-preenchido
  namePromptModal.showModal();
  
  // Seleciona o texto "novo-arquivo" antes do ".txt" para facilitar a edição
  namePromptInput.setSelectionRange(0, 12);
});

// 3. Fechar popup de nome
document.getElementById('cancelModalBtn').addEventListener('click', () => {
  namePromptModal.close();
});

// 4. SUBMIT do Popup de Nome (Direciona para criar pasta OU abrir editor)
namePromptForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  let chosenName = namePromptInput.value.trim();
  if (!chosenName) return;

  namePromptModal.close();

  // Se for PASTA -> Vai para o backend direto
  if (promptMode === 'folder') {
    const caminho_da_pasta = currentPath === '/' ? `/${chosenName}` : `${currentPath}/${chosenName}`;
    try {
      const res = await apiFetch(`${API_BASE_URL}api/atlas-drive/criar-nova-Pasta`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ caminho_da_pasta })
      });
      if (res.ok) listFolderContents(currentPath);
    } catch (err) { console.error(err); }
  } 
  
  // Se for TXT -> Abre o Editor
  else if (promptMode === 'txt') {
    // Garante que termina com .txt caso o usuário tenha apagado
    currentTxtName = chosenName.endsWith('.txt') ? chosenName : `${chosenName}.txt`;
    openEditor();
  }
  
  else if (promptMode === 'rename') {
    await executeRename(chosenName);
  }
});


// ════════════════════════════════════════════════════════
// LÓGICA DO PAINEL DO EDITOR (BLOB + UPLOAD MULTER)
// ════════════════════════════════════════════════════════

const editorModal = document.getElementById('editorModal');
const editorTextarea = document.getElementById('editorTextarea');
const editorFilename = document.getElementById('editorFilename');
const saveEditorBtn = document.getElementById('saveEditorBtn');

function openEditor() {
  editorFilename.textContent = currentTxtName;
  editorTextarea.value = ''; // Limpa o painel
  editorModal.showModal();
  editorTextarea.focus();
}

document.getElementById('cancelEditorBtn').addEventListener('click', () => {
  editorModal.close();
});

// SALVAR TXT (Envia pro backend como FormData)
saveEditorBtn.addEventListener('click', async () => {
  saveEditorBtn.textContent = 'Salvando...';
  saveEditorBtn.disabled = true;

  const content = editorTextarea.value;
  
  // Monta o arquivo físico no frontend (Blob)
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
  const file = new File([blob], currentTxtName, { type: 'text/plain' });

  // Monta o FormData do jeito exato que o Multer .array("files") precisa
  const formData = new FormData();
  formData.append('files', file);
  formData.append('caminho_escolhido', currentPath); // Onde salvar

  try {
    // O navegador precisa gerar o boundary (limites multipart) automaticamente.
    const response = await apiFetch(`${API_BASE_URL}api/atlas-drive/upload`, {
      method: 'POST',
      body: formData 
    });

    if (response.ok) {
      editorModal.close();
      listFolderContents(currentPath); // Atualiza a tela
    } else {
      console.error('Falha no upload do TXT');
    }
  } catch (error) {
    console.error('Erro na requisição de upload:', error);
  } finally {
    saveEditorBtn.textContent = 'Salvar Arquivo';
    saveEditorBtn.disabled = false;
  }
});





// ══════════════════════════════════════════════
// LÓGICA DE DOWNLOAD (TOGGLE + STREAM NATIVO)
// ══════════════════════════════════════════════

let isDownloadMode = false;

function activateDownloadMode() {
  isDownloadMode = true;
  const btn = document.getElementById('newDownloadBtn');
  const container = document.getElementById('fileListContainer');
  btn.classList.add('active');
  btn.textContent = 'Selecione um arquivo...';
  container.classList.add('download-mode-active');
}

function deactivateDownloadMode() {
  isDownloadMode = false;
  const btn = document.getElementById('newDownloadBtn');
  const container = document.getElementById('fileListContainer');
  btn.classList.remove('active');
  btn.textContent = 'Download';
  container.classList.remove('download-mode-active');
}

// Evento do botão de Download principal
document.getElementById('newDownloadBtn').addEventListener('click', (e) => {
  e.stopPropagation(); // Evita fechar imediatamente pelo clique global
  if (isDownloadMode) {
    deactivateDownloadMode();
  } else {
    activateDownloadMode();
  }
});

// Desativa o toggle se clicar em qualquer lugar fora da lista ou do botão
document.addEventListener('click', (e) => {
  const btn = document.getElementById('newDownloadBtn');
  const container = document.getElementById('fileListContainer');
  
  if (isDownloadMode && !btn.contains(e.target) && !container.contains(e.target)) {
    deactivateDownloadMode();
  }
});

// Executa a requisição e aciona o download nativo do browser
async function executeFileDownload(file) {
  

  const nome_arquivo = file.nome_original || file.nome;

  const caminho_arquivo = currentPath === '/' 
    ? `/${file.nome_original || file.nome}` 
    : `${currentPath}/${file.nome_original || file.nome}`;
  
  // Desativa interface de escolha imediatamente pós-clique
  deactivateDownloadMode();

  try {
    const response = await apiFetch(`${API_BASE_URL}api/atlas-drive/download`, {
      method: "POST",
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ caminho_arquivo })
    });

    if (!response.ok) throw new Error('Falha ao baixar arquivo do servidor');

    // Consome o octet-stream transformando em Blob na memória do navegador
    const blob = await response.blob();
    const blobUrl = window.URL.createObjectURL(blob);

    // Downloader nativo invisível e ultra-rápido
    const anchor = document.createElement('a');
    anchor.href = blobUrl;
    anchor.download = nome_arquivo;
    document.body.appendChild(anchor);
    anchor.click();
    
    // Limpeza de rastro de memória
    anchor.remove();
    window.URL.revokeObjectURL(blobUrl);

  } catch (error) {
    console.error('Erro na execução do download:', error);
  }
}







// ══════════════════════════════════════════════
// Lógica de Deletar (pastas e arquivos)
// ══════════════════════════════════════════════

let isDeleteMode = false;

function activateDeleteMode() {
  if (isDownloadMode) deactivateDownloadMode(); // Desativa o download se estiver aberto
  isDeleteMode = true;
  const btn = document.getElementById('DeleteBtn');
  const container = document.getElementById('fileListContainer');
  btn.classList.add('active');
  btn.textContent = 'Selecione para deletar...';
  container.classList.add('delete-mode-active');
}

function deactivateDeleteMode() {
  isDeleteMode = false;
  const btn = document.getElementById('DeleteBtn');
  const container = document.getElementById('fileListContainer');
  btn.classList.remove('active');
  btn.textContent = 'Deletar';
  container.classList.remove('delete-mode-active');
}

// Evento do botão de Deletar principal
document.getElementById('DeleteBtn').addEventListener('click', (e) => {
  e.stopPropagation();
  if (isDeleteMode) {
    deactivateDeleteMode();
  } else {
    activateDeleteMode();
  }
});

// Desativa o toggle se clicar fora da lista ou do botão
document.addEventListener('click', (e) => {
  const btn = document.getElementById('DeleteBtn');
  const container = document.getElementById('fileListContainer');
  
  if (isDeleteMode && !btn.contains(e.target) && !container.contains(e.target)) {
    deactivateDeleteMode();
  }
});

// Executa a requisição de exclusão um por um
async function executeFileDelete(file) {
  const nome_alvo = file.nome_original || file.nome;
  const pasta_ou_arquivo = file.tipo === 'pasta' ? 'pasta' : 'arquivo';
  
  const caminho_arquivo = currentPath === '/' 
    ? `/${nome_alvo}` 
    : `${currentPath}/${nome_alvo}`;

  // Confirmação nativa simples antes de apagar
  if (!confirm(`Tem certeza que deseja deletar o(a) ${pasta_ou_arquivo} "${nome_alvo}"?`)) {
    deactivateDeleteMode();
    return;
  }

  deactivateDeleteMode();

  try {
    const response = await apiFetch(`${API_BASE_URL}api/atlas-drive/delete`, {
      method: "DELETE",
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ caminho_arquivo, pasta_ou_arquivo })
    });

    if (response.ok) {
      listFolderContents(currentPath); // Atualiza o diretório atual
    } else {
      console.error('Falha ao deletar do servidor');
    }
  } catch (error) {
    console.error('Erro na execução do delete:', error);
  }
}








// ══════════════════════════════════════════════
// LÓGICA de UPLOAD (stream pipe | multipart)
// > 8mb = multipart
// < 8mb = stream pipe
// ══════════════════════════════════════════════


const uploadBtn = document.getElementById('UploadBtn');
const hiddenFileInput = document.getElementById('hiddenFileInput');
const progressContainer = document.getElementById('uploadProgressContainer');
const progressBar = document.getElementById('uploadProgressBar');
const progressText = document.getElementById('uploadStatusText');
const progressPercent = document.getElementById('uploadPercentage');

const UPLOAD_LIMIT = 8 * 1024 * 1024; // 8 MB
const CHUNK_SIZE = 5 * 1024 * 1024;   // 5 MB por chunk (Ajuste conforme o backend)

// 1. Aciona o explorador de arquivos nativo
uploadBtn.addEventListener('click', () => {
  hiddenFileInput.click();
});

// 2. Intercepta a escolha dos arquivos e gerencia a fila
hiddenFileInput.addEventListener('change', async (e) => {
  const files = Array.from(e.target.files);
  if (!files.length) return;

  progressContainer.style.display = 'block';

  // Processa um arquivo por vez de forma síncrona para não engargalar o cliente/servidor
  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    progressText.textContent = `Enviando (${i + 1}/${files.length}): ${file.name}`;
    progressBar.style.width = '0%';
    progressPercent.textContent = '0%';

    try {
      if (file.size < UPLOAD_LIMIT) {
        await uploadSmallFile(file);
      } else {
        await uploadLargeFile(file);
      }
    } catch (err) {
      console.error(`Erro no upload de ${file.name}:`, err);
      // Você pode optar por parar o loop ou apenas avisar e continuar
    }
  }

  // Finalização visual suave
  progressText.textContent = 'Uploads concluídos!';
  progressPercent.textContent = '100%';
  progressBar.style.width = '100%';
  
  setTimeout(() => {
    progressContainer.style.display = 'none';
    hiddenFileInput.value = ''; // Limpa a seleção do input
    listFolderContents(currentPath); // Atualiza a lista da pasta atual no DOM
  }, 2000);
});


// 3. Método Stream Pipe (< 8mb) com XHR nativo para barra de progresso fluida
function uploadSmallFile(file) {
  return new Promise((resolve, reject) => {
    const formData = new FormData();
    formData.append('files', file);
    formData.append('caminho_escolhido', currentPath);

    const xhr = new XMLHttpRequest();
    xhr.open('POST', `${API_BASE_URL}api/atlas-drive/upload`, true);
    xhr.withCredentials = true; // Essencial para enviar cookies de autenticação

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) {
        const percent = Math.round((event.loaded / event.total) * 100);
        progressBar.style.width = `${percent}%`;
        progressPercent.textContent = `${percent}%`;
      }
    };

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) resolve();
      else reject(new Error('Falha no upload stream'));
    };

    xhr.onerror = () => reject(new Error('Erro de rede XHR (Upload Simples)'));
    xhr.send(formData);
  });
}


// 4. Método Multipart (>= 8mb)
async function uploadLargeFile(file) {
  const totalChunks = Math.ceil(file.size / CHUNK_SIZE);
  let uploadedBytes = 0;

  // 4.1 Inicia o multipart
  const initRes = await apiFetch(`${API_BASE_URL}api/atlas-drive/upload-mult/initiate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ 
      nome_arquivo: file.name, 
      caminho_escolhido: currentPath,
      tamanho_total: file.size
    })
  });
  
  if (!initRes.ok) throw new Error('Falha ao iniciar Multipart');
  const { uploadId } = await initRes.json();

  // 4.2 Envia os chunks sequencialmente usando XHR
  for (let i = 0; i < totalChunks; i++) {
    const start = i * CHUNK_SIZE;
    const end = Math.min(start + CHUNK_SIZE, file.size);
    const chunk = file.slice(start, end);
    
    await uploadChunk(chunk, uploadId, i + 1, file.size, uploadedBytes);
    uploadedBytes += chunk.size;
  }

  // 4.3 Finaliza a montagem no servidor
  const completeRes = await apiFetch(`${API_BASE_URL}api/atlas-drive/upload-mult/complete`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ 
      uploadId, 
      nome_arquivo: file.name,
      caminho_escolhido: currentPath
    })
  });

  if (!completeRes.ok) throw new Error('Falha ao concluir Multipart');
}

// Sub-rotina para enviar partes individuais e calcular progresso global
function uploadChunk(chunk, uploadId, partNumber, totalFileSize, uploadedBytesBefore) {
  return new Promise((resolve, reject) => {
    const formData = new FormData();
    formData.append('uploadId', uploadId);
    formData.append('partNumber', partNumber);
    formData.append('chunk', chunk);

    const xhr = new XMLHttpRequest();
    xhr.open('POST', `${API_BASE_URL}api/atlas-drive/upload-mult/part`, true);
    xhr.withCredentials = true;

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) {
        // Progresso real: Soma o que já subiu em chunks anteriores + o progresso deste chunk
        const currentTotalLoaded = uploadedBytesBefore + event.loaded;
        const percent = Math.round((currentTotalLoaded / totalFileSize) * 100);
        progressBar.style.width = `${percent}%`;
        progressPercent.textContent = `${percent}%`;
      }
    };

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300){
        resolve();
      }else {
        console.error(`Chunk ${partNumber} falhou — HTTP ${xhr.status}:`, xhr.responseText);
        reject(new Error(`Falha ao enviar chunk ${partNumber}`));
      }
    };

    xhr.onerror = () => reject(new Error(`Erro de rede XHR (Chunk ${partNumber})`));
    xhr.send(formData);
  });
}









// ══════════════════════════════════════════════
// Lógica de MOVER (pastas e arquivos)
// ══════════════════════════════════════════════

let isMoveMode = false;
let isMoveNavigating = false;
let selectedMoveItems = []; // Guarda a lista de objetos dos itens selecionados

function activateMoveMode() {
  if (isDownloadMode) deactivateDownloadMode();
  if (isDeleteMode) deactivateDeleteMode();

  isMoveMode = true;
  isMoveNavigating = false;
  selectedMoveItems = [];

  const btn = document.getElementById('MoveBtn');
  const container = document.getElementById('fileListContainer');
  btn.classList.add('active');
  btn.textContent = 'Selecione os itens...';
  container.classList.add('move-mode-active');
}

function deactivateMoveMode() {
  isMoveMode = false;
  isMoveNavigating = false;
  selectedMoveItems = [];

  const btn = document.getElementById('MoveBtn');
  const container = document.getElementById('fileListContainer');
  btn.classList.remove('active');
  btn.textContent = 'Mover';
  btn.disabled = false;
  container.classList.remove('move-mode-active');

  // Remove marcações visuais remanescentes
  document.querySelectorAll('.is-selected-for-move').forEach(row => {
    row.classList.remove('is-selected-for-move');
  });
}

// Gerencia a seleção/deseleção de itens clicados
function toggleMoveSelection(file, rowElement) {
  // Monta o caminho completo de origem do item clicado
  const itemPath = currentPath === '/' 
    ? `/${file.nome_original || file.nome}` 
    : `${currentPath}/${file.nome_original || file.nome}`;

  const index = selectedMoveItems.findIndex(item => item.caminho_origem === itemPath);

  if (index > -1) {
    selectedMoveItems.splice(index, 1);
    rowElement.classList.remove('is-selected-for-move');
  } else {
    selectedMoveItems.push({
      nome: file.nome_original || file.nome,
      tipo: file.tipo === 'pasta' ? 'pasta' : 'arquivo',
      caminho_origem: itemPath
    });
    rowElement.classList.add('is-selected-for-move');
  }

  // Atualiza o texto do botão com base na seleção
  const btn = document.getElementById('MoveBtn');
  if (selectedMoveItems.length > 0) {
    btn.textContent = `OK (${selectedMoveItems.length})`;
  } else {
    btn.textContent = 'Selecione os itens...';
  }
}

// Listener do botão principal de Mover gerenciando a máquina de estados (Toggle -> OK -> Mover Aqui)
document.getElementById('MoveBtn').addEventListener('click', (e) => {
  e.stopPropagation();

  // 1. Primeiro clique ativa o modo seleção
  if (!isMoveMode) {
    activateMoveMode();
    return;
  }

  // 2. Segundo clique (quando o texto vira OK) valida a seleção e libera navegação
  if (isMoveMode && !isMoveNavigating) {
    if (selectedMoveItems.length === 0) {
      deactivateMoveMode();
      return;
    }
    isMoveNavigating = true;
    const btn = document.getElementById('MoveBtn');
    btn.textContent = 'Mover aqui';
    return;
  }

  // 3. Terceiro clique dispara o envio em lote para o destino atual do app
  if (isMoveMode && isMoveNavigating) {
    executeBulkMove();
  }
});

// Desativa o toggle caso o usuário clique completamente fora da lista ou do botão durante a seleção
document.addEventListener('click', (e) => {
  const btn = document.getElementById('MoveBtn');
  const container = document.getElementById('fileListContainer');
  
  if (isMoveMode && !isMoveNavigating && !btn.contains(e.target) && !container.contains(e.target)) {
    deactivateMoveMode();
  }
});

// Executa as requisições sequencialmente respeitando o formato exato esperado pelo backend
async function executeBulkMove() {
  const btn = document.getElementById('MoveBtn');
  btn.textContent = 'Movendo...';
  btn.disabled = true;

  try {
    for (const item of selectedMoveItems) {

      //Monta o caminho completo do destino (pasta atual no momento do clique + nome do item)
      const novo_caminho_destino = currentPath === '/' 
        ? `/${item.nome}` 
        : `${currentPath}/${item.nome}`;

      const bodyPayload = {
        novo_nome_arquivo: novo_caminho_destino, // Caminho destino + nome
        caminho_arquivo: item.caminho_origem, // Caminho completo de onde ele saiu
        pasta_ou_arquivo: item.tipo,         // "pasta" ou "arquivo"
        mover: 'sim'                          // "sim" fixo para reaproveitar a rota
      };

      await apiFetch(`${API_BASE_URL}api/atlas-drive/renomear`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bodyPayload)
      });
    }
  } catch (error) {
    console.error('Erro na requisição em lote para mover:', error);
  } finally {
    // Reseta o estado global e atualiza visualmente a pasta destino atual
    deactivateMoveMode();
    listFolderContents(currentPath);
  }
}






// ══════════════════════════════════════════════
// Lógica de RENOMEAR ARQUIVOS E PASTAS 
// ══════════════════════════════════════════════

let isRenameMode = false;
let itemToRename = null;

function activateRenameMode() {
  if (isDownloadMode) deactivateDownloadMode();
  if (isDeleteMode) deactivateDeleteMode();
  if (isMoveMode) deactivateMoveMode();

  isRenameMode = true;
  const btn = document.getElementById('RenameBtn');
  const container = document.getElementById('fileListContainer');
  btn.classList.add('active');
  btn.textContent = 'Selecione para renomear...';
  container.classList.add('rename-mode-active');
}

function deactivateRenameMode() {
  isRenameMode = false;
  itemToRename = null;
  const btn = document.getElementById('RenameBtn');
  const container = document.getElementById('fileListContainer');
  btn.classList.remove('active');
  btn.textContent = 'Renomear';
  container.classList.remove('rename-mode-active');
}

// Toggle pelo botão principal
document.getElementById('RenameBtn').addEventListener('click', (e) => {
  e.stopPropagation();
  if (isRenameMode) deactivateRenameMode();
  else activateRenameMode();
});

// Desativa se clicar fora da lista ou do botão
document.addEventListener('click', (e) => {
  const btn = document.getElementById('RenameBtn');
  const container = document.getElementById('fileListContainer');
  
  if (isRenameMode && !btn.contains(e.target) && !container.contains(e.target) && !namePromptModal.contains(e.target)) {
    deactivateRenameMode();
  }
});

// Abre o Modal Reaproveitado
function openRenameModal(file) {
  itemToRename = file;
  promptMode = 'rename'; // Ativa a flag para o submit do modal
  
  const nomeAtual = file.nome_original || file.nome;
  namePromptTitle.textContent = 'Renomear ' + (file.tipo === 'pasta' ? 'pasta' : 'arquivo');
  namePromptInput.value = nomeAtual;
  namePromptInput.placeholder = 'Digite o novo nome';
  namePromptModal.showModal();

  // UX Maroto: Seleciona só o nome antes da extensão para arquivos
  if (file.tipo !== 'pasta' && nomeAtual.includes('.')) {
    namePromptInput.setSelectionRange(0, nomeAtual.lastIndexOf('.'));
  } else {
    namePromptInput.select();
  }
}

// Executa a requisição para o backend
async function executeRename(novoNome) {
  if (!itemToRename || !novoNome) return;

  const nome_alvo = itemToRename.nome_original || itemToRename.nome;
  const caminho_arquivo = currentPath === '/' ? `/${nome_alvo}` : `${currentPath}/${nome_alvo}`;

  const bodyPayload = {
    novo_nome_arquivo: novoNome, // Apenas o novo nome escolhido
    caminho_arquivo: caminho_arquivo, // Caminho completo atual
    pasta_ou_arquivo: itemToRename.tipo === 'pasta' ? 'pasta' : 'arquivo',
    mover: 'nao' // Diferencial pro endpoint agir apenas como rename
  };

  try {
    const response = await apiFetch(`${API_BASE_URL}api/atlas-drive/renomear`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(bodyPayload)
    });

    if (response.ok) {
      listFolderContents(currentPath); // Atualiza a tela
    } else {
      console.error('Falha ao renomear arquivo/pasta no servidor');
    }
  } catch (error) {
    console.error('Erro na requisição de renomear:', error);
  } finally {
    deactivateRenameMode();
  }
}










// ════════════════════════════════════════════════════════
// Lógica de ABRIR E EDITAR TXT 
// ════════════════════════════════════════════════════════

let isOpenTxtMode = false;
let editingTxtCaminho = null; // Guarda o caminho se for modo de edição

// Toggle Mode
function activateOpenTxtMode() {
  if (isDownloadMode) deactivateDownloadMode();
  if (isDeleteMode) deactivateDeleteMode();
  if (isMoveMode) deactivateMoveMode();
  if (isRenameMode) deactivateRenameMode();

  isOpenTxtMode = true;
  const btn = document.getElementById('OpenTxtBtn');
  const container = document.getElementById('fileListContainer');
  
  if(btn) {
    btn.classList.add('active');
    btn.textContent = 'Selecione o TXT...';
  }
  container.classList.add('open-txt-mode-active');
}

function deactivateOpenTxtMode() {
  isOpenTxtMode = false;
  const btn = document.getElementById('OpenTxtBtn');
  const container = document.getElementById('fileListContainer');
  
  if(btn) {
    btn.classList.remove('active');
    btn.textContent = 'Ler/Editar TXT';
  }
  container.classList.remove('open-txt-mode-active');
}

// Evento do botão principal (Toggle)
document.getElementById('OpenTxtBtn')?.addEventListener('click', (e) => {
  e.stopPropagation();
  if (isOpenTxtMode) deactivateOpenTxtMode();
  else activateOpenTxtMode();
});

// Desativa se clicar fora
document.addEventListener('click', (e) => {
  const btn = document.getElementById('OpenTxtBtn');
  const container = document.getElementById('fileListContainer');
  const modal = document.getElementById('editorModal');
  
  if (isOpenTxtMode && btn && !btn.contains(e.target) && !container.contains(e.target) && !modal.contains(e.target)) {
    deactivateOpenTxtMode();
  }
});

// Validação e Download Native (em memória)
async function executeOpenTxtClick(file) {
  const nome = file.nome_original || file.nome;
  const ext = nome.toLowerCase().split('.').pop();
  
  // Regra 1: Apenas arquivos .txt
  if (file.tipo === 'pasta' || ext !== 'txt') {
    alert('Erro ao mostrar conteudo: arquivo pode não ser texto (apenas .txt).');
    return;
  }

  // Regra 2: Limite de 5MB
  if (file.tamanho > 5 * 1024 * 1024) {
    alert('Arquivo de texto muito grande para abrir conteúdo - baixe e visualize localmente.');
    return;
  }

  deactivateOpenTxtMode(); // Desativa o toggle visual

  const caminho_arquivo = currentPath === '/' ? `/${nome}` : `${currentPath}/${nome}`;

  try {
    // Baixa o arquivo para a memória usando a rota de download existente
    const response = await apiFetch(`${API_BASE_URL}api/atlas-drive/download`, {
      method: "POST",
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ caminho_arquivo })
    });

    if (!response.ok) throw new Error('Falha no servidor ao baixar TXT');

    // Extrai o texto puro direto do Blob nativo
    const blob = await response.blob();
    const textContent = await blob.text(); 

    // Alimenta o modal e variáveis globais
    editingTxtCaminho = caminho_arquivo; // Sinaliza que estamos editando um arquivo existente
    currentTxtName = nome; 
    
    document.getElementById('editorFilename').textContent = nome;
    document.getElementById('editorTextarea').value = textContent;
    document.getElementById('editorModal').showModal();

  } catch (error) {
    console.error('Erro ao abrir TXT:', error);
    alert('Erro ao carregar o conteúdo do arquivo.');
  }
}

// ════════════════════════════════════════════════════════
// UNIFICAÇÃO DO BOTÃO "SALVAR" (Criar Novo vs Atualizar Existente)
// ════════════════════════════════════════════════════════

// Truque ninja: Clonamos o botão de salvar atual para remover o EventListener antigo dele
// de forma totalmente limpa sem quebrar as outras funções, permitindo unificar a lógica.
const oldSaveBtn = document.getElementById('saveEditorBtn');
const unifiedSaveBtn = oldSaveBtn.cloneNode(true);
oldSaveBtn.parentNode.replaceChild(unifiedSaveBtn, oldSaveBtn);

unifiedSaveBtn.addEventListener('click', async () => {
  unifiedSaveBtn.textContent = 'Salvando...';
  unifiedSaveBtn.disabled = true;

  const content = document.getElementById('editorTextarea').value;
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
  const fileToUpload = new File([blob], currentTxtName, { type: 'text/plain' });

  try {
    // Se 'editingTxtCaminho' estiver preenchido, significa que abrimos um TXT existente.
    // Deletamos a versão original primeiro conforme a regra solicitada.
    if (editingTxtCaminho) {
      await apiFetch(`${API_BASE_URL}api/atlas-drive/delete`, {
        method: "DELETE",
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ caminho_arquivo: editingTxtCaminho, pasta_ou_arquivo: 'arquivo' })
      });
    }

    // Faz o Upload (Funciona tanto pra recém-criados quanto pra edição do arquivo deletado acima)
    const formData = new FormData();
    formData.append('files', fileToUpload);
    formData.append('caminho_escolhido', currentPath);

    const response = await apiFetch(`${API_BASE_URL}api/atlas-drive/upload`, {
      method: 'POST',
      body: formData 
    });

    if (response.ok) {
      document.getElementById('editorModal').close();
      listFolderContents(currentPath); // Atualiza o diretório
    } else {
      alert('Falha ao salvar o arquivo de texto.');
    }
  } catch (error) {
    console.error('Erro no fluxo de save do TXT:', error);
    alert('Erro ao processar o salvamento do arquivo.');
  } finally {
    unifiedSaveBtn.textContent = 'Salvar Arquivo';
    unifiedSaveBtn.disabled = false;
    editingTxtCaminho = null; // Reseta estado de edição
    document.getElementById('editorTextarea').value = ''; // Limpa a memória JS do textarea
  }
});


















// ══════════════════════════════════════════════
// DARK MODE — Integrado com localStorage e o código fornecido
// ══════════════════════════════════════════════

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


// INICIALIZAÇÃO AUTOMÁTICA DA APLICAÇÃO
listFolderContents('/');