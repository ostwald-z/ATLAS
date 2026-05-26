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
    const nomeExibido = file.nome_original || file.nome;
    const sizeStr = file.tipo === 'pasta' ? '—' : formatBytes(file.tamanho);
    const icon = getFileIcon(nomeExibido, file.tipo);

    const row = document.createElement('div');
    row.className = 'file-row';
    row.innerHTML = `
      <div class="col-main">
        <span class="file-icon">${icon}</span>
        <span>${nomeExibido}</span>
      </div>
      <div class="col-meta">${sizeStr}</div>
    `;

    // Duplo clique entra se for pasta
    row.ondblclick = () => {
      if (file.tipo === 'pasta') {
        const targetPath = currentPath === '/' ? `/${file.nome}` : `${currentPath}/${file.nome}`;
        listFolderContents(targetPath);
      }
    };

    // Suporte para cliques simples em dispositivos Mobile entrarem na pasta direto
    row.onclick = () => {
      if (window.innerWidth <= 768 && file.tipo === 'pasta') {
        const targetPath = currentPath === '/' ? `/${file.nome}` : `${currentPath}/${file.nome}`;
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
    // ⚠️ NOTA CRÍTICA: Ao usar FormData, NUNCA defina o header 'Content-Type'. 
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