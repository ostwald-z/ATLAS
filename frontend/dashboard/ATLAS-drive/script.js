// ==========================
// VERIFICAÇÃO DE LOGIN
// ==========================
(async function checkAuth() {
  try {
    const res = await fetch(`${window.CONFIG.API_BASE_URL}api/user/apicheck`, {
      method: 'GET',
      credentials: 'include'
    });

    if (!res.ok) {
      // Token inválido ou não existe -> redireciona
      window.location.href = '../../painelDeLogin/login/index.html';
      return;
    }

    const data = await res.json();
    console.log('Usuário autenticado:', data.user);

  } catch (err) {
    console.error('Erro na verificação de token:', err);
    window.location.href = '../../painelDeLogin/login/index.html';
  }
})();


function normalizarCaminho(caminho) {
  return caminho
    .replace(/\\/g, '/')
    .replace(/^\/+/, '')   // REMOVE / DO INÍCIO
    .replace(/\/+/g, '/'); // REMOVE DUPLICADOS
}



const progressWrapper = document.getElementById('progressWrapper');
const progressBar = document.getElementById('progressBar');



//PEGAR OS ICONES DE ARQUIVOS
function getFileIcon(nome, tipo) {
  if (tipo === 'pasta') return '📁';

  nome = nome.toLowerCase();

  if (nome.match(/\.(jpg|jpeg|png|gif|webp|ico)$/)) return '🖼️';
  if (nome.match(/\.(txt|md)$/)) return '📄';
  if (nome.match(/\.(js|html|css|json)$/)) return '💻';
  if (nome.match(/\.(pdf)$/)) return '📕';
  if (nome.match(/\.(zip|rar)$/)) return '📦';
  if (nome.match(/\.(mp4|webm|mov)$/)) return '🎬';
  if (nome.match(/\.(mp3|wav)$/)) return '🎵';
  if (nome.match(/\.(exe)$/)) return '⚙️';


  return '📄'; // fallback
}



function formatarTamanho(bytes) {
  if (!bytes || bytes === 0) return '0 B';
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return (bytes / Math.pow(1024, i)).toFixed(1) + ' ' + sizes[i];
}



function calcularETA(bytesCarregados, bytesTotal, inicioMs) {
  if (!bytesCarregados || !bytesTotal || !inicioMs) return '';
  const decorrido = (Date.now() - inicioMs) / 1000;
  if (decorrido < 0.5) return '';
  const velocidade = bytesCarregados / decorrido; // bytes/s
  if (velocidade <= 0) return '';
  const restante = (bytesTotal - bytesCarregados) / velocidade;
  if (restante < 1) return '< 1s';
  if (restante < 60) return `~${Math.round(restante)}s`;
  const min = Math.floor(restante / 60);
  const seg = Math.round(restante % 60);
  return `~${min}m ${seg}s`;
}




// Ao carregar a página
fetchFiles('/');





// ==========================
// CONFIGURAÇÕES INICIAIS
// ==========================


// ==========================
// GERENCIADOR DE TRANSFERÊNCIAS
// ==========================

const transferPanel = document.getElementById('transferPanel');
const transferList = document.getElementById('transferList');
const transferPanelHeader = document.getElementById('transferPanelHeader');
const transferToggleIcon = document.getElementById('transferToggleIcon');
const transferCloseBtn = document.getElementById('transferCloseBtn');

let transferencias = {};
let transferIdCounter = 0;
let panelMinimizado = false;

// O mini painel não tem mais X — o header minimiza/expande
transferPanelHeader.onclick = () => {
  panelMinimizado = !panelMinimizado;
  transferList.style.display = panelMinimizado ? 'none' : 'block';
  document.getElementById('transferToggleIcon').textContent = panelMinimizado ? '▸' : '▾';
};

transferPanelHeader.onclick = () => {
  panelMinimizado = !panelMinimizado;
  transferList.style.display = panelMinimizado ? 'none' : 'block';
  transferToggleIcon.textContent = panelMinimizado ? '▸' : '▾';
};

function criarTransferencia(nome, tipo) {
  const id = ++transferIdCounter;

  transferencias[id] = { nome, tipo, percent: 0, status: 'running', inicioMs: Date.now(), xhr: null };

  opCriar(id, nome, tipo, false, null);

  const item = document.createElement('div');
  item.className = 'transfer-item';
  item.id = `transfer-${id}`;

  const icone = tipo === 'upload' ? '⬆️' : '⬇️';

  item.innerHTML = `
    <div class="transfer-item-header">
      <span class="transfer-item-name">${icone} ${nome}</span>
      <div style="display:flex;align-items:center;gap:8px;flex-shrink:0;">
        <span class="transfer-item-status" id="transfer-status-${id}">0%</span>
        <button class="transfer-cancel-btn" id="transfer-cancel-${id}" title="Cancelar">✕</button>
      </div>
    </div>
    <div class="transfer-bar-bg">
      <div class="transfer-bar-fill" id="transfer-bar-${id}"></div>
    </div>
    <div class="transfer-item-eta" id="transfer-eta-${id}"></div>
  `;

  // configura o botão cancelar
  setTimeout(() => {
    const cancelBtn = document.getElementById(`transfer-cancel-${id}`);
    if (cancelBtn) {
      cancelBtn.onclick = () => cancelarTransferencia(id);
    }
  }, 0);

  transferList.appendChild(item);

  // mostra painel
  transferPanel.style.display = 'flex';
  if (panelMinimizado) {
    panelMinimizado = false;
    transferList.style.display = 'block';
    transferToggleIcon.textContent = '▾';
  }

  // scroll pro último
  transferList.scrollTop = transferList.scrollHeight;

  return id;
}

function atualizarTransferencia(id, percent, bytesCarregados, bytesTotal) {
  const bar = document.getElementById(`transfer-bar-${id}`);
  const status = document.getElementById(`transfer-status-${id}`);
  const eta = document.getElementById(`transfer-eta-${id}`);

  if (!bar || !status) return;

  bar.style.width = percent + '%';
  status.textContent = Math.round(percent) + '%';

  if (eta && bytesCarregados && bytesTotal) {
    const t = transferencias[id];
    const etaStr = t ? calcularETA(bytesCarregados, bytesTotal, t.inicioMs) : '';
    eta.textContent = etaStr ? `${formatarTamanho(bytesCarregados)} de ${formatarTamanho(bytesTotal)} · ${etaStr}` : '';
  }

  const _t = transferencias[id];
  if (_t) {
    const etaStr = (bytesCarregados && bytesTotal) ? calcularETA(bytesCarregados, bytesTotal, _t.inicioMs) : '';
    opAtualizar(id, percent, bytesCarregados, bytesTotal, etaStr);
  }

}

function finalizarTransferencia(id, sucesso = true) {

  

  opFinalizar(id, sucesso);

  const bar = document.getElementById(`transfer-bar-${id}`);
  const status = document.getElementById(`transfer-status-${id}`);

  if (!bar || !status) return;

  bar.style.width = '100%';

  if (sucesso) {
    bar.classList.add('done');
    status.textContent = 'Concluído';
    status.classList.add('done');
  } else {
    bar.classList.add('error');
    status.textContent = 'Erro';
    status.classList.add('error');
  }

  // remove após 4s se tudo concluído
  setTimeout(() => {
    const item = document.getElementById(`transfer-${id}`);
    if (item) {
      item.style.opacity = '0';
      item.style.transition = 'opacity 0.3s';
      setTimeout(() => {
        item.remove();
        delete transferencias[id];

        // fecha painel se vazio
        if (transferList.children.length === 0) {
          transferPanel.style.display = 'none';
        }
      }, 300);
    }
  }, 12000);
}


function cancelarTransferencia(id) {

  const t = transferencias[id];
  if (!t) return;
  if (t.xhr) t.xhr.abort();

  const bar = document.getElementById(`transfer-bar-${id}`);
  const status = document.getElementById(`transfer-status-${id}`);
  const cancelBtn = document.getElementById(`transfer-cancel-${id}`);
  const eta = document.getElementById(`transfer-eta-${id}`);

  if (bar) { bar.style.width = '0%'; bar.classList.add('error'); }
  if (status) { status.textContent = 'Cancelado'; status.classList.add('error'); }
  if (cancelBtn) cancelBtn.style.display = 'none';
  if (eta) eta.textContent = '';

  setTimeout(() => {
    const item = document.getElementById(`transfer-${id}`);
    if (item) {
      item.style.opacity = '0';
      item.style.transition = 'opacity 0.3s';
      setTimeout(() => {
        item.remove();
        delete transferencias[id];
        if (transferList.children.length === 0) transferPanel.style.display = 'none';
      }, 300);
    }
  }, 1500);
}







function limparSelecaoVisual() {
  document.querySelectorAll('.file-card').forEach(card => {
    card.classList.remove('selected');
    card.style.border = '';   // 🔥 limpa qualquer inline que sobrou
    card.style.outline = '';
  });
}

function marcarSelecionado(el) {
  el.classList.add('selected');
  el.style.border = '';   // 🔥 garante que inline não sobrescreve o CSS
  el.style.outline = '';
}




function startProgress() {
  progressWrapper.classList.add('active');
  progressBar.style.width = '0%';
}

function updateProgress(percent) {
  progressBar.style.width = percent + '%';
}

function finishProgress() {
  progressBar.style.width = '100%';

  setTimeout(() => {
    progressWrapper.classList.remove('active');
    progressBar.style.width = '0%';
  }, 300);
}


const selectionBox = document.getElementById('selectionBox');

let isSelecting = false;
let startX = 0;
let startY = 0;


let itemSendoArrastado = null;

let itensSelecionados = new Set();

let currentPath = '/';
let arquivosAtuais = []; // 🔥 ADICIONA ISSO

const fileContainer = document.getElementById('fileContainer');
const currentPathEl = document.getElementById('currentPath');

// ==========================
// DROP NA ÁREA VAZIA (ROOT DA PASTA ATUAL)
// ==========================

fileContainer.ondragover = (e) => {
  e.preventDefault();
  fileContainer.classList.add('drag-over');
};

fileContainer.ondragleave = (e) => {
  // evita bug quando passa por filhos
  if (!fileContainer.contains(e.relatedTarget)) {
    fileContainer.classList.remove('drag-over');
  }
};



fileContainer.ondrop = (e) => {
  e.preventDefault();
  
  fileContainer.classList.remove('drag-over');

  const target = e.target.closest('.file-card');

  if (target) return;

  // se estiver sobre um card (pasta), ignora o drop do fundo
  if (target && target.dataset.type === 'pasta') return;

  if (!itemSendoArrastado) return;



  itemSendoArrastado.forEach(item => {
    // evita mover para si mesmo
    if (item.caminho === currentPath) return;

    const destinoFinal = currentPath === '/'
      ? item.nome
      : currentPath + '/' + item.nome;

    renameFile(
      item.caminho,
      normalizarCaminho(destinoFinal),
      item.tipo,
      "sim"
    );
  });

  itensSelecionados.clear();
};




// ==========================
// FUNÇÃO PRINCIPAL: BUSCAR ARQUIVOS
// ==========================
async function fetchFiles(path = '/') {
  try {
    const response = await fetch(`${window.CONFIG.API_BASE_URL}api/atlas-drive/cloud?path=${encodeURIComponent(path)}`, {
      method: 'GET',
      credentials: 'include'
    });
    if (!response.ok) throw new Error('Erro ao buscar arquivos');

    const data = await response.json();
    console.log('Dados recebidos do backend:', data);

    // Agora pegamos a lista de arquivos do campo "arquivos"
    const files = Array.isArray(data.arquivos) ? data.arquivos : [];

    const ordenado = [
      ...files.filter(f => f.tipo === 'pasta').sort((a, b) => (a.nome_original || a.nome).localeCompare(b.nome_original || b.nome)),
      ...files.filter(f => f.tipo !== 'pasta').sort((a, b) => (a.nome_original || a.nome).localeCompare(b.nome_original || b.nome))
    ];

    renderFiles(ordenado);
    currentPath = path;
    currentPathEl.textContent = path;
    renderPath(path);
  } catch (error) {
    console.error('fetchFiles:', error);
    fileContainer.innerHTML = `<div style="color:red;">Erro ao carregar arquivos</div>`;
  }
}

// ==========================
// ABRIR ARQUIVOS OU PASTAS
// ==========================
function openItem(nome, tipo) {
  const caminho_relativo = currentPath === '/' ? nome : currentPath + '/' + nome;

  // Agora o openItem SÓ abre pastas (clique esquerdo)
  if (tipo === 'pasta') {
    fetchFiles(caminho_relativo);
  }
}

// ==========================
// UPLOAD DE ARQUIVOS
// ==========================
function uploadFile() {
  const input = document.createElement('input');
  input.type = 'file';
  input.multiple = true;

  input.onchange = () => {
    if (!input.files.length) return;

    Array.from(input.files).forEach(file => {
      const formData = new FormData();
      formData.append('files', file);
      formData.append('caminho_escolhido', currentPath);

      const id = criarTransferencia(file.name, 'upload');
      const xhr = new XMLHttpRequest();
      if (transferencias[id]) transferencias[id].xhr = xhr;

      if (_opAtivas[id]) _opAtivas[id].xhrRef = xhr;

      xhr.open('POST', `${window.CONFIG.API_BASE_URL}api/atlas-drive/upload`, true);
      xhr.withCredentials = true;

      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) {
          atualizarTransferencia(id, (e.loaded / e.total) * 100, e.loaded, e.total);
        }
      };

      xhr.onload = () => {
        if (xhr.status === 200) {
          finalizarTransferencia(id, true);
          fetchFiles(currentPath);
        } else {
          finalizarTransferencia(id, false);
        }
      };

      xhr.onerror = () => finalizarTransferencia(id, false);

      xhr.send(formData);
    });
  };

  input.click();
}

// ==========================
// RENDERIZAÇÃO DE ARQUIVOS
// ==========================


async function tentarPreviewIcone(file) {
  if (file.tipo === 'pasta') return;

  const nome = (file.nome_original || file.nome).toLowerCase();

  // só tenta nesses tipos
  if (!nome.match(/\.(jpg|jpeg|png|webp|gif)$/)) return;

  const caminho_relativo = currentPath === '/' 
    ? file.nome 
    : currentPath + '/' + file.nome;

  try {
    const response = await fetch(`${window.CONFIG.API_BASE_URL}api/atlas-drive/download`, {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        caminho_arquivo: caminho_relativo
      })
    });

    if (!response.ok) return;

    const blob = await response.blob();
    const url = URL.createObjectURL(blob);

    const iconEl = document.getElementById(`icon-${file.nome}`);
    if (!iconEl) return;

    // 🖼 IMAGEM
    if (nome.match(/\.(jpg|jpeg|png|webp|gif)$/)) {
      iconEl.innerHTML = `<img src="${url}" style="width:100%; height:80px; object-fit:cover; border-radius:6px;">`;
    }

    // 📄 PDF (thumbnail fake)
    else if (nome.match(/\.pdf$/)) {
      iconEl.innerHTML = `<iframe src="${url}" style="width:100%; height:80px; border:none;"></iframe>`;
    }

  } catch (err) {
    console.error('Erro preview icone:', err);
  }
}



function renderFiles(files) {
  arquivosAtuais = files;
  fileContainer.innerHTML = '';

  if (!files.length) {
    fileContainer.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">◫</div>
        <div>Nenhum arquivo nesta pasta</div>
      </div>`;
    return;
  }

  files.forEach(file => {
    const div = document.createElement('div');
    div.className = 'file-card';
    div.dataset.type = file.tipo;
    div.dataset.nome = file.nome;

    const nomeExibido = file.nome_original || file.nome;
    const ext = file.tipo === 'pasta'
      ? '—'
      : (nomeExibido.includes('.') ? nomeExibido.split('.').pop().toLowerCase() : '—');
    const tipo = file.tipo === 'pasta' ? 'Pasta' : 'Arquivo';
    const tamanho = file.tipo === 'pasta' ? '—' : formatarTamanho(file.tamanho);
    const icone = getFileIcon(nomeExibido, file.tipo);

    div.innerHTML = `
      <div class="file-icon" id="icon-${file.nome}">${icone}</div>
      <div class="file-name-col">
        <span class="file-name">${nomeExibido}</span>
      </div>
      <div class="file-type-col">${tipo}</div>
      <div class="file-size-col">${tamanho}</div>
      <div class="file-ext-col">
        ${ext !== '—' ? `<span class="file-ext-badge">${ext}</span>` : '<span style="color:var(--text-muted)">—</span>'}
      </div>
    `;

    // seleção ctrl+click
    div.onclick = (e) => {
      if (isMobileViewport() && mobileSelectionMode) {
        toggleSelecaoItem(file, div);
        return;
      }

      if (e.ctrlKey) {
        if (itensSelecionados.has(file.nome)) {
          itensSelecionados.delete(file.nome);
          div.classList.remove('selected');
        } else {
          itensSelecionados.add(file.nome);
          div.classList.add('selected');
        }
        atualizarContadorSelecao();
        return;
      }
      itensSelecionados.clear();
      limparSelecaoVisual();
      if (file.tipo === 'pasta') openItem(file.nome, file.tipo);
      atualizarContadorSelecao();
    };

    div.draggable = true;

    div.ondragstart = (e) => {
      fileContainer.classList.remove('drag-over');
      if (!itensSelecionados.has(file.nome)) {
        limparSelecaoVisual();
        itensSelecionados.clear();
        itensSelecionados.add(file.nome);
        div.classList.add('selected');
      }
      itemSendoArrastado = Array.from(itensSelecionados).map(nome => {
        const caminho = currentPath === '/' ? nome : currentPath + '/' + nome;
        const tipoItem = files.find(f => f.nome === nome)?.tipo || 'arquivo';
        return { nome, tipo: tipoItem, caminho };
      });
      const ghost = document.createElement('div');
      ghost.style.cssText = `
        position: absolute;
        top: -9999px;
        left: -9999px;
        padding: 10px 14px;
        background: #0d1424;
        border: 1px solid rgba(34,211,238,0.4);
        border-radius: 8px;
        color: #e2e8f0;
        font-size: 12px;
        font-family: Inter, sans-serif;
        box-shadow: 0 16px 40px rgba(0,0,0,0.7);
        display: flex;
        flex-direction: column;
        gap: 5px;
        min-width: 180px;
        max-width: 240px;
      `;

      const selecionados = Array.from(itensSelecionados);
      const visiveis = selecionados.slice(0, 4);
      const resto = selecionados.length - visiveis.length;

      visiveis.forEach(nome => {
        const f = arquivosAtuais.find(x => x.nome === nome);
        const icone = f ? getFileIcon(f.nome_original || f.nome, f.tipo) : '📄';
        const nomeCurto = (f?.nome_original || nome).length > 28
          ? (f?.nome_original || nome).slice(0, 25) + '...'
          : (f?.nome_original || nome);

        const row = document.createElement('div');
        row.style.cssText = 'display:flex;align-items:center;gap:8px;';
        row.innerHTML = `
          <span style="font-size:14px;flex-shrink:0;">${icone}</span>
          <span style="color:#94a3b8;font-size:11px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${nomeCurto}</span>
        `;
        ghost.appendChild(row);
      });

      if (resto > 0) {
        const mais = document.createElement('div');
        mais.style.cssText = 'color:rgba(34,211,238,0.7);font-size:10px;padding-top:3px;border-top:1px solid rgba(255,255,255,0.06);margin-top:2px;';
        mais.textContent = `+ ${resto} outro${resto > 1 ? 's' : ''}`;
        ghost.appendChild(mais);
      }

      document.body.appendChild(ghost);
      e.dataTransfer.setDragImage(ghost, 16, 16);
      setTimeout(() => ghost.remove(), 0);
      div.style.opacity = '0.4';
    };

    div.ondragend = () => {
      itemSendoArrastado = null;
      div.style.opacity = '1';
      atualizarContadorSelecao();
    };

    if (file.tipo === 'pasta') {
      let pastaHoverTimer;

      div.ondragover = (e) => {
        e.preventDefault();
        e.stopPropagation();
        div.classList.add('selected');

        if (!pastaHoverTimer) {
          pastaHoverTimer = setTimeout(() => {
            openItem(file.nome, file.tipo); // 🔥 abre a pasta após 1.2s segurando
          }, 1200);
        }
      };

      div.ondragleave = () => {
        div.classList.remove('selected');
        clearTimeout(pastaHoverTimer);
        pastaHoverTimer = null;
      };

      div.ondrop = (e) => {
        e.preventDefault(); e.stopPropagation();
        fileContainer.classList.remove('drag-over');
        div.classList.remove('selected');
        clearTimeout(pastaHoverTimer); // 🔥
        if (!itemSendoArrastado) return;
        const destino = currentPath === '/' ? file.nome : currentPath + '/' + file.nome;
        itemSendoArrastado.forEach(item => {
          if (item.caminho.startsWith(destino)) return;
          renameFile(item.caminho, normalizarCaminho(destino + '/' + item.nome), item.tipo, "sim");
        });
        itensSelecionados.clear();
      };
      div.onclick = (e) => {
        if (isMobileViewport() && mobileSelectionMode) {
          toggleSelecaoItem(file, div);
          return;
        }

        if (e.ctrlKey) {
          if (itensSelecionados.has(file.nome)) { itensSelecionados.delete(file.nome); div.classList.remove('selected'); }
          else { itensSelecionados.add(file.nome); div.classList.add('selected'); }
          atualizarContadorSelecao(); return;
        }

        // 🔥 UX PREMIUM MOBILE: Se a tela for pequena, 1 clique = abre a pasta. Se for PC, seleciona.
        if (window.innerWidth <= 768 && file.tipo === 'pasta') {
          openItem(file.nome, file.tipo);
          return;
        }

        // Clique simples no PC (ou em arquivo no Mobile) só seleciona
        itensSelecionados.clear();
        limparSelecaoVisual();
        div.classList.add('selected');
        itensSelecionados.add(file.nome);
        atualizarContadorSelecao();
      };

      // Double click (Usado primariamente em Desktop)
      div.ondblclick = () => {
        openItem(file.nome, file.tipo);
      };
      div.oncontextmenu = (e) => { e.preventDefault(); abrirMenuContextoPasta(e, file.nome); };
    } else {
      div.oncontextmenu = (e) => { e.preventDefault(); abrirMenuContexto(e, file.nome, file.nome_original); };
    }

    fileContainer.appendChild(div);
    tentarPreviewIcone(file);
  });
}


const selectionInfo = document.getElementById('selectionInfo');
const mobileFabEl = document.getElementById('mobileFab');
const moveFolderPicker = document.getElementById('moveFolderPicker');
const moveFolderCurrentPathEl = document.getElementById('moveFolderCurrentPath');
const moveFolderListEl = document.getElementById('moveFolderList');
const moveFolderCloseBtn = document.getElementById('moveFolderCloseBtn');
const moveFolderCancelBtn = document.getElementById('moveFolderCancelBtn');
const moveFolderConfirmBtn = document.getElementById('moveFolderConfirmBtn');
const moveFolderUpBtn = document.getElementById('moveFolderUpBtn');
const moveFolderRootBtn = document.getElementById('moveFolderRootBtn');
let mobileSelectionMode = false;
let movePickerPath = '/';

function isMobileViewport() {
  return window.innerWidth <= 768;
}

function showMobileToast(message, type = 'info', duration = 2400) {
  if (!message) return;

  let wrap = document.getElementById('mobileToastWrap');
  if (!wrap) {
    wrap = document.createElement('div');
    wrap.id = 'mobileToastWrap';
    wrap.className = 'mobile-toast-wrap';
    document.body.appendChild(wrap);
  }

  const toast = document.createElement('div');
  toast.className = `mobile-toast ${type}`;
  toast.textContent = message;
  wrap.appendChild(toast);

  requestAnimationFrame(() => toast.classList.add('show'));

  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 220);
  }, duration);
}

function setMobileSelectionMode(enabled) {
  const prev = mobileSelectionMode;
  mobileSelectionMode = !!enabled;
  document.body.classList.toggle('mobile-select-mode', mobileSelectionMode);

  if (!mobileSelectionMode) {
    itensSelecionados.clear();
    limparSelecaoVisual();
  }

  // Sem toast — o indicador visual na topbar já comunica o estado
  _atualizarIndicadorSelecao();

  // Reset visual do FAB
  const fab = document.getElementById('mobileFab');
  if (fab) {
    fab.style.background = '';
    fab.style.boxShadow  = '';
    fab.textContent      = '+';
  }



  atualizarContadorSelecao();
}




function _atualizarIndicadorSelecao() {
  let bar = document.getElementById('mobileSelectBar');

  if (!mobileSelectionMode) {
    if (bar) {
      bar.style.transform = 'translateY(-100%)';
      bar.style.opacity = '0';
      setTimeout(() => bar?.remove(), 250);
    }
    return;
  }

  if (!bar) {
    bar = document.createElement('div');
    bar.id = 'mobileSelectBar';
    bar.style.cssText = `
      position: fixed;
      top: 0; left: 0; right: 0;
      z-index: 950;
      height: 3px;
      background: linear-gradient(90deg, #22d3ee, #818cf8, #22d3ee);
      background-size: 200% 100%;
      animation: selectBarSlide 2s linear infinite;
      transform: translateY(0);
      transition: transform 0.25s ease, opacity 0.25s ease;
    `;
    document.body.appendChild(bar);
  }

  // Pulsa o FAB para comunicar modo ativo
  const fab = document.getElementById('mobileFab');
  if (fab) {
    fab.style.background = '#818cf8';
    fab.style.boxShadow  = '0 4px 20px rgba(129,140,248,0.5)';
    fab.textContent      = '✓';
  }
}













function toggleSelecaoItem(file, cardEl) {
  if (itensSelecionados.has(file.nome)) {
    itensSelecionados.delete(file.nome);
    cardEl.classList.remove('selected');
  } else {
    itensSelecionados.add(file.nome);
    cardEl.classList.add('selected');
  }
  atualizarContadorSelecao();
}

async function carregarPastasParaMover(path = '/') {
  const alvo = path || '/';
  movePickerPath = alvo;
  moveFolderCurrentPathEl.textContent = alvo;
  moveFolderListEl.innerHTML = `<div class="move-folder-empty">Carregando pastas...</div>`;

  try {
    let response;
    if (vaultMode) {
      response = await fetch(
        `${window.CONFIG.API_BASE_URL}api/atlas-drive/vault/listar?path=${encodeURIComponent(alvo)}`,
        {
          method: 'GET',
          credentials: 'include',
          headers: { 'Authorization': `Bearer ${vaultToken}` }
        }
      );
    } else {
      response = await fetch(
        `${window.CONFIG.API_BASE_URL}api/atlas-drive/cloud?path=${encodeURIComponent(alvo)}`,
        {
          method: 'GET',
          credentials: 'include'
        }
      );
    }

    if (!response.ok) throw new Error('Erro ao listar pastas');
    const data = await response.json();
    const files = Array.isArray(data?.arquivos) ? data.arquivos : (Array.isArray(data) ? data : []);
    const pastas = files
      .filter(item => item.tipo === 'pasta')
      .sort((a, b) => (a.nome_original || a.nome).localeCompare(b.nome_original || b.nome));

    if (!pastas.length) {
      moveFolderListEl.innerHTML = `<div class="move-folder-empty">Nenhuma subpasta neste destino.</div>`;
      return;
    }

    moveFolderListEl.innerHTML = '';
    pastas.forEach((pasta) => {
      const nome = pasta.nome_original || pasta.nome;
      const row = document.createElement('button');
      row.type = 'button';
      row.className = 'move-folder-item';
      row.innerHTML = `<span>📁 ${nome}</span><span>›</span>`;
        
      row.onclick = (e) => {
        e.stopPropagation(); // 🔥 IMPEDE QUE O CLIQUE VAZE E LIMPE A SELEÇÃO
          
        // Mobile: prioriza caminho absoluto/relativo retornado pelo backend
        const backendPath = (pasta.caminho_relativo || pasta.caminho || '').toString().trim();
        const prox = backendPath
          ? `/${normalizarCaminho(backendPath)}`
          : (alvo === '/' ? `/${pasta.nome}` : `${alvo}/${pasta.nome}`);
        carregarPastasParaMover(prox);
          
        // Feedback visual de navegação
        row.style.opacity = '0.5';
        row.style.pointerEvents = 'none';
      };
      moveFolderListEl.appendChild(row);
    });
  } catch (err) {
    console.error('carregarPastasParaMover:', err);
    moveFolderListEl.innerHTML = `<div class="move-folder-empty">Falha ao carregar pastas.</div>`;
    showMobileToast('Nao foi possivel carregar as pastas.', 'error', 2200);
  }
}

function abrirMoveFolderPicker() {
  if (!isMobileViewport()) {
    return;
  }

  if (!itensSelecionados.size) {
    showMobileToast('Selecione pelo menos um item.', 'info', 1800);
    return;
  }

  // DEPOIS:
  movePickerPath = currentPath;
  moveFolderPicker.classList.add('open');
  carregarPastasParaMover(movePickerPath);
}

function fecharMoveFolderPicker() {
  moveFolderPicker.classList.remove('open');
}



function _showMoveFeedback(tipo, count) {
  // Feedback visual no botão confirmar do picker — sem toast
  const btn = document.getElementById('moveFolderConfirmBtn');
  if (!btn) return;

  const configs = {
    loading: { text: `Movendo ${count}...`,     color: '#22d3ee', disabled: true  },
    success: { text: `✓ ${count} movido(s)`,     color: '#4ade80', disabled: false },
    error:   { text: `✕ Falha em ${count}`,      color: '#f87171', disabled: false },
    same:    { text: 'Já está aqui',             color: '#f59e0b', disabled: false },
  };

  const cfg = configs[tipo];
  if (!cfg) return;

  btn.textContent    = cfg.text;
  btn.style.color    = cfg.color;
  btn.disabled       = cfg.disabled;

  if (tipo !== 'loading') {
    setTimeout(() => {
      btn.textContent  = 'Mover para cá';
      btn.style.color  = '';
      btn.disabled     = false;
    }, 2000);
  }
}














async function executarMoverSelecionadosPara(destinoPath) {
  const destinoBase = destinoPath || '/';

  // Normaliza SEM barra inicial — padrão do backend
  const destinoNorm = normalizarCaminho(destinoBase);  
  const origemNorm  = normalizarCaminho(currentPath || '/'); 

  const selecionados = Array.from(itensSelecionados);
  if (!selecionados.length) return { sucesso: 0, falhas: 0 };

  // Bloqueia só se destino E origem forem a mesma pasta
  if (destinoNorm === origemNorm) {
    _showMoveFeedback('same');
    return { sucesso: 0, falhas: selecionados.length };
  }

  _showMoveFeedback('loading', selecionados.length);

  const tarefas = selecionados.map((nomeItem) => {
    // Busca o arquivo, mas aplica um fallback seguro se o estado se perder
    const file = arquivosAtuais.find(f => f.nome === nomeItem);
    const tipoItem = file ? (file.tipo === 'pasta' ? 'pasta' : 'arquivo') : 'arquivo';

    // Construção de caminho BLINDADA (Mesma lógica usada no Drag and Drop do PC)
    // Garante que não teremos barras duplas ou caminhos malformados
    const origemFinal = normalizarCaminho(origemNorm + '/' + nomeItem);
    const destinoFinal = normalizarCaminho(destinoNorm + '/' + nomeItem);

    // Envia a requisição
    return renameFile(origemFinal, destinoFinal, tipoItem, 'sim');
  });

  const resultados = await Promise.all(tarefas);
  const sucesso = resultados.filter(Boolean).length;
  const falhas  = resultados.length - sucesso;

  if (sucesso > 0) {
    _showMoveFeedback('success', sucesso);
    setMobileSelectionMode(false);
    fetchFiles(currentPath);
  }
  if (falhas > 0) {
    _showMoveFeedback('error', falhas);
  }

  return { sucesso, falhas };
}



function atualizarContadorSelecao() {
  if (itensSelecionados.size === 0) {
    selectionInfo.style.display = 'none';
    return;
  }

  selectionInfo.style.display = 'block';

  const nomes = Array.from(itensSelecionados)
    .map(nome => {
      const f = arquivosAtuais.find(f => f.nome === nome);
      return f ? (f.nome_original || f.nome) : nome;
    })
    .slice(0, 5);

  const resumo = `
    <div class="selection-info-title">${itensSelecionados.size} item(s) selecionado(s)</div>
    <div class="selection-info-list">
      ${nomes.join('<br>--------------------<br>')}
      ${itensSelecionados.size > 5 ? '<br>...' : ''}
    </div>
  `;

  if (!isMobileViewport()) {
    selectionInfo.innerHTML = resumo;
    return;
  }

  const qtd = itensSelecionados.size;
  selectionInfo.innerHTML = `
    <div class="selection-info-title">${qtd} item${qtd > 1 ? 's' : ''} selecionado${qtd > 1 ? 's' : ''}</div>
    <div class="selection-info-actions">
      <button class="selection-action-btn primary" data-selection-action="move" ${qtd === 0 ? 'disabled' : ''}>✂️ Mover</button>
      <button class="selection-action-btn" data-selection-action="select-all">Todos</button>
      <button class="selection-action-btn" data-selection-action="clear">Limpar</button>
      <button class="selection-action-btn danger" data-selection-action="exit">✕ Sair</button>
    </div>
  `;

  _atualizarIndicadorSelecao();

}

selectionInfo.addEventListener('click', (e) => {

  e.stopPropagation(); // 🔥

  const action = e.target?.dataset?.selectionAction;
  if (!action) return;

  if (action === 'clear') {
    itensSelecionados.clear();
    limparSelecaoVisual();
    atualizarContadorSelecao();
    if (isMobileViewport()) showMobileToast('Selecao limpa.', 'info', 1600);
    return;
  }

  // DEPOIS:
  if (action === 'select-all') {
    // Garante que o modo seleção mobile está ativo antes de selecionar tudo
    if (isMobileViewport() && !mobileSelectionMode) {
      setMobileSelectionMode(true);
    }
    document.querySelectorAll('.file-card').forEach(card => {
      const nome = card.dataset.nome;
      if (!nome) return;
      itensSelecionados.add(nome);
      card.classList.add('selected');
    });
    atualizarContadorSelecao();
    if (isMobileViewport()) showMobileToast('Todos os itens visíveis selecionados.', 'success', 1900);
    return;
  }

  if (action === 'exit') {
    setMobileSelectionMode(false);
    return;
  }

  if (action === 'move') {
    if (!isMobileViewport()) return;
    abrirMoveFolderPicker();
  }
});

if (moveFolderCloseBtn) moveFolderCloseBtn.onclick = fecharMoveFolderPicker;
if (moveFolderCancelBtn) moveFolderCancelBtn.onclick = fecharMoveFolderPicker;
if (moveFolderPicker) {
  moveFolderPicker.addEventListener('click', (e) => {
    if (e.target === moveFolderPicker) fecharMoveFolderPicker();
  });
}
if (moveFolderRootBtn) moveFolderRootBtn.onclick = () => carregarPastasParaMover('/');
if (moveFolderUpBtn) {
  moveFolderUpBtn.onclick = () => {
    if (movePickerPath === '/') return;
    const partes = movePickerPath.split('/').filter(Boolean);
    partes.pop();
    const acima = '/' + partes.join('/');
    carregarPastasParaMover(acima === '/' ? '/' : acima);
  };
}
if (moveFolderConfirmBtn) {
  moveFolderConfirmBtn.onclick = async () => {
    const btnTxt = moveFolderConfirmBtn.textContent;
    moveFolderConfirmBtn.disabled = true;
    moveFolderConfirmBtn.textContent = 'Movendo...';
    const resultadoMover = await executarMoverSelecionadosPara(movePickerPath);
    moveFolderConfirmBtn.disabled = false;
    moveFolderConfirmBtn.textContent = btnTxt;
    if (resultadoMover?.sucesso > 0 || resultadoMover?.falhas === 0) {
      fecharMoveFolderPicker();
    }
  };
}

window.addEventListener('resize', () => {
  if (isMobileViewport()) return;

  // A feature "Mover para pasta" e exclusiva do mobile.
  // Ao sair do viewport mobile, garante que qualquer estado residual seja limpo.
  fecharMoveFolderPicker();
  if (mobileSelectionMode) {
    setMobileSelectionMode(false);
  }
});




function renderPath(path) {
  currentPathEl.innerHTML = '';
  const partes = path.split('/').filter(Boolean);
  let caminhoTemp = '';
  criarSegmentoPath('ATLAS', '/', partes.length === 0);
  partes.forEach((pasta, i) => {
    caminhoTemp = caminhoTemp ? caminhoTemp + '/' + pasta : pasta;
    criarSegmentoPath(pasta, '/' + caminhoTemp, i === partes.length - 1);
  });
}





function criarSegmentoPath(nome, caminho, isLast) {
  const wrapper = document.createElement('div');
  wrapper.style.cssText = 'display:flex;align-items:center;gap:2px;flex-shrink:0;';

  if (caminho !== '/') {
    const sep = document.createElement('span');
    sep.className = 'path-separator';
    sep.textContent = '/';
    wrapper.appendChild(sep);
  }

  const el = document.createElement('div');
  el.className = 'path-segment';
  if (isLast) el.style.color = 'var(--text-primary)';
  el.textContent = nome;

  let hoverTimer;

  el.ondragenter = (e) => {
    e.preventDefault(); e.stopPropagation();
    el.classList.add('drop-hover');
    hoverTimer = setTimeout(() => fetchFiles(caminho), 1200);
  };
  el.ondragleave = () => { clearTimeout(hoverTimer); el.classList.remove('drop-hover'); };
  el.onclick = () => fetchFiles(caminho);
  el.ondragover = (e) => { e.preventDefault(); el.classList.add('drop-hover'); };
  el.ondrop = (e) => {
    e.preventDefault();
    clearTimeout(hoverTimer);
    el.classList.remove('drop-hover');
    if (!itemSendoArrastado) return;
    itemSendoArrastado.forEach(item => {
      if (item.caminho.startsWith(caminho)) return;
      const destinoFinal = caminho === '/' ? item.nome : caminho + '/' + item.nome;
      renameFile(item.caminho, normalizarCaminho(destinoFinal), item.tipo, "sim");
    });
    itensSelecionados.clear();
  };

  wrapper.appendChild(el);
  currentPathEl.appendChild(wrapper);
}



// DOWNLOAD DE ARQUIVOS

function downloadFile(caminho_relativo, nomeOriginal) {
  const id = criarTransferencia(nomeOriginal || caminho_relativo, 'download');

  // monta URL com query (evita POST + blob)
  const url = new URL(`${window.CONFIG.API_BASE_URL}api/atlas-drive/download`);
  url.searchParams.append("caminho_arquivo", caminho_relativo);

  // cria link invisível
  const a = document.createElement('a');
  a.href = url.toString();
  a.download = nomeOriginal || caminho_relativo;

  // necessário pra cookies (auth)
  a.rel = "noopener";

  document.body.appendChild(a);

  // inicia download nativo
  a.click();

  a.remove();

  /**
   * ⚠️ IMPORTANTE:
   * aqui NÃO temos mais progresso real
   * então você pode:
   * - marcar como iniciado
   * - e finalizar depois de um tempo fake (UX)
   */

  atualizarTransferencia(id, 5); // só pra dar feedback inicial

  // simulação simples (opcional)
  setTimeout(() => {
    finalizarTransferencia(id, true);
  }, 2000);
}








function getIcon(nome) {
  if (nome.match(/\.(jpg|jpeg|png|gif|webp)$/)) return "🖼️";
  if (nome.match(/\.(txt|json|js|html|css)$/)) return "📄";
  if (nome.match(/\.(zip)$/)) return "📦";
  return "📁";
}


function formatarNomeArquivo(nome) {
  if (nome.length > 50) {
    return nome.slice(0, 47) + '...';
  }
  return nome;
}

//FUNÇÃO QUE VISUALIZA OS ARQUIVOS
async function visualizarArquivo(caminho_relativo, nomeOriginal) {
  try {
    startProgress();

    const response = await fetch(`${window.CONFIG.API_BASE_URL}api/atlas-drive/download`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ caminho_arquivo: caminho_relativo })
    });

    if (!response.ok) throw new Error('Erro ao buscar arquivo');

    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const nome = (nomeOriginal || '').toLowerCase();

    _abrirPreviewModal(url, blob, nome, nomeOriginal, caminho_relativo, false);

  } catch (err) {
    console.error(err);
    alert('Erro ao visualizar arquivo');
  } finally {
    finishProgress();
  }
}





async function deleteFile(caminho_relativo, pasta_ou_arquivo) {
  try {
    const response = await fetch(`${window.CONFIG.API_BASE_URL}api/atlas-drive/delete`, {
      method: 'DELETE',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ 
        caminho_arquivo: caminho_relativo,
        pasta_ou_arquivo: pasta_ou_arquivo
      })
    });

    if (!response.ok) throw new Error('Erro ao deletar o arquivo');


    fetchFiles(currentPath);
  }catch(error){
    console.error('deleteFile:', error);
    alert('Erro ao deletar arquivo');
  }
}



// ==========================
// CONFIGURAÇÃO UX PRA RENOMEAR ARQUIVOS
// ==========================





const renameModal = document.getElementById('renameModal');
const renameInput = document.getElementById('renameInput');
const confirmRename = document.getElementById('confirmRename');
const cancelRename = document.getElementById('cancelRename');

let arquivoParaRenomear = null;





function abrirModalRenomear(nomeAtual, caminho_relativo, tipo = "arquivo") {
  arquivoParaRenomear = { nomeAtual, caminho_relativo, tipo };

  renameInput.value = nomeAtual;
  renameModal.classList.add('active');

  setTimeout(() => {
    renameInput.focus();
    renameInput.select();
  }, 100);
}

function fecharModalRenomear() {
  renameModal.classList.remove('active');
  arquivoParaRenomear = null;

  // Reseta título e placeholder pro padrão
  const tituloModal = renameModal.querySelector('h3');
  tituloModal.textContent = 'Renomear Item';
  renameInput.placeholder = 'Novo nome...';
}

// RENOMEIA TANTO ARQUIVO QUANTO PASTA - DEPENDENDO DE COMO O CAMINHO DIRETORIO É ENVIADO
async function renameFile(caminho_relativo, novo_nome, pasta_ou_arquivo, mover) {
  try {
    const response = await fetch(`${window.CONFIG.API_BASE_URL}api/atlas-drive/renomear`, {
      method: 'PATCH',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        caminho_arquivo: caminho_relativo,
        novo_nome_arquivo: novo_nome,
        pasta_ou_arquivo: pasta_ou_arquivo,
        mover: mover

      })
    });

    if (!response.ok) throw new Error('Erro ao renomear');

    fetchFiles(currentPath);
    return true;

  } catch (error) {
    console.error('renameFile:', error);
    if (isMobileViewport()) showMobileToast('Falha ao mover/renomear item.', 'error', 2300);
    else alert('Erro ao renomear arquivo');
    return false;
  }
}



confirmRename.onclick = () => {
  if (!arquivoParaRenomear) return;

  const novoNome = renameInput.value.trim();

  if (!novoNome) {
    alert('Nome inválido');
    return;
  }

  const mover = "nao"

  renameFile(
    arquivoParaRenomear.caminho_relativo,
    novoNome,
    arquivoParaRenomear.tipo,
    mover
  );

  fecharModalRenomear();
};

cancelRename.onclick = fecharModalRenomear;


renameModal.addEventListener('click', (e) => {
  if (e.target === renameModal) {
    fecharModalRenomear();
  }
});


renameInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    confirmRename.click();
  }
});



// ==========================
// LÓGICA DO MENU DE CONTEXTO
// ==========================

const criarArquivo = document.getElementById('criarArquivo');
const criarPasta = document.getElementById('criarPasta');

const previewHeader = document.getElementById('previewHeader');
const visualizarItem = document.getElementById('visualizarItem');
const previewModal = document.getElementById('previewModal');
const previewContent = document.getElementById('previewContent');


const contextMenu = document.getElementById('contextMenu');
const downloadOption = document.getElementById('downloadOption');
const MudarNomeOption = document.getElementById("MudarNomeOption");
const deletarArquivo = document.getElementById("deletarArquivo")




// ── PREVIEW MODAL — LÓGICA CENTRAL ────────────────
let _previewCurrentUrl = null;
let _previewCurrentCaminho = null;
let _previewCurrentNome = null;
let _previewIsVault = false;

function _abrirPreviewModal(url, blob, nome, nomeOriginal, caminho, isVault) {
  _previewCurrentUrl = url;
  _previewCurrentCaminho = caminho;
  _previewCurrentNome = nomeOriginal;
  _previewIsVault = isVault;

  const iconEl = document.getElementById('previewHeaderIcon');
  const headerEl = document.getElementById('previewHeader');
  const contentEl = document.getElementById('previewContent');
  const modal = document.getElementById('previewModal');

  headerEl.textContent = nomeOriginal || nome;
  iconEl.textContent = getFileIcon(nome, 'arquivo');
  contentEl.innerHTML = '';

  if (nome.match(/\.(jpg|jpeg|png|gif|webp|ico)$/)) {
    contentEl.style.padding = '24px';
    const img = document.createElement('img');
    img.src = url;
    contentEl.appendChild(img);

  } else if (nome.match(/\.(txt|json|js|html|css|md)$/)) {
    blob.text().then(text => {
      contentEl.style.padding = '24px';
      contentEl.style.alignItems = 'flex-start';
      contentEl.style.justifyContent = 'flex-start';
      const pre = document.createElement('pre');
      pre.textContent = text;
      contentEl.appendChild(pre);
    });

  } else {
    contentEl.style.padding = '40px';
    contentEl.innerHTML = `
      <div class="preview-unsupported">
        <div class="preview-unsupported-icon">◫</div>
        <div>Pré-visualização não disponível para este formato</div>
        <button onclick="downloadFile(_previewCurrentCaminho, _previewCurrentNome)" style="
          margin-top: 8px;
          background: var(--accent);
          border: none;
          color: #fff;
          padding: 7px 16px;
          border-radius: var(--radius-sm);
          font-size: 13px;
          font-family: 'Inter', sans-serif;
          cursor: pointer;
        ">↓ Baixar arquivo</button>
      </div>`;
  }

  modal.classList.add('open');
}

function _fecharPreviewModal() {
  const modal = document.getElementById('previewModal');
  modal.classList.remove('open');
  setTimeout(() => {
    document.getElementById('previewContent').innerHTML = '';
  }, 220);
}

// Botões do novo modal
document.getElementById('previewCloseBtn').addEventListener('click', _fecharPreviewModal);
document.getElementById('previewModal').addEventListener('click', (e) => {
  if (e.target === document.getElementById('previewModal')) _fecharPreviewModal();
});
document.getElementById('previewDownloadBtn').addEventListener('click', () => {
  if (_previewCurrentCaminho && _previewCurrentNome) {
    downloadFile(_previewCurrentCaminho, _previewCurrentNome);
  }
});

// Swipe down fecha no mobile
document.getElementById('previewModal').addEventListener('touchstart', (e) => {
  _previewTouchStart = e.touches[0].clientY;
}, { passive: true });
document.getElementById('previewModal').addEventListener('touchend', (e) => {
  if (e.changedTouches[0].clientY - _previewTouchStart > 80) _fecharPreviewModal();
});
let _previewTouchStart = 0;





// CONTEXTO SOBRE ARQUIVOS
function abrirMenuContexto(e, nome, nomeOriginal) {
  e.preventDefault();

  const mobileUploadOption = document.getElementById('mobileUploadOption');
  const mobileSelectOption = document.getElementById('mobileSelectOption');
  const mobileMoveOption = document.getElementById('mobileMoveOption');
  if (mobileUploadOption) mobileUploadOption.style.display = 'none';
  if (mobileSelectOption) mobileSelectOption.style.display = 'none';
  if (mobileMoveOption) mobileMoveOption.style.display = 'none';

  const caminho_relativo = currentPath === '/' ? nome : currentPath + '/' + nome;

  // Posiciona primeiro invisível
  contextMenu.style.top = `${e.pageY}px`;
  contextMenu.style.left = `${e.pageX}px`;

  // força reflow pra animação funcionar sempre
  contextMenu.classList.remove('active');
  void contextMenu.offsetWidth;

  // ativa animação
  contextMenu.classList.add('active');
  document.body.classList.add('context-menu-open');

  // DOWNLOAD
  downloadOption.onclick = () => {
    downloadFile(caminho_relativo, nomeOriginal || nome);
    fecharMenuContexto();
  };

  // DELETE
  deletarArquivo.onclick = () => {
    const pasta_ou_arquivo = "arquivo"
    deleteFile(caminho_relativo, pasta_ou_arquivo);
    fecharMenuContexto();
  };

  // RENAME
  MudarNomeOption.onclick = () => {
    abrirModalRenomear(nomeOriginal || nome, caminho_relativo, "arquivo");
    fecharMenuContexto();
  };

  // PREVIEW
  visualizarItem.style.display = 'block';
  visualizarItem.onclick = () => {
    visualizarArquivo(caminho_relativo, nomeOriginal || nome);
    fecharMenuContexto();
};
}

// CONTEXTO SOBRE PASTAS
function abrirMenuContextoPasta(e, nome) {
  e.preventDefault();

  const mobileUploadOption = document.getElementById('mobileUploadOption');
  const mobileSelectOption = document.getElementById('mobileSelectOption');
  const mobileMoveOption = document.getElementById('mobileMoveOption');
  if (mobileUploadOption) mobileUploadOption.style.display = 'none';
  if (mobileSelectOption) mobileSelectOption.style.display = 'none';
  if (mobileMoveOption) mobileMoveOption.style.display = 'none';

  const caminho_relativo = currentPath === '/' ? nome : currentPath + '/' + nome;

  // posição
  contextMenu.style.top = `${e.pageY}px`;
  contextMenu.style.left = `${e.pageX}px`;

  contextMenu.classList.remove('active');
  void contextMenu.offsetWidth;
  contextMenu.classList.add('active');
  document.body.classList.add('context-menu-open');

  // 🔥 REMOVE DOWNLOAD (não faz sentido pra pasta)
  downloadOption.style.display = 'none';

  //remove opção de pré-visualizar
  visualizarItem.style.display = 'none';

  // DELETE (PASTA)
  deletarArquivo.onclick = () => {
    const pasta_ou_arquivo = "pasta";
    deleteFile(caminho_relativo, pasta_ou_arquivo);
    fecharMenuContexto();
  };

  // RENAME (PASTA)
  MudarNomeOption.onclick = () => {
    abrirModalRenomear(nome, caminho_relativo, "pasta");
    fecharMenuContexto();
  };

  


}


// CONTEXTO ÁREA VAZIA
function abrirMenuContextoVazio(e) {
  e.preventDefault();

  const mobileUploadOption = document.getElementById('mobileUploadOption');
  const mobileSelectOption = document.getElementById('mobileSelectOption');
  const mobileMoveOption = document.getElementById('mobileMoveOption');
  if (mobileUploadOption) mobileUploadOption.style.display = 'none';
  if (mobileSelectOption) mobileSelectOption.style.display = 'none';
  if (mobileMoveOption) mobileMoveOption.style.display = 'none';

  contextMenu.style.top  = `${e.pageY}px`;
  contextMenu.style.left = `${e.pageX}px`;

  contextMenu.classList.remove('active');
  void contextMenu.offsetWidth;
  contextMenu.classList.add('active');
  document.body.classList.add('context-menu-open');

  visualizarItem.style.display = 'none';
  downloadOption.style.display = 'none';
  MudarNomeOption.style.display = 'none';
  deletarArquivo.style.display = 'none';

  criarArquivo.style.display = 'block';
  criarPasta.style.display   = 'block';

  configurarAcoesCriacaoContexto();
}

function configurarAcoesCriacaoContexto() {
  criarPasta.onclick = () => {
    fecharMenuContexto();

    if (vaultMode) {
      arquivoParaRenomear = { nomeAtual: '', caminho_relativo: null, tipo: 'vault-nova-pasta' };
      renameInput.value = 'Nova Pasta';
      renameInput.placeholder = 'Nome da pasta...';
      renameModal.querySelector('h3').textContent = 'Nova pasta';
      renameModal.classList.add('active');
      setTimeout(() => { renameInput.focus(); renameInput.select(); }, 100);
      return;
    }

    fetch(`${window.CONFIG.API_BASE_URL}api/atlas-drive/criar-nova-Pasta`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ caminho_da_pasta: currentPath })
    })
    .then(res => { if (!res.ok) throw new Error(); return res.json(); })
    .then(() => {
      fetchFiles(currentPath);
      if (isMobileViewport()) showMobileToast('Pasta criada com sucesso.', 'success', 1800);
    })
    .catch(() => {
      if (isMobileViewport()) showMobileToast('Falha ao criar pasta.', 'error', 2200);
      else alert('Erro ao criar pasta');
    });
  };

  criarArquivo.onclick = () => {
    fecharMenuContexto();

    const tipoFluxo = vaultMode ? 'vault-novo-txt' : 'novo-txt';

    arquivoParaRenomear = { nomeAtual: '', caminho_relativo: null, tipo: tipoFluxo };
    renameInput.value = 'novo-arquivo.txt';
    renameInput.placeholder = 'nome-do-arquivo.txt';
    renameModal.querySelector('h3').textContent = 'Novo arquivo de texto';
    renameModal.classList.add('active');
    setTimeout(() => { renameInput.focus(); renameInput.select(); }, 100);
  };
}



// Esconde o menu se o usuário clicar em qualquer outro lugar da tela
document.addEventListener('click', (e) => {
  if (!contextMenu.contains(e.target) && !mobileFabEl?.contains(e.target)) {
    fecharMenuContexto();
  }
});


function fecharMenuContexto() {
  contextMenu.classList.remove('active');
  document.body.classList.remove('context-menu-open');

  const mobileUploadOption = document.getElementById('mobileUploadOption');
  const mobileSelectOption = document.getElementById('mobileSelectOption');
  const mobileMoveOption = document.getElementById('mobileMoveOption');
  if (mobileUploadOption) mobileUploadOption.style.display = 'none';
  if (mobileSelectOption) mobileSelectOption.style.display = 'none';
  if (mobileMoveOption) mobileMoveOption.style.display = 'none';

  // restaura padrão
  downloadOption.style.display = 'block';
  visualizarItem.style.display = 'block';
  MudarNomeOption.style.display = 'block';
  deletarArquivo.style.display = 'block';

  criarArquivo.style.display = 'none';
  criarPasta.style.display = 'none';
}

function ajustarPosicaoMenu(x, y) {
  const menuRect = contextMenu.getBoundingClientRect();

  let posX = x;
  let posY = y;

  if (x + menuRect.width > window.innerWidth) {
    posX -= menuRect.width;
  }

  if (y + menuRect.height > window.innerHeight) {
    posY -= menuRect.height;
  }

  contextMenu.style.left = `${posX}px`;
  contextMenu.style.top = `${posY}px`;
}





const backButton = document.getElementById('backButton');

backButton.onclick = () => {
  if (currentPath === '/' || !currentPath) return;

  // Remove a última pasta do caminho
  const parts = currentPath.split('/').filter(Boolean); // remove partes vazias
  parts.pop(); // sobe um nível
  const newPath = '/' + parts.join('/'); // monta o caminho
  fetchFiles(newPath || '/'); // atualiza a tela
};





document.querySelector('.main').addEventListener('contextmenu', (e) => {

  if (e.target.closest('.context-menu')) return;

  const clicouEmArquivo = e.target.closest('.file-card');

  if (clicouEmArquivo) return;

  if (e.target.closest('.topbar')) return;

  abrirMenuContextoVazio(e);
});



document.addEventListener('dragend', () => {
  fileContainer.classList.remove('drag-over');
});


document.querySelector('.main').addEventListener('mousedown', (e) => {
  
  // 🔥 FIX MOBILE: Impede que o touch inicie a caixa de seleção invisível e trave a tela!
  if (e.pointerType === 'touch' || (e.touches && e.touches.length > 0)) return;

  // só botão esquerdo
  if (e.button !== 0) return;

  // ❌ não inicia se clicou em arquivo
  if (e.target.closest('.file-card')) return;

  // ❌ não inicia na topbar
  if (e.target.closest('.topbar')) return;

  // ❌ não inicia no modal
  if (e.target.closest('.rename-modal')) return;


  // não inicia seleção se clicou em arquivo
  if (e.target.closest('.file-card')) return;

  isSelecting = true;

  startX = e.clientX;
  startY = e.clientY;

  selectionBox.style.left = startX + 'px';
  selectionBox.style.top = startY + 'px';
  selectionBox.style.width = '0px';
  selectionBox.style.height = '0px';
  selectionBox.style.display = 'block';

  itensSelecionados.clear();
});




document.addEventListener('mousemove', (e) => {
  if (!isSelecting) return;

  if (e.buttons !== 1) return; // só se o botão esquerdo estiver pressionado

  const currentX = e.clientX;
  const currentY = e.clientY;

  const x = Math.min(startX, currentX);
  const y = Math.min(startY, currentY);
  const w = Math.abs(startX - currentX);
  const h = Math.abs(startY - currentY);

  selectionBox.style.left = x + 'px';
  selectionBox.style.top = y + 'px';
  selectionBox.style.width = w + 'px';
  selectionBox.style.height = h + 'px';

  const boxRect = selectionBox.getBoundingClientRect();

  document.querySelectorAll('.file-card').forEach(card => {
    const rect = card.getBoundingClientRect();

    const intersect =
      rect.left < boxRect.right &&
      rect.right > boxRect.left &&
      rect.top < boxRect.bottom &&
      rect.bottom > boxRect.top;

    const nome = card.dataset.nome;

    if (intersect) {
      itensSelecionados.add(nome);
      card.classList.add('selected');
      card.style.border = '';
    } else {
      itensSelecionados.delete(nome);
      card.classList.remove('selected');
      card.style.border = '';
    }

  });


  atualizarContadorSelecao();

});



let acabouDeSelecionar = false;

document.addEventListener('mouseup', (e) => {
  if (isSelecting) {
    isSelecting = false;
    selectionBox.style.display = 'none';
    atualizarContadorSelecao();

    if (itensSelecionados.size > 0) {
      acabouDeSelecionar = true; // 🔥 avisa que foi drag, não clique
    }
  }
});


document.addEventListener('click', (e) => {
  if (acabouDeSelecionar) {
    acabouDeSelecionar = false;
    return;
  }

  // 🔥 A MÁGICA AQUI: Se o elemento que recebeu o clique não estiver mais no DOM 
  // (ex: foi apagado ao navegar na lista do picker), nós ignoramos o clique.
  if (!document.body.contains(e.target)) return;

  const clicouEmArquivo = e.target.closest('.file-card');
  const clicouMenu      = e.target.closest('.context-menu');
  const clicouModal     = e.target.closest('.rename-modal');
  const clicouTransfer  = e.target.closest('#transferPanel, #vaultTransferPanel');
  const clicouMovePicker = e.target.closest('.move-folder-picker');


  // 🔥 ADICIONE ESTA LINHA: Protege botões de ação que podem estar fora do transferPanel mas agem sobre ele
  const clicouBotaoAcao  = e.target.closest('.fab-menu, .btn-acao-multipla'); 

  // Se NÃO clicou em nada disso, aí sim limpamos
  if (!clicouEmArquivo && !clicouMenu && !clicouModal && !clicouTransfer && !clicouMovePicker && !clicouBotaoAcao) {
    // Só limpa se não estivermos no meio de uma navegação de mover
    if (!document.querySelector('.move-folder-picker.active')) {
        itensSelecionados.clear();
        limparSelecaoVisual();
        atualizarContadorSelecao();
    }
  }


});




// ══════════════════════════════════════════════
// ATLAS VAULT — SISTEMA SECRETO
// ══════════════════════════════════════════════

let vaultToken = null; // nunca vai pra localStorage
let vaultMode = false;

// elementos
const vaultAccessOverlay = document.getElementById('vaultAccessOverlay');
const vaultAccessCard    = document.getElementById('vaultAccessCard');
const vaultAccessInput   = document.getElementById('vaultAccessInput');
const vaultAccessBtn     = document.getElementById('vaultAccessBtn');
const vaultAccessError   = document.getElementById('vaultAccessError');

const vaultAuthOverlay   = document.getElementById('vaultAuthOverlay');
const vaultAuthCard      = document.getElementById('vaultAuthCard');
const vaultAuthInput     = document.getElementById('vaultAuthInput');
const vaultAuthBtn       = document.getElementById('vaultAuthBtn');
const vaultAuthError     = document.getElementById('vaultAuthError');

const vaultModeBadge          = document.getElementById('vaultModeBadge');
const vaultExitBtn            = document.getElementById('vaultExitBtn');
const vaultTopbarIndicator    = document.getElementById('vaultTopbarIndicator');


// ── INTERCEPTA O RENAME ────────────────────────
// Chama isso ANTES de chamar renameFile de verdade.
// Retorna true se interceptou (é vault), false se pode renomear normal.
function interceptarVault(novoNome) {
  if (!novoNome.startsWith('@@@')) return false;

  const codigo = novoNome.slice(3).trim();
  if (!codigo) return true; // digita @@@ sem nada, ignora silencioso

  abrirVaultTela1(codigo);
  return true;
}


// ── TELA 1: VERIFICAÇÃO DE ACESSO ─────────────
function abrirVaultTela1(codigoJaPreenchido) {
  // Se já tem código (veio do rename @@@ ), verifica direto no backend
  // SEM abrir nenhuma UI — só abre a tela 2 se o backend confirmar
  if (codigoJaPreenchido) {
    verificarAcessoVault(codigoJaPreenchido);
    return;
  }

  // Fluxo manual (sem código pré-preenchido): abre overlay normalmente
  vaultAccessInput.value = '';
  vaultAccessError.classList.remove('visible');
  vaultAccessOverlay.classList.add('active');
  setTimeout(() => vaultAccessInput.focus(), 300);
}

function fecharVaultTela1() {
  vaultAccessOverlay.classList.remove('active');
  vaultAccessInput.value = '';
  vaultAccessError.classList.remove('visible');
}






async function verificarAcessoVault(codigo) {
  // Só mexe no botão se o overlay estiver visível (fluxo manual)
  const overlayAberto = vaultAccessOverlay.classList.contains('active');

  if (overlayAberto) {
    vaultAccessBtn.disabled = true;
    vaultAccessBtn.querySelector('span').textContent = 'VERIFICANDO...';
  }

  try {
    const res = await fetch(`${window.CONFIG.API_BASE_URL}api/atlas-drive/vault/verificar-acesso`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ codigo })
    });

    if (res.ok) {
      // Fecha overlay se estava aberto, aí abre tela 2
      if (overlayAberto) {
        vaultAccessOverlay.classList.remove('active');
        setTimeout(() => {
          vaultAccessInput.value = '';
          vaultAccessError.classList.remove('visible');
          abrirVaultTela2();
        }, 400);
      } else {
        // Veio direto do rename — abre tela 2 sem animação de fechar
        abrirVaultTela2();
      }
    }
    // Se não ok: não faz NADA. Silêncio total. Sem overlay, sem erro visível.

  } catch (err) {
    // Erro de rede etc: também silêncio total no fluxo do rename
    if (overlayAberto) fecharVaultTela1();
    console.warn('Vault: falha na verificação de acesso.');
  } finally {
    if (overlayAberto) {
      vaultAccessBtn.disabled = false;
      vaultAccessBtn.querySelector('span').textContent = 'VERIFICAR IDENTIDADE';
    }
  }
}



vaultAccessBtn.onclick = () => {
  const codigo = vaultAccessInput.value.trim();
  if (!codigo) return;
  verificarAcessoVault(codigo);
};

vaultAccessInput.onkeydown = (e) => {
  if (e.key === 'Enter') vaultAccessBtn.click();
  if (e.key === 'Escape') fecharVaultTela1();
};






// ── TELA 2: AUTENTICAÇÃO VAULT ─────────────────
function abrirVaultTela2() {
  vaultAuthInput.value = '';
  vaultAuthError.classList.remove('visible');
  vaultAuthOverlay.classList.add('active');
  setTimeout(() => vaultAuthInput.focus(), 300);
}

function fecharVaultTela2() {
  vaultAuthOverlay.classList.remove('active');
  vaultAuthInput.value = '';
  vaultAuthError.classList.remove('visible');
}





async function autenticarVault() {
  const senha = vaultAuthInput.value.trim();
  if (!senha) return;

  try {
    vaultAuthBtn.disabled = true;
    vaultAuthBtn.querySelector('span').textContent = 'ABRINDO VAULT...';

    const res = await fetch(`${window.CONFIG.API_BASE_URL}api/atlas-drive/vault/autenticar`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
    
        senha_vault:senha 
      
      })
    });

    if (res.ok) {
      const data = await res.json();
      vaultToken = data.vaultToken; // 🔐 fica só em memória

      fecharVaultTela2();
      setTimeout(() => entrarModoVault(), 300);
    } else {
      vaultAuthError.classList.add('visible');
      vaultAuthCard.style.animation = 'none';
      void vaultAuthCard.offsetWidth;
      vaultAuthCard.style.animation = 'vaultShake 0.4s ease';
      vaultAuthInput.value = '';
      vaultAuthInput.focus();
    }
  } catch (err) {
    vaultAuthError.textContent = 'ERRO DE CONEXÃO — TENTE NOVAMENTE';
    vaultAuthError.classList.add('visible');
  } finally {
    vaultAuthBtn.disabled = false;
    vaultAuthBtn.querySelector('span').textContent = 'ABRIR O VAULT';
  }
}

vaultAuthBtn.onclick = autenticarVault;

vaultAuthInput.onkeydown = (e) => {
  if (e.key === 'Enter') autenticarVault();
  if (e.key === 'Escape') fecharVaultTela2();
};


// ── ENTRAR NO MODO VAULT ───────────────────────
function entrarModoVault() {
  vaultMode = true;

  document.body.classList.add('vault-mode');
  vaultModeBadge.classList.add('active');
  vaultExitBtn.classList.add('active');
  vaultTopbarIndicator.classList.add('active');

  // lista os arquivos do vault
  fetchVaultFiles('/');
}

// ── SAIR DO MODO VAULT ─────────────────────────
function sairModoVault() {
  vaultToken = null;
  vaultMode = false;

  document.body.classList.remove('vault-mode');
  vaultModeBadge.classList.remove('active');
  vaultExitBtn.classList.remove('active');
  vaultTopbarIndicator.classList.remove('active');

  // volta ao drive normal
  fetchFiles('/');
}

vaultExitBtn.onclick = sairModoVault;


// ── FETCH DO VAULT ─────────────────────────────
async function fetchVaultFiles(path = '/') {
  try {
    const response = await fetch(
      `${window.CONFIG.API_BASE_URL}api/atlas-drive/vault/listar?path=${encodeURIComponent(path)}`,
      {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Authorization': `Bearer ${vaultToken}`
        }
      }
    );

    if (response.status === 401 || response.status === 403) {
      // token expirou ou inválido → sai do vault silenciosamente
      sairModoVault();
      return;
    }

    if (!response.ok) throw new Error('Erro ao listar vault');

    const data = await response.json();

    const raw = Array.isArray(data.arquivos) ? data.arquivos : 
            Array.isArray(data) ? data : [];

    // normaliza pro formato que o renderFiles já espera
    const files = raw.map(f => ({
      nome: f.nome,
      nome_original: f.nome,         // vault não tem uuid, nome é direto
      tipo: f.tipo,
      tamanho: f.tamanho_bytes ?? 0, // renomeia pro campo que renderFiles usa
      extensao: f.extensao           // bônus: já vem do backend
    }));


    const ordenado = [
      ...files.filter(f => f.tipo === 'pasta').sort((a, b) =>
        (a.nome_original || a.nome).localeCompare(b.nome_original || b.nome)),
      ...files.filter(f => f.tipo !== 'pasta').sort((a, b) =>
        (a.nome_original || a.nome).localeCompare(b.nome_original || b.nome))
    ];

    renderFiles(ordenado);
    currentPath = path;
    renderPath(path);

  } catch (err) {
    console.error('fetchVaultFiles:', err);
  }
}



// ── OVERRIDE: fetchFiles respeita modo vault ───
// Guarda o fetchFiles original e faz o override
const fetchFilesOriginal = fetchFiles;

// Sobrescreve pra quando estiver no modo vault,
// redirecionar pra fetchVaultFiles automaticamente
window.fetchFiles = async function(path = '/') {
  if (vaultMode) {
    return fetchVaultFiles(path);
  }
  return fetchFilesOriginal(path);
};


// ── INTERCEPTA O confirmRename ─────────────────
// Precisa sobrescrever o onclick depois que o script carrega
const confirmRenameOriginal = confirmRename.onclick;

confirmRename.onclick = async () => {
  if (!arquivoParaRenomear) return;

  let novoNome = renameInput.value.trim();
  if (!novoNome) {
    if (isMobileViewport()) showMobileToast('Informe um destino valido para mover.', 'error', 2400);
    else alert('Nome inválido');
    return;
  }

  // 🔐 verifica se é código vault
  if (interceptarVault(novoNome)) {
    fecharModalRenomear();
    return;
  }

  // ── MOBILE: mover selecionados ─────────────────
  if (arquivoParaRenomear.tipo === 'mobile-mover') {
    await executarMoverSelecionadosPara(novoNome);
    fecharModalRenomear();
    return;
  }

  // ── VAULT: nova pasta ──────────────────────────
  if (arquivoParaRenomear.tipo === 'vault-nova-pasta') {
    fecharModalRenomear();

    // Cria um arquivo fantasma .keep dentro da pasta pra forçar a criação
    // (o upload vault aceita arquivo, então criamos a "pasta" via upload em subcaminho)
    const blob     = new Blob([''], { type: 'text/plain' });
    const file     = new File([blob], '.keep', { type: 'text/plain' });
    const formData = new FormData();

    const pastaDestino = currentPath === '/'
      ? novoNome
      : currentPath + '/' + novoNome;

    formData.append('files', file);
    formData.append('caminho_escolhido', pastaDestino);

    const id = vaultCriarTransferencia(novoNome, 'upload');
    const xhr = new XMLHttpRequest();

    xhr.open('POST', `${window.CONFIG.API_BASE_URL}api/atlas-drive/vault/upload`, true);
    xhr.withCredentials = true;
    xhr.setRequestHeader('Authorization', `Bearer ${vaultToken}`);

    xhr.onload = () => {
      if (xhr.status === 401 || xhr.status === 403) { vaultFinalizarTransferencia(id, false); sairModoVault(); return; }
      if (xhr.status === 200) { vaultFinalizarTransferencia(id, true); fetchVaultFiles(currentPath); }
      else vaultFinalizarTransferencia(id, false);
    };

    xhr.onerror = () => vaultFinalizarTransferencia(id, false);
    xhr.send(formData);
    return;
  }


  // ── VAULT: novo txt ────────────────────────────
  if (arquivoParaRenomear.tipo === 'vault-novo-txt') {
    fecharModalRenomear();

    if (!novoNome.toLowerCase().endsWith('.txt')) novoNome += '.txt';

    const blob     = new Blob([''], { type: 'text/plain' });
    const file     = new File([blob], novoNome, { type: 'text/plain' });
    const formData = new FormData();

    formData.append('files', file);
    formData.append('caminho_escolhido', currentPath);

    const id = vaultCriarTransferencia(novoNome, 'upload');
    const xhr = new XMLHttpRequest();

    xhr.open('POST', `${window.CONFIG.API_BASE_URL}api/atlas-drive/vault/upload`, true);
    xhr.withCredentials = true;
    xhr.setRequestHeader('Authorization', `Bearer ${vaultToken}`);

    xhr.onload = () => {
      if (xhr.status === 401 || xhr.status === 403) { vaultFinalizarTransferencia(id, false); sairModoVault(); return; }
      if (xhr.status === 200) { vaultFinalizarTransferencia(id, true); fetchVaultFiles(currentPath); }
      else vaultFinalizarTransferencia(id, false);
    };

    xhr.onerror = () => vaultFinalizarTransferencia(id, false);
    xhr.send(formData);
    return;
  }

  // ── Drive normal: novo txt ─────────────────────
  if (arquivoParaRenomear.tipo === 'novo-txt') {
    fecharModalRenomear();

    if (!novoNome.toLowerCase().endsWith('.txt')) novoNome += '.txt';

    const blob     = new Blob([''], { type: 'text/plain' });
    const file     = new File([blob], novoNome, { type: 'text/plain' });
    const formData = new FormData();

    formData.append('files', file);
    formData.append('caminho_escolhido', currentPath);

    const id = criarTransferencia(novoNome, 'upload');
    const xhr = new XMLHttpRequest();

    xhr.open('POST', `${window.CONFIG.API_BASE_URL}api/atlas-drive/upload`, true);
    xhr.withCredentials = true;

    xhr.onload = () => {
      if (xhr.status === 200) { finalizarTransferencia(id, true); fetchFiles(currentPath); }
      else finalizarTransferencia(id, false);
    };

    xhr.onerror = () => finalizarTransferencia(id, false);
    xhr.send(formData);
    return;
  }

  // ── Renomear normal ────────────────────────────
  renameFile(
    arquivoParaRenomear.caminho_relativo,
    novoNome,
    arquivoParaRenomear.tipo,
    "nao"
  );

  fecharModalRenomear();
};


// ── RENAME/MOVER NO VAULT ──────────────────────
async function renameFileVault(caminho_relativo, novo_nome, pasta_ou_arquivo, mover) {
  try {
    const response = await fetch(`${window.CONFIG.API_BASE_URL}api/atlas-drive/vault/renomear`, {
      method: 'PATCH',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${vaultToken}`
      },

      body: JSON.stringify({
        caminho_arquivo: caminho_relativo,
        novo_nome_arquivo: novo_nome,
        pasta_ou_arquivo: pasta_ou_arquivo,
        mover: mover
      })
    });

    if (response.status === 401 || response.status === 403) {
      sairModoVault();
      return false;
    }

    if (!response.ok) throw new Error('Erro ao renomear no vault');

    // recarrega vault no caminho atual
    fetchVaultFiles(currentPath);
    return true;

  } catch (error) {
    console.error('renameFileVault:', error);
    if (isMobileViewport()) showMobileToast('Falha ao mover/renomear item do vault.', 'error', 2300);
    else alert('Erro ao renomear item no vault');
    return false;
  }
}


// guarda o original
const renameFileOriginal = renameFile;

// sobrescreve globalmente
window.renameFile = function(caminho_relativo, novo_nome, pasta_ou_arquivo, mover) {
  if (vaultMode) {
    return renameFileVault(caminho_relativo, novo_nome, pasta_ou_arquivo, mover);
  }
  return renameFileOriginal(caminho_relativo, novo_nome, pasta_ou_arquivo, mover);
};




// ── VAULT TRANSFER PANEL ───────────────────────
const vaultTransferPanel  = document.getElementById('vaultTransferPanel');
const vaultTransferList   = document.getElementById('vaultTransferList');
const vaultTransferHeader = document.getElementById('vaultTransferHeader');
const vaultTransferToggle = document.getElementById('vaultTransferToggle');
const vaultTransferClose  = document.getElementById('vaultTransferClose');

let vaultTransferMinimized = false;
let vaultTransferId = 0;

vaultTransferClose.onclick = (e) => {
  e.stopPropagation();
  vaultTransferPanel.style.display = 'none';
  vaultTransferList.innerHTML = '';
};

vaultTransferHeader.onclick = () => {
  vaultTransferMinimized = !vaultTransferMinimized;
  vaultTransferList.style.display = vaultTransferMinimized ? 'none' : 'block';
  vaultTransferToggle.textContent = vaultTransferMinimized ? '▸' : '▾';
};


const vaultTransferInicio = {};
const vaultTransferXHR = {};

function vaultCriarTransferencia(nome, tipo) {

  const id = ++vaultTransferId;

  vaultTransferInicio[id] = Date.now();
  opCriar(id, nome, tipo, true, null);
  const icone = tipo === 'download' ? '⬇' : '⬆';
  const labelTipo = tipo === 'download' ? 'DOWNLOAD' : 'UPLOAD';

  

  const item = document.createElement('div');
  item.className = 'vault-transfer-item';
  item.id = `vtransfer-${id}`;
  item.innerHTML = `
    <div class="vault-transfer-item-top">
      <span class="vault-transfer-item-name">${icone} ${nome}</span>
      <div style="display:flex;align-items:center;gap:8px;flex-shrink:0;">
        <span class="vault-transfer-item-pct" id="vtransfer-pct-${id}">0%</span>
        <button class="transfer-cancel-btn" id="vtransfer-cancel-${id}" title="Cancelar">✕</button>
      </div>
    </div>
    <div class="vault-transfer-bar-bg">
      <div class="vault-transfer-bar-fill" id="vtransfer-bar-${id}"></div>
    </div>
    <div class="vault-transfer-item-meta" id="vtransfer-meta-${id}">
      ${labelTipo} · Iniciando
    </div>
  `;

  setTimeout(() => {
    const cancelBtn = document.getElementById(`vtransfer-cancel-${id}`);
    if (cancelBtn) cancelBtn.onclick = () => cancelarVaultTransferencia(id);
  }, 0);

  vaultTransferList.appendChild(item);

  vaultTransferPanel.style.display = 'flex';
  if (vaultTransferMinimized) {
    vaultTransferMinimized = false;
    vaultTransferList.style.display = 'block';
    vaultTransferToggle.textContent = '▾';
  }

  vaultTransferList.scrollTop = vaultTransferList.scrollHeight;
  return id;
}

function vaultAtualizarTransferencia(id, percent, bytesCarregados, bytesTotal) {
  const bar  = document.getElementById(`vtransfer-bar-${id}`);
  const pct  = document.getElementById(`vtransfer-pct-${id}`);
  const meta = document.getElementById(`vtransfer-meta-${id}`);
  if (!bar || !pct) return;

  bar.style.width = percent + '%';
  pct.textContent = Math.round(percent) + '%';

  if (meta && bytesCarregados && bytesTotal) {
    const etaStr = calcularETA(bytesCarregados, bytesTotal, vaultTransferInicio[id]);
    meta.textContent = `${formatarTamanho(bytesCarregados)} / ${formatarTamanho(bytesTotal)}${etaStr ? ' · ' + etaStr : ''}`;
  }


  const etaVault = calcularETA(bytesCarregados, bytesTotal, vaultTransferInicio[id]);
  opAtualizar(id, percent, bytesCarregados, bytesTotal, etaVault);

}

function vaultFinalizarTransferencia(id, sucesso = true) {

  opFinalizar(id, sucesso);

  const bar  = document.getElementById(`vtransfer-bar-${id}`);
  const pct  = document.getElementById(`vtransfer-pct-${id}`);
  const meta = document.getElementById(`vtransfer-meta-${id}`);
  if (!bar || !pct) return;

  bar.style.width = '100%';

  if (sucesso) {
    bar.classList.add('done');
    pct.classList.add('done');
    pct.textContent = '✓ OK';
    if (meta) meta.textContent = 'TRANSFERÊNCIA CONCLUÍDA';
  } else {
    bar.classList.add('error');
    pct.classList.add('error');
    pct.textContent = '✕ ERRO';
    if (meta) meta.textContent = 'FALHA NA OPERAÇÃO';
  }

  setTimeout(() => {
    const el = document.getElementById(`vtransfer-${id}`);
    if (!el) return;
    el.style.opacity = '0';
    el.style.transition = 'opacity 0.4s';
    setTimeout(() => {
      el.remove();
      if (vaultTransferList.children.length === 0) {
        vaultTransferPanel.style.display = 'none';
      }
    }, 400);
  }, 12000);
}



function cancelarVaultTransferencia(id) {

  

  if (vaultTransferXHR[id]) vaultTransferXHR[id].abort();

  const bar = document.getElementById(`vtransfer-bar-${id}`);
  const pct = document.getElementById(`vtransfer-pct-${id}`);
  const meta = document.getElementById(`vtransfer-meta-${id}`);
  const cancelBtn = document.getElementById(`vtransfer-cancel-${id}`);

  if (bar) { bar.classList.add('error'); }
  if (pct) { pct.textContent = 'Cancelado'; pct.classList.add('error'); }
  if (meta) meta.textContent = 'Operação cancelada';
  if (cancelBtn) cancelBtn.style.display = 'none';

  delete vaultTransferInicio[id];
  delete vaultTransferXHR[id];

  setTimeout(() => {
    const el = document.getElementById(`vtransfer-${id}`);
    if (!el) return;
    el.style.opacity = '0';
    el.style.transition = 'opacity 0.3s';
    setTimeout(() => {
      el.remove();
      if (vaultTransferList.children.length === 0) vaultTransferPanel.style.display = 'none';
    }, 300);
  }, 1500);
}





// ── DOWNLOAD VAULT ─────────────────────────────
function downloadFileVault(caminho_relativo, nomeOriginal) {
  const id = vaultCriarTransferencia(nomeOriginal || caminho_relativo, 'download');

  const xhr = new XMLHttpRequest();
  vaultTransferXHR[id] = xhr;
  if (_opAtivas[id]) _opAtivas[id].xhrRef = xhr;
  xhr.open('POST', `${window.CONFIG.API_BASE_URL}api/atlas-drive/vault/download`, true);
  xhr.responseType = 'blob';
  xhr.withCredentials = true;
  xhr.setRequestHeader('Content-Type', 'application/json');
  xhr.setRequestHeader('Authorization', `Bearer ${vaultToken}`);

  xhr.onprogress = (e) => {
    if (e.lengthComputable) {
      vaultAtualizarTransferencia(id, (e.loaded / e.total) * 100, e.loaded, e.total);
    }
  };

  xhr.onload = () => {
    if (xhr.status === 401 || xhr.status === 403) {
      vaultFinalizarTransferencia(id, false);
      sairModoVault();
      return;
    }
    if (xhr.status === 200) {
      vaultFinalizarTransferencia(id, true);
      const a = document.createElement('a');
      const url = window.URL.createObjectURL(xhr.response);
      a.href = url;
      a.download = nomeOriginal || caminho_relativo;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } else {
      vaultFinalizarTransferencia(id, false);
    }
  };

  xhr.onerror = () => vaultFinalizarTransferencia(id, false);
  xhr.send(JSON.stringify({ caminho_arquivo: caminho_relativo }));
}


// ── VISUALIZAR VAULT ───────────────────────────
async function visualizarArquivoVault(caminho_relativo, nomeOriginal) {
  try {
    startProgress();

    const response = await fetch(`${window.CONFIG.API_BASE_URL}api/atlas-drive/vault/download`, {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${vaultToken}`
      },
      body: JSON.stringify({ caminho_arquivo: caminho_relativo })
    });

    if (response.status === 401 || response.status === 403) { sairModoVault(); return; }
    if (!response.ok) throw new Error('Erro ao buscar arquivo do vault');

    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const nome = (nomeOriginal || '').toLowerCase();

    _abrirPreviewModal(url, blob, nome, nomeOriginal, caminho_relativo, true);

  } catch (err) {
    console.error(err);
    alert('Erro ao visualizar arquivo do vault');
  } finally {
    finishProgress();
  }
}




// ── OVERRIDES: download e visualizar respeitam vault
const downloadFileOriginal = downloadFile;
window.downloadFile = function(caminho_relativo, nomeOriginal) {
  if (vaultMode) return downloadFileVault(caminho_relativo, nomeOriginal);
  return downloadFileOriginal(caminho_relativo, nomeOriginal);
};

const visualizarArquivoOriginal = visualizarArquivo;
window.visualizarArquivo = function(caminho_relativo, nomeOriginal) {
  if (vaultMode) return visualizarArquivoVault(caminho_relativo, nomeOriginal);
  return visualizarArquivoOriginal(caminho_relativo, nomeOriginal);
};



// ── UPLOAD VAULT ───────────────────────────────
function uploadFileVault() {
  const input = document.createElement('input');
  input.type = 'file';
  input.multiple = true;

  input.onchange = () => {
    if (!input.files.length) return;

    Array.from(input.files).forEach(file => {
      const formData = new FormData();
      formData.append('files', file);           // mesmo padrão multer .array("files")
      formData.append('caminho_escolhido', currentPath);

      const id = vaultCriarTransferencia(file.name, 'upload');

      const xhr = new XMLHttpRequest();
      vaultTransferXHR[id] = xhr;
      if (_opAtivas[id]) _opAtivas[id].xhrRef = xhr;
      xhr.open('POST', `${window.CONFIG.API_BASE_URL}api/atlas-drive/vault/upload`, true);
      xhr.withCredentials = true;
      xhr.setRequestHeader('Authorization', `Bearer ${vaultToken}`);
      // ⚠️ NÃO seta Content-Type — o browser seta automático com boundary pro multipart

      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) {
          vaultAtualizarTransferencia(id, (e.loaded / e.total) * 100, e.loaded, e.total);
        }
      };

      xhr.onload = () => {
        if (xhr.status === 401 || xhr.status === 403) {
          vaultFinalizarTransferencia(id, false);
          sairModoVault();
          return;
        }
        if (xhr.status === 200) {
          vaultFinalizarTransferencia(id, true);
          fetchVaultFiles(currentPath);
        } else {
          vaultFinalizarTransferencia(id, false);
        }
      };

      xhr.onerror = () => vaultFinalizarTransferencia(id, false);

      xhr.send(formData);
    });
  };

  input.click();
}


// ── OVERRIDE: botão de upload respeita vault ───
const uploadFileOriginal = uploadFile;
window.uploadFile = function() {
  if (vaultMode) return uploadFileVault();
  return uploadFileOriginal();
};





// ── DELETE VAULT ───────────────────────────────
async function deleteFileVault(caminho_relativo, pasta_ou_arquivo) {
  try {
    const response = await fetch(`${window.CONFIG.API_BASE_URL}api/atlas-drive/vault/deletar`, {
      method: 'DELETE',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${vaultToken}`
      },
      body: JSON.stringify({
        caminho_arquivo: caminho_relativo,
        pasta_ou_arquivo: pasta_ou_arquivo
      })
    });

    if (response.status === 401 || response.status === 403) {
      sairModoVault();
      return;
    }

    if (!response.ok) throw new Error('Erro ao deletar no vault');

    fetchVaultFiles(currentPath);

  } catch (error) {
    console.error('deleteFileVault:', error);
    alert('Erro ao deletar item do vault');
  }
}


// ── OVERRIDE: delete respeita vault ───────────
const deleteFileOriginal = deleteFile;
window.deleteFile = function(caminho_relativo, pasta_ou_arquivo) {
  if (vaultMode) return deleteFileVault(caminho_relativo, pasta_ou_arquivo);
  return deleteFileOriginal(caminho_relativo, pasta_ou_arquivo);
};




// ══════════════════════════════════════════════
// EDITOR DE TXT
// ══════════════════════════════════════════════

const txtEditorModal     = document.getElementById('txtEditorModal');
const txtEditorTitle     = document.getElementById('txtEditorTitle');
const txtEditorArea      = document.getElementById('txtEditorArea');
const txtEditorSaveBtn   = document.getElementById('txtEditorSaveBtn');
const txtEditorCloseBtn  = document.getElementById('txtEditorCloseBtn');
const txtEditorStatus    = document.getElementById('txtEditorStatus');
const txtEditorLineCount = document.getElementById('txtEditorLineCount');
const editarTxtItem      = document.getElementById('editarTxtItem');

let txtEditorCaminho     = null;
let txtEditorNome        = null;
let txtEditorConteudoOriginal = '';

// Abre o modal, carrega o conteúdo atual
async function abrirEditorTxt(caminho_relativo, nomeOriginal) {
  try {
    startProgress();

    const response = await fetch(`${window.CONFIG.API_BASE_URL}api/atlas-drive/download`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ caminho_arquivo: caminho_relativo })
    });

    if (!response.ok) throw new Error('Erro ao carregar arquivo');

    const blob = await response.blob();
    const texto = await blob.text();

    txtEditorCaminho = caminho_relativo;
    txtEditorNome    = nomeOriginal;
    txtEditorConteudoOriginal = texto;

    txtEditorTitle.textContent = nomeOriginal;
    txtEditorArea.value = texto;

    atualizarStatusEditor(false);
    atualizarContadorEditor();

    // Abre o modal
    txtEditorModal.classList.add('open');
    setTimeout(() => txtEditorArea.focus(), 100);

  } catch (err) {
    console.error(err);
    alert('Erro ao abrir editor');
  } finally {
    finishProgress();
  }
}

function fecharEditorTxt() {
  txtEditorModal.classList.remove('open');
  txtEditorArea.value = '';
  txtEditorCaminho = null;
  txtEditorNome    = null;
}

function atualizarStatusEditor(modificado) {
  if (modificado) {
    txtEditorStatus.textContent = '● NÃO SALVO';
    txtEditorStatus.classList.add('modified');
  } else {
    txtEditorStatus.textContent = 'SEM ALTERAÇÕES';
    txtEditorStatus.classList.remove('modified');
  }
}

function atualizarContadorEditor() {
  const texto   = txtEditorArea.value;
  const linhas  = texto === '' ? 0 : texto.split('\n').length;
  const chars   = texto.length;
  txtEditorLineCount.textContent = `${linhas} linha${linhas !== 1 ? 's' : ''} · ${chars} caractere${chars !== 1 ? 's' : ''}`;
}

// Detecta mudanças no textarea
txtEditorArea.addEventListener('input', () => {
  const modificado = txtEditorArea.value !== txtEditorConteudoOriginal;
  atualizarStatusEditor(modificado);
  atualizarContadorEditor();
});

// Salva: deleta o original, faz upload com mesmo nome e novo conteúdo
txtEditorSaveBtn.addEventListener('click', async () => {
  if (!txtEditorCaminho || !txtEditorNome) return;

  const novoConteudo = txtEditorArea.value;

  txtEditorSaveBtn.textContent   = '⏳ SALVANDO...';
  txtEditorSaveBtn.style.opacity = '0.6';
  txtEditorSaveBtn.disabled      = true;

  try {
    // 1. Deleta o arquivo original
    const deleteRes = await fetch(`${window.CONFIG.API_BASE_URL}api/atlas-drive/delete`, {
      method: 'DELETE',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        caminho_arquivo: txtEditorCaminho,
        pasta_ou_arquivo: 'arquivo'
      })
    });

    if (!deleteRes.ok) throw new Error('Erro ao deletar original');

    // 2. Monta o novo arquivo em memória e faz upload
    const blob     = new Blob([novoConteudo], { type: 'text/plain' });
    const file     = new File([blob], txtEditorNome, { type: 'text/plain' });
    const formData = new FormData();

    // Pasta onde o arquivo estava (retira o nome do caminho)
    const partesCaminho = txtEditorCaminho.split('/');
    partesCaminho.pop();
    const pastaDestino = partesCaminho.join('/') || '/';

    formData.append('files', file);
    formData.append('caminho_escolhido', pastaDestino);

    const uploadRes = await fetch(`${window.CONFIG.API_BASE_URL}api/atlas-drive/upload`, {
      method: 'POST',
      credentials: 'include',
      body: formData
    });

    if (!uploadRes.ok) throw new Error('Erro ao fazer upload do novo conteúdo');

    // Sucesso
    txtEditorConteudoOriginal = novoConteudo;
    atualizarStatusEditor(false);
    fetchFiles(currentPath);

    // Feedback visual rápido
    txtEditorSaveBtn.textContent   = '✓ SALVO';
    txtEditorSaveBtn.style.color   = '#4ade80';
    txtEditorSaveBtn.style.borderColor = 'rgba(74,222,128,0.4)';
    setTimeout(() => {
      txtEditorSaveBtn.textContent      = '💾 SALVAR';
      txtEditorSaveBtn.style.color      = '#22d3ee';
      txtEditorSaveBtn.style.borderColor = 'rgba(34,211,238,0.35)';
    }, 2000);

  } catch (err) {
    console.error(err);
    alert('Erro ao salvar arquivo');
  } finally {
    txtEditorSaveBtn.style.opacity = '1';
    txtEditorSaveBtn.disabled      = false;
  }
});


// Fecha clicando fora ou no X
txtEditorCloseBtn.addEventListener('click', fecharEditorTxt);
txtEditorModal.addEventListener('click', (e) => {
  if (e.target === txtEditorModal) fecharEditorTxt();
});



// ── INTEGRAÇÃO COM CONTEXT MENU ────────────────

const abrirMenuContextoOriginal = abrirMenuContexto;
window.abrirMenuContexto = function(e, nome, nomeOriginal) {
  abrirMenuContextoOriginal(e, nome, nomeOriginal);

  const nomeExibido = (nomeOriginal || nome).toLowerCase();
  const ehTxt = nomeExibido.match(/\.txt$/);

  editarTxtItem.style.display = ehTxt ? 'block' : 'none';

  if (ehTxt) {
    const caminho_relativo = currentPath === '/' ? nome : currentPath + '/' + nome;
    editarTxtItem.onclick = () => {
      if (vaultMode) {
        abrirEditorTxtVault(caminho_relativo, nomeOriginal || nome);
      } else {
        abrirEditorTxt(caminho_relativo, nomeOriginal || nome);
      }
      fecharMenuContexto();
    };
  }
};


// Garante que fecharMenuContexto reseta o botão de editar
const fecharMenuContextoOriginal = fecharMenuContexto;
window.fecharMenuContexto = function() {
  fecharMenuContextoOriginal();
  editarTxtItem.style.display = 'none';
};



// ══════════════════════════════════════════════
// EDITOR DE TXT — VAULT
// ══════════════════════════════════════════════

async function abrirEditorTxtVault(caminho_relativo, nomeOriginal) {
  try {
    startProgress();

    const response = await fetch(`${window.CONFIG.API_BASE_URL}api/atlas-drive/vault/download`, {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${vaultToken}`
      },
      body: JSON.stringify({ caminho_arquivo: caminho_relativo })
    });

    if (response.status === 401 || response.status === 403) {
      sairModoVault();
      return;
    }

    if (!response.ok) throw new Error('Erro ao carregar arquivo do vault');

    const blob  = await response.blob();
    const texto = await blob.text();

    txtEditorCaminho          = caminho_relativo;
    txtEditorNome             = nomeOriginal;
    txtEditorConteudoOriginal = texto;

    txtEditorTitle.textContent = nomeOriginal;
    txtEditorArea.value        = texto;

    atualizarStatusEditor(false);
    atualizarContadorEditor();

    txtEditorModal.classList.add('open');
    setTimeout(() => txtEditorArea.focus(), 100);

  } catch (err) {
    console.error(err);
    alert('Erro ao abrir editor vault');
  } finally {
    finishProgress();
  }
}


// ── OVERRIDE: salvar respeita vault ───────────
const txtSalvarOriginal = txtEditorSaveBtn.onclick;

txtEditorSaveBtn.addEventListener('click', async () => {}, true); // dummy — já tem listener

// Substitui o listener de save por um que detecta vault
txtEditorSaveBtn.replaceWith(txtEditorSaveBtn.cloneNode(true)); // limpa listeners antigos

const txtEditorSaveBtnNovo = document.getElementById('txtEditorSaveBtn');

txtEditorSaveBtnNovo.addEventListener('click', async () => {
  if (!txtEditorCaminho || !txtEditorNome) return;

  const novoConteudo = txtEditorArea.value;

  txtEditorSaveBtnNovo.textContent   = '⏳ SALVANDO...';
  txtEditorSaveBtnNovo.style.opacity = '0.6';
  txtEditorSaveBtnNovo.disabled      = true;

  try {
    if (vaultMode) {
      // ── VAULT ──────────────────────────────────

      // 1. Deleta o original no vault
      const deleteRes = await fetch(`${window.CONFIG.API_BASE_URL}api/atlas-drive/vault/deletar`, {
        method: 'DELETE',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${vaultToken}`
        },
        body: JSON.stringify({
          caminho_arquivo: txtEditorCaminho,
          pasta_ou_arquivo: 'arquivo'
        })
      });

      if (deleteRes.status === 401 || deleteRes.status === 403) { sairModoVault(); return; }
      if (!deleteRes.ok) throw new Error('Erro ao deletar original no vault');

      // 2. Upload do novo conteúdo no vault
      const blob     = new Blob([novoConteudo], { type: 'text/plain' });
      const file     = new File([blob], txtEditorNome, { type: 'text/plain' });
      const formData = new FormData();

      const partesCaminho = txtEditorCaminho.split('/');
      partesCaminho.pop();
      const pastaDestino = partesCaminho.join('/') || '/';

      formData.append('files', file);
      formData.append('caminho_escolhido', pastaDestino);

      const uploadRes = await fetch(`${window.CONFIG.API_BASE_URL}api/atlas-drive/vault/upload`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Authorization': `Bearer ${vaultToken}` },
        body: formData
      });

      if (uploadRes.status === 401 || uploadRes.status === 403) { sairModoVault(); return; }
      if (!uploadRes.ok) throw new Error('Erro ao fazer upload no vault');

      txtEditorConteudoOriginal = novoConteudo;
      atualizarStatusEditor(false);
      fetchVaultFiles(currentPath);

    } else {
      // ── DRIVE NORMAL ───────────────────────────

      const deleteRes = await fetch(`${window.CONFIG.API_BASE_URL}api/atlas-drive/delete`, {
        method: 'DELETE',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          caminho_arquivo: txtEditorCaminho,
          pasta_ou_arquivo: 'arquivo'
        })
      });

      if (!deleteRes.ok) throw new Error('Erro ao deletar original');

      const blob     = new Blob([novoConteudo], { type: 'text/plain' });
      const file     = new File([blob], txtEditorNome, { type: 'text/plain' });
      const formData = new FormData();

      const partesCaminho = txtEditorCaminho.split('/');
      partesCaminho.pop();
      const pastaDestino = partesCaminho.join('/') || '/';

      formData.append('files', file);
      formData.append('caminho_escolhido', pastaDestino);

      const uploadRes = await fetch(`${window.CONFIG.API_BASE_URL}api/atlas-drive/upload`, {
        method: 'POST',
        credentials: 'include',
        body: formData
      });

      if (!uploadRes.ok) throw new Error('Erro ao fazer upload');

      txtEditorConteudoOriginal = novoConteudo;
      atualizarStatusEditor(false);
      fetchFiles(currentPath);
    }

    // Feedback visual
    txtEditorSaveBtnNovo.textContent        = '✓ SALVO';
    txtEditorSaveBtnNovo.style.color        = '#4ade80';
    txtEditorSaveBtnNovo.style.borderColor  = 'rgba(74,222,128,0.4)';
    setTimeout(() => {
      txtEditorSaveBtnNovo.textContent       = '💾 SALVAR';
      txtEditorSaveBtnNovo.style.color       = '#22d3ee';
      txtEditorSaveBtnNovo.style.borderColor = 'rgba(34,211,238,0.35)';
    }, 2000);

  } catch (err) {
    console.error(err);
    alert('Erro ao salvar arquivo');
  } finally {
    txtEditorSaveBtnNovo.style.opacity = '1';
    txtEditorSaveBtnNovo.disabled      = false;
  }
});

// Ctrl+S continua funcionando com o novo botão
txtEditorArea.addEventListener('keydown', (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key === 's') {
    e.preventDefault();
    txtEditorSaveBtnNovo.click();
  }
});





// ══════════════════════════════════════════════
// MOBILE — SIDEBAR DRAWER + TOUCH EVENTS
// ══════════════════════════════════════════════

const mobileMenuBtn    = document.getElementById('mobileMenuBtn');
const sidebarBackdrop  = document.getElementById('sidebarBackdrop');
const sidebarEl        = document.querySelector('.sidebar');

function abrirSidebar() {
  sidebarEl.classList.add('open');
  sidebarBackdrop.classList.add('active');
  document.body.style.overflow  = 'hidden';
}

function fecharSidebar() {
  sidebarEl.classList.remove('open');
  sidebarBackdrop.classList.remove('active');
  document.body.style.overflow  = '';
}

mobileMenuBtn.addEventListener('click', () => {
  sidebarEl.classList.contains('open') ? fecharSidebar() : abrirSidebar();
});

sidebarBackdrop.addEventListener('click', fecharSidebar);

// Evita estado "travado" ao trocar de orientação/tamanho da tela
window.addEventListener('resize', () => {
  if (window.innerWidth > 768) {
    fecharSidebar();
  }
});

// Fecha sidebar ao navegar (mobile)
document.querySelectorAll('.nav-item').forEach(item => {
  item.addEventListener('click', () => {
    if (window.innerWidth <= 768) fecharSidebar();
  });
});


// ── LONG PRESS → CONTEXT MENU (substitui drag no mobile) ──
function configurarLongPress(divEl, file) {
  let timer = null;
  let ativou = false;
  let startX = 0;
  let startY = 0;
  const MS = 480;

  divEl.addEventListener('touchstart', (e) => {
    ativou = false;
    startX = e.touches[0].clientX;
    startY = e.touches[0].clientY;

    // Feedback visual: escurece levemente ao pressionar
    divEl.style.transition = 'transform 0.1s, opacity 0.1s';

    timer = setTimeout(() => {
      ativou = true;
      if (navigator.vibrate) navigator.vibrate([20, 10, 20]); // duplo pulso háptico

      // Feedback visual de long press confirmado
      divEl.style.transform = 'scale(0.97)';
      divEl.style.opacity = '0.85';
      setTimeout(() => {
        divEl.style.transform = '';
        divEl.style.opacity = '';
      }, 200);

      if (isMobileViewport()) {
        // Abre o bottom sheet de ações ricas
        abrirAcoesItemMobile(file, divEl);
        return;
      }

      // Desktop: comportamento original
      itensSelecionados.clear();
      limparSelecaoVisual();
      itensSelecionados.add(file.nome);
      divEl.classList.add('selected');
      atualizarContadorSelecao();

      const touch = e.touches[0];
      const fakeEvent = {
        preventDefault: () => {},
        pageX: touch.clientX,
        pageY: touch.clientY,
        target: divEl
      };
      if (file.tipo === 'pasta') abrirMenuContextoPasta(fakeEvent, file.nome);
      else abrirMenuContexto(fakeEvent, file.nome, file.nome_original);

    }, MS);
  }, { passive: true });

  divEl.addEventListener('touchend', () => {
    clearTimeout(timer); timer = null;
    divEl.style.transform = '';
    divEl.style.opacity = '';
  });

  divEl.addEventListener('touchmove', (e) => {
    const dx = Math.abs(e.touches[0].clientX - startX);
    const dy = Math.abs(e.touches[0].clientY - startY);
    if (dx > 10 || dy > 10) {
      clearTimeout(timer); timer = null;
      divEl.style.transform = '';
      divEl.style.opacity = '';
    }
  });

  divEl.addEventListener('click', (e) => {
    if (ativou) { e.stopPropagation(); ativou = false; }
  }, true);
}


// ── BOTTOM SHEET DE AÇÕES — MOBILE LONG PRESS ──────────────
function abrirAcoesItemMobile(file, cardEl) {
  // Remove sheet anterior se existir
  const anterior = document.getElementById('mobileActionSheet');
  if (anterior) anterior.remove();
  const backdropAnterior = document.getElementById('mobileActionBackdrop');
  if (backdropAnterior) backdropAnterior.remove();

  const nomeExibido = file.nome_original || file.nome;
  const caminho = currentPath === '/' ? file.nome : `${currentPath}/${file.nome}`;
  const isTxt = nomeExibido.toLowerCase().match(/\.(txt|md)$/);
  const isPasta = file.tipo === 'pasta';
  const isImagem = nomeExibido.toLowerCase().match(/\.(jpg|jpeg|png|gif|webp)$/);

  // Backdrop
  const backdrop = document.createElement('div');
  backdrop.id = 'mobileActionBackdrop';
  backdrop.style.cssText = `
    position: fixed; inset: 0; z-index: 9998;
    background: rgba(0,0,0,0.45);
    backdrop-filter: blur(2px);
    animation: fadeIn 0.18s ease;
  `;

  // Sheet
  const sheet = document.createElement('div');
  sheet.id = 'mobileActionSheet';
  sheet.style.cssText = `
    position: fixed; bottom: 0; left: 0; right: 0; z-index: 9999;
    background: var(--bg-card, #1a2035);
    border-radius: 20px 20px 0 0;
    padding: 0 0 env(safe-area-inset-bottom, 16px);
    box-shadow: 0 -8px 40px rgba(0,0,0,0.5);
    animation: slideUpSheet 0.28s cubic-bezier(0.34,1.26,0.64,1);
    max-height: 85vh;
    overflow-y: auto;
    -webkit-overflow-scrolling: touch;
  `;

  // Cabeçalho do sheet
  const icone = getFileIcon(nomeExibido, file.tipo);
  sheet.innerHTML = `
    <style>
      @keyframes slideUpSheet { from { transform: translateY(100%); } to { transform: translateY(0); } }
      @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
      .mas-handle { width: 40px; height: 4px; background: rgba(255,255,255,0.15); border-radius: 99px; margin: 12px auto 0; }
      .mas-header { display: flex; align-items: center; gap: 12px; padding: 16px 20px 12px; border-bottom: 1px solid rgba(255,255,255,0.06); }
      .mas-header-icon { font-size: 28px; flex-shrink: 0; }
      .mas-header-name { font-size: 15px; font-weight: 600; color: var(--text-primary, #e2e8f0); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: calc(100% - 60px); }
      .mas-header-type { font-size: 11px; color: var(--text-muted, #64748b); margin-top: 2px; text-transform: uppercase; letter-spacing: 0.06em; }
      .mas-actions { padding: 8px 12px 8px; }
      .mas-action { display: flex; align-items: center; gap: 16px; padding: 14px 12px; border-radius: 12px; cursor: pointer; transition: background 0.15s; -webkit-tap-highlight-color: transparent; border: none; width: 100%; background: transparent; text-align: left; }
      .mas-action:active { background: rgba(255,255,255,0.06); transform: scale(0.98); }
      .mas-action-icon { font-size: 20px; width: 36px; height: 36px; display: flex; align-items: center; justify-content: center; border-radius: 10px; flex-shrink: 0; }
      .mas-action-text { font-size: 15px; color: var(--text-primary, #e2e8f0); font-family: 'Inter', sans-serif; }
      .mas-action-sub { font-size: 12px; color: var(--text-muted, #64748b); margin-top: 1px; }
      .mas-action.danger .mas-action-text { color: #f87171; }
      .mas-action.danger .mas-action-icon { background: rgba(248,113,113,0.12); }
      .mas-action.primary .mas-action-icon { background: rgba(34,211,238,0.12); }
      .mas-divider { height: 1px; background: rgba(255,255,255,0.06); margin: 4px 12px; }
      .mas-select-chip { display: inline-flex; align-items: center; gap: 6px; background: rgba(34,211,238,0.12); border: 1px solid rgba(34,211,238,0.25); color: #22d3ee; font-size: 11px; padding: 3px 10px; border-radius: 99px; margin-left: 8px; font-family: 'Inter', sans-serif; }
    </style>
    <div class="mas-handle"></div>
    <div class="mas-header">
      <div class="mas-header-icon">${icone}</div>
      <div>
        <div class="mas-header-name">${nomeExibido}</div>
        <div class="mas-header-type">${isPasta ? 'Pasta' : (file.tamanho ? formatarTamanho(file.tamanho) : 'Arquivo')}</div>
      </div>
    </div>
    <div class="mas-actions" id="masActionList"></div>
  `;

  const actionList = sheet.querySelector('#masActionList');

  function addAction(emoji, bg, label, sub, cls, onClick) {
    const btn = document.createElement('button');
    btn.className = `mas-action ${cls || ''}`;
    btn.innerHTML = `
      <div class="mas-action-icon" style="background:${bg};">${emoji}</div>
      <div>
        <div class="mas-action-text">${label}</div>
        ${sub ? `<div class="mas-action-sub">${sub}</div>` : ''}
      </div>
    `;
    btn.onclick = () => {
      fecharSheet();
      setTimeout(onClick, 120); // pequeno delay para o sheet fechar primeiro
    };
    actionList.appendChild(btn);
  }

  function addDivider() {
    const d = document.createElement('div');
    d.className = 'mas-divider';
    actionList.appendChild(d);
  }

  // ── Ações conforme tipo ──────────────────
  if (!isPasta) {
    addAction('👁', 'rgba(99,179,237,0.12)', 'Visualizar', 'Abrir pré-visualização', 'primary', () => {
      visualizarArquivo(caminho, nomeExibido);
    });
  }

  if (isPasta) {
    addAction('📂', 'rgba(34,211,238,0.12)', 'Abrir pasta', null, 'primary', () => {
      openItem(file.nome, 'pasta');
    });
  }

  if (!isPasta) {
    addAction('⬇️', 'rgba(74,222,128,0.12)', 'Baixar arquivo', null, '', () => {
      downloadFile(caminho, nomeExibido);
    });
  }

  if (isTxt) {
    addDivider();
    addAction('✏️', 'rgba(251,191,36,0.12)', 'Editar conteúdo', 'Abrir no editor de texto', '', () => {
      if (vaultMode) abrirEditorTxtVault(caminho, nomeExibido);
      else abrirEditorTxt(caminho, nomeExibido);
    });
  }

  addDivider();

  addAction('✂️', 'rgba(167,139,250,0.12)', 'Mover para...', 'Selecionar pasta de destino', '', () => {
    // Seleciona só esse item e abre o picker
    itensSelecionados.clear();
    limparSelecaoVisual();
    itensSelecionados.add(file.nome);
    cardEl.classList.add('selected');
    atualizarContadorSelecao();
    abrirMoveFolderPicker();
  });

  addAction('✏️', 'rgba(148,163,184,0.12)', 'Renomear', null, '', () => {
    const tipo = isPasta ? 'pasta' : 'arquivo';
    abrirModalRenomear(nomeExibido, caminho, tipo);
  });

  addDivider();

  // Seleção múltipla
  const jaSelec = itensSelecionados.has(file.nome);
  addAction(
    mobileSelectionMode ? '☑️' : '⊞',
    'rgba(34,211,238,0.08)',
    mobileSelectionMode ? (jaSelec ? 'Desmarcar este item' : 'Adicionar à seleção') : 'Selecionar múltiplos',
    mobileSelectionMode ? null : 'Ativa modo de seleção em lote',
    '',
    () => {
      if (!mobileSelectionMode) setMobileSelectionMode(true);
      toggleSelecaoItem(file, cardEl);
    }
  );

  addDivider();

  addAction('🗑️', 'rgba(248,113,113,0.12)', 'Deletar', isPasta ? 'Apaga a pasta e todo conteúdo' : 'Remove permanentemente', 'danger', () => {
    // Confirmação haptica + visual leve
    if (navigator.vibrate) navigator.vibrate(40);
    const tipo = isPasta ? 'pasta' : 'arquivo';
    if (confirm(`Deletar "${nomeExibido}"?`)) {
      deleteFile(caminho, tipo);
    }
  });

  // Padding final para safe area
  const pad = document.createElement('div');
  pad.style.height = '8px';
  sheet.appendChild(pad);

  function fecharSheet() {
    sheet.style.animation = 'none';
    sheet.style.transform = 'translateY(100%)';
    sheet.style.transition = 'transform 0.22s ease';
    backdrop.style.opacity = '0';
    backdrop.style.transition = 'opacity 0.22s';
    setTimeout(() => { sheet.remove(); backdrop.remove(); }, 230);
  }

  backdrop.onclick = fecharSheet;

  // Swipe down fecha
  let sheetTouchY = 0;
  sheet.addEventListener('touchstart', e => { sheetTouchY = e.touches[0].clientY; }, { passive: true });
  sheet.addEventListener('touchend', e => {
    if (e.changedTouches[0].clientY - sheetTouchY > 70) fecharSheet();
  });

  document.body.appendChild(backdrop);
  document.body.appendChild(sheet);
}









// ── PATCH: renderFiles também configura long press ──
const renderFilesOriginal = renderFiles;
window.renderFiles = function(files) {
  renderFilesOriginal(files);

  // após renderizar, adiciona long press em cada card
  document.querySelectorAll('.file-card').forEach(card => {
    const nome = card.dataset.nome;
    const file = files.find(f => f.nome === nome);
    if (file) configurarLongPress(card, file);
  });
};


// ── SWIPE DOWN FECHA BOTTOM SHEET ─────────────
let contextMenuTouchStartY = 0;

contextMenu.addEventListener('touchstart', (e) => {
  contextMenuTouchStartY = e.touches[0].clientY;
}, { passive: true });

contextMenu.addEventListener('touchend', (e) => {
  const delta = e.changedTouches[0].clientY - contextMenuTouchStartY;
  if (delta > 60) fecharMenuContexto(); // swipe down fecha
});




// ── DOUBLE TAP PARA ABRIR PASTA NO MOBILE ──────
// (já está no ondblclick, mas no iOS às vezes não dispara)
document.querySelectorAll('.file-card[data-type="pasta"]').forEach(card => {
  let lastTap = 0;
  card.addEventListener('touchend', () => {
    const now = Date.now();
    if (now - lastTap < 300) {
      const nome = card.dataset.nome;
      openItem(nome, 'pasta');
    }
    lastTap = now;
  });
});




document.addEventListener('contextmenu', (e) => {
  if (e.target.closest('.file-card')) {
    e.preventDefault(); // cancela menu nativo do browser
  }
});

if (mobileFabEl) {
  mobileFabEl.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();

    if (!isMobileViewport()) {
      uploadFile();
      return;
    }

    abrirFabSheetMobile();
  });
}

function abrirFabSheetMobile() {
  const anterior = document.getElementById('fabActionSheet');
  if (anterior) { anterior.remove(); document.getElementById('fabActionBackdrop')?.remove(); return; }

  const backdrop = document.createElement('div');
  backdrop.id = 'fabActionBackdrop';
  backdrop.style.cssText = `
    position: fixed; inset: 0; z-index: 9996;
    background: rgba(0,0,0,0.4);
    backdrop-filter: blur(2px);
    animation: fadeIn 0.18s ease;
  `;

  const sheet = document.createElement('div');
  sheet.id = 'fabActionSheet';
  sheet.style.cssText = `
    position: fixed; bottom: 0; left: 0; right: 0; z-index: 9997;
    background: var(--bg-card, #1a2035);
    border-radius: 20px 20px 0 0;
    padding-bottom: env(safe-area-inset-bottom, 16px);
    box-shadow: 0 -8px 40px rgba(0,0,0,0.5);
    animation: slideUpSheet 0.28s cubic-bezier(0.34,1.26,0.64,1);
  `;

  sheet.innerHTML = `
    <div style="width:40px;height:4px;background:rgba(255,255,255,0.15);border-radius:99px;margin:12px auto 0;"></div>
    <div style="padding:14px 20px 8px;font-size:12px;text-transform:uppercase;letter-spacing:0.1em;color:var(--text-muted,#64748b);font-family:'Inter',sans-serif;font-weight:600;">Ações</div>
    <div id="fabSheetActions" style="padding:0 12px 12px;"></div>
  `;

  const actionsEl = sheet.querySelector('#fabSheetActions');

  function addFabAction(emoji, label, sub, onClick) {
    const btn = document.createElement('button');
    btn.style.cssText = `
      display: flex; align-items: center; gap: 14px;
      padding: 13px 12px; border-radius: 12px; cursor: pointer;
      transition: background 0.15s; width: 100%; background: transparent;
      border: none; text-align: left; -webkit-tap-highlight-color: transparent;
    `;
    btn.innerHTML = `
      <div style="font-size:22px;width:40px;height:40px;display:flex;align-items:center;justify-content:center;border-radius:12px;background:rgba(255,255,255,0.05);flex-shrink:0;">${emoji}</div>
      <div>
        <div style="font-size:15px;color:var(--text-primary,#e2e8f0);font-family:'Inter',sans-serif;">${label}</div>
        ${sub ? `<div style="font-size:12px;color:var(--text-muted,#64748b);margin-top:2px;font-family:'Inter',sans-serif;">${sub}</div>` : ''}
      </div>
    `;
    btn.addEventListener('touchstart', () => { btn.style.background = 'rgba(255,255,255,0.06)'; }, { passive: true });
    btn.addEventListener('touchend', () => { btn.style.background = ''; }, { passive: true });
    btn.onclick = () => { fecharFabSheet(); setTimeout(onClick, 100); };
    actionsEl.appendChild(btn);
  }

  function addFabDivider() {
    const d = document.createElement('div');
    d.style.cssText = 'height:1px;background:rgba(255,255,255,0.06);margin:4px 0;';
    actionsEl.appendChild(d);
  }

  addFabAction('⬆️', 'Upload de arquivo', 'Enviar arquivos para esta pasta', () => uploadFile());
  addFabAction('📁', 'Nova pasta', 'Criar pasta neste diretório', () => {
    if (vaultMode) {
      arquivoParaRenomear = { nomeAtual: '', caminho_relativo: null, tipo: 'vault-nova-pasta' };
      renameInput.value = 'Nova Pasta';
      renameInput.placeholder = 'Nome da pasta...';
      renameModal.querySelector('h3').textContent = 'Nova pasta';
      renameModal.classList.add('active');
      setTimeout(() => { renameInput.focus(); renameInput.select(); }, 100);
      return;
    }
    fetch(`${window.CONFIG.API_BASE_URL}api/atlas-drive/criar-nova-Pasta`, {
      method: 'POST', credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ caminho_da_pasta: currentPath })
    })
    .then(res => { if (!res.ok) throw new Error(); return res.json(); })
    .then(() => { fetchFiles(currentPath); showMobileToast('Pasta criada ✓', 'success', 1800); })
    .catch(() => showMobileToast('Falha ao criar pasta.', 'error', 2200));
  });

  addFabAction('📄', 'Novo arquivo de texto', 'Criar documento .txt', () => {
    const tipoFluxo = vaultMode ? 'vault-novo-txt' : 'novo-txt';
    arquivoParaRenomear = { nomeAtual: '', caminho_relativo: null, tipo: tipoFluxo };
    renameInput.value = 'novo-arquivo.txt';
    renameInput.placeholder = 'nome-do-arquivo.txt';
    renameModal.querySelector('h3').textContent = 'Novo arquivo de texto';
    renameModal.classList.add('active');
    setTimeout(() => { renameInput.focus(); renameInput.select(); }, 100);
  });

  addFabDivider();

  addFabAction(
    mobileSelectionMode ? '✕' : '⊞',
    mobileSelectionMode ? 'Sair da seleção múltipla' : 'Selecionar múltiplos itens',
    mobileSelectionMode ? `${itensSelecionados.size} item(s) selecionado(s)` : 'Marcar itens para mover ou deletar',
    () => setMobileSelectionMode(!mobileSelectionMode)
  );

  if (mobileSelectionMode && itensSelecionados.size > 0) {
    addFabAction('✂️', `Mover ${itensSelecionados.size} item(s)`, 'Escolher pasta de destino', () => abrirMoveFolderPicker());
  }

  document.body.appendChild(backdrop);
  document.body.appendChild(sheet);

  function fecharFabSheet() {
    sheet.style.transform = 'translateY(100%)';
    sheet.style.transition = 'transform 0.22s ease';
    backdrop.style.opacity = '0';
    backdrop.style.transition = 'opacity 0.22s';
    setTimeout(() => { sheet.remove(); backdrop.remove(); }, 230);
  }

  backdrop.onclick = fecharFabSheet;

  let fabTouchY = 0;
  sheet.addEventListener('touchstart', e => { fabTouchY = e.touches[0].clientY; }, { passive: true });
  sheet.addEventListener('touchend', e => {
    if (e.changedTouches[0].clientY - fabTouchY > 70) fecharFabSheet();
  });
}












// ══════════════════════════════════════════════════
// DRAWER DE OPERAÇÕES — HISTÓRICO + ATIVAS
// ══════════════════════════════════════════════════

const _opAtivas    = {};   // id → {nome, tipo, isVault, percent, eta, bf, bt, xhr, vaultId}
const _opHistorico = [];   // [{nome, tipo, isVault, status, bf, bt, ts}] — últimas 20
const MAX_HISTORICO = 20;

// ── BADGE ──────────────────────────────────────────
function _opAtualizarBadge() {
  const count = Object.keys(_opAtivas).length;
  ['operacoesBadge', 'operacoesBadgeDrawer'].forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    if (count > 0) { el.textContent = count; el.style.display = 'flex'; }
    else { el.style.display = 'none'; }
  });
}

// ── ABRIR/FECHAR DRAWER ────────────────────────────
function abrirDrawerOperacoes() {
  document.getElementById('operacoesDrawer').classList.add('open');
  document.getElementById('operacoesBackdrop').classList.add('open');
  _opRenderDrawer();
}

function fecharDrawerOperacoes() {
  document.getElementById('operacoesDrawer').classList.remove('open');
  document.getElementById('operacoesBackdrop').classList.remove('open');
}

document.getElementById('opDrawerClose').addEventListener('click', fecharDrawerOperacoes);
document.getElementById('operacoesBackdrop').addEventListener('click', fecharDrawerOperacoes);

// Swipe direita fecha no mobile
let _opSwipeStartX = 0;
document.getElementById('operacoesDrawer').addEventListener('touchstart', e => {
  _opSwipeStartX = e.touches[0].clientX;
}, { passive: true });
document.getElementById('operacoesDrawer').addEventListener('touchend', e => {
  if (e.changedTouches[0].clientX - _opSwipeStartX > 80) fecharDrawerOperacoes();
});

// ── CRIAR OPERAÇÃO ─────────────────────────────────
function opCriar(id, nome, tipo, isVault, xhrRef) {
  _opAtivas[id] = {
    nome, tipo, isVault,
    percent: 0, eta: '',
    bf: 0, bt: 0,
    xhrRef: xhrRef || null,
    inicioMs: Date.now()
  };
  _opAtualizarBadge();
  _opRenderDrawer();
}

// ── ATUALIZAR ──────────────────────────────────────
function opAtualizar(id, percent, bf, bt, etaStr) {
  const op = _opAtivas[id];
  if (!op) return;
  op.percent = percent;
  op.bf = bf || 0;
  op.bt = bt || 0;
  op.eta = etaStr || '';

  // atualização live — sem re-render total
  const barEl = document.getElementById(`opd-bar-${id}`);
  const pctEl = document.getElementById(`opd-pct-${id}`);
  const etaEl = document.getElementById(`opd-eta-${id}`);
  const metaEl = document.getElementById(`opd-meta-${id}`);

  if (barEl) barEl.style.width = Math.round(percent) + '%';
  if (pctEl) pctEl.textContent = Math.round(percent) + '%';
  if (etaEl) etaEl.textContent = etaStr || '';
  if (metaEl && bt > 0) {
    metaEl.textContent = `${formatarTamanho(bf)} de ${formatarTamanho(bt)}${etaStr ? ' · ' + etaStr : ''}`;
  }
}

// ── FINALIZAR ──────────────────────────────────────
function opFinalizar(id, sucesso) {
  const op = _opAtivas[id];
  if (!op) return;

  // adiciona ao histórico
  _opHistorico.unshift({
    nome: op.nome,
    tipo: op.tipo,
    isVault: op.isVault,
    status: sucesso ? 'done' : 'error',
    bf: op.bf,
    bt: op.bt,
    ts: Date.now()
  });
  if (_opHistorico.length > MAX_HISTORICO) _opHistorico.pop();

  delete _opAtivas[id];
  _opAtualizarBadge();

  // atualiza card live se drawer aberto
  const cardEl = document.getElementById(`opd-card-${id}`);
  if (cardEl) {
    const barEl = document.getElementById(`opd-bar-${id}`);
    const pctEl = document.getElementById(`opd-pct-${id}`);
    const etaEl = document.getElementById(`opd-eta-${id}`);

    if (barEl) {
      barEl.style.width = '100%';
      barEl.className = `op-progress-fill ${sucesso ? 'done' : 'error'}`;
    }
    if (pctEl) {
      pctEl.textContent = sucesso ? '✓' : '✕';
      pctEl.className = `op-pct ${sucesso ? 'done' : 'error'}`;
    }
    if (etaEl) etaEl.textContent = '';

    // move card para histórico após 1.5s
    setTimeout(() => _opRenderDrawer(), 1500);
  } else {
    _opRenderDrawer();
  }
}

// ── CANCELAR ───────────────────────────────────────
function opCancelar(id) {
  const op = _opAtivas[id];
  if (!op) return;
  if (op.xhrRef) op.xhrRef.abort();

  _opHistorico.unshift({
    nome: op.nome, tipo: op.tipo, isVault: op.isVault,
    status: 'cancelled', bf: op.bf, bt: op.bt, ts: Date.now()
  });
  if (_opHistorico.length > MAX_HISTORICO) _opHistorico.pop();

  delete _opAtivas[id];
  _opAtualizarBadge();
  _opRenderDrawer();
}

// ── RENDER COMPLETO DO DRAWER ──────────────────────
function _opRenderDrawer() {
  const ativas    = Object.entries(_opAtivas);
  const historico = _opHistorico;

  const secAtivas    = document.getElementById('opSectionAtivas');
  const secHistorico = document.getElementById('opSectionHistorico');
  const emptyEl      = document.getElementById('opEmpty');
  const listAtivas   = document.getElementById('opListAtivas');
  const listHistorico = document.getElementById('opListHistorico');

  if (!secAtivas) return;

  const temQualquerCoisa = ativas.length > 0 || historico.length > 0;

  // empty state
  emptyEl.className = temQualquerCoisa ? 'op-empty' : 'op-empty visible';

  // seção ativas
  secAtivas.style.display = ativas.length > 0 ? 'block' : 'none';
  listAtivas.innerHTML = ativas.map(([id, op]) => _opCardAtiva(id, op)).join('');

  // bind dos botões cancelar
  ativas.forEach(([id, op]) => {
    const btn = document.getElementById(`opd-cancel-${id}`);
    if (btn) btn.onclick = () => {
      if (op.isVault) cancelarVaultTransferencia(Number(id));
      else cancelarTransferencia(Number(id));
      opCancelar(id);
    };
  });

  // seção histórico
  if (historico.length > 0) {
    secHistorico.style.display = 'block';
    listHistorico.innerHTML = historico.map((h, i) => _opCardHistorico(h, i)).join('');

    // botão limpar
    if (!document.getElementById('opClearBtn')) {
      const btn = document.createElement('button');
      btn.id = 'opClearBtn';
      btn.className = 'op-clear-btn';
      btn.textContent = 'Limpar histórico';
      btn.onclick = () => { _opHistorico.length = 0; _opRenderDrawer(); };
      secHistorico.appendChild(btn);
    }
  } else {
    secHistorico.style.display = 'none';
  }
}

function _opIconClass(tipo, isVault) {
  if (isVault) return 'vault-op';
  return tipo; // 'upload' | 'download'
}

function _opIconLabel(tipo) {
  return tipo === 'upload' ? '↑' : '↓';
}

function _opCardAtiva(id, op) {
  const cls  = _opIconClass(op.tipo, op.isVault);
  const pct  = Math.round(op.percent);
  const meta = op.bt > 0
    ? `${formatarTamanho(op.bf)} de ${formatarTamanho(op.bt)}${op.eta ? ' · ' + op.eta : ''}`
    : (op.isVault ? op.tipo + ' · vault' : op.tipo);

  return `
    <div class="op-card" id="opd-card-${id}">
      <div class="op-card-row">
        <div class="op-card-icon ${cls}">${_opIconLabel(op.tipo)}</div>
        <div class="op-card-text">
          <div class="op-card-name">${op.nome}</div>
          <div class="op-card-meta" id="opd-meta-${id}">${meta}</div>
        </div>
        <div class="op-card-right">
          <span class="op-pct" id="opd-pct-${id}">${pct}%</span>
          <button class="op-cancel-btn" id="opd-cancel-${id}" title="Cancelar">✕</button>
        </div>
      </div>
      <div class="op-progress-wrap">
        <div class="op-progress-bg">
          <div class="op-progress-fill ${cls}" id="opd-bar-${id}" style="width:${pct}%"></div>
        </div>
        <span class="op-eta" id="opd-eta-${id}">${op.eta || ''}</span>
      </div>
    </div>`;
}

function _opCardHistorico(h, i) {
  const cls     = _opIconClass(h.tipo, h.isVault);
  const sizeStr = h.bt > 0 ? formatarTamanho(h.bt) : '';
  const tsStr   = _opTempoRelativo(h.ts);
  const meta    = [sizeStr, tsStr].filter(Boolean).join(' · ');

  const chipLabel = h.status === 'done' ? 'Concluído'
    : h.status === 'cancelled' ? 'Cancelado'
    : 'Erro';

  return `
    <div class="op-card historico">
      <div class="op-card-row">
        <div class="op-card-icon ${cls}" style="opacity:0.6;">${_opIconLabel(h.tipo)}</div>
        <div class="op-card-text">
          <div class="op-card-name">${h.nome}</div>
          <div class="op-card-meta">${meta}</div>
        </div>
        <div class="op-card-right">
          <span class="op-status-chip ${h.status}">${chipLabel}</span>
        </div>
      </div>
      <div class="op-progress-bg" style="margin-top:0;">
        <div class="op-progress-fill ${h.status}" style="width:100%;transition:none;"></div>
      </div>
    </div>`;
}

function _opTempoRelativo(ts) {
  const s = Math.round((Date.now() - ts) / 1000);
  if (s < 5)  return 'agora';
  if (s < 60) return `${s}s atrás`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}min atrás`;
  return `${Math.floor(m / 60)}h atrás`;
}



// ══════════════════════════════════════════════
// DARK MODE — integrado com localStorage atlasTheme
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

