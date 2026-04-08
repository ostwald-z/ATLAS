// ==========================
// VERIFICAÇÃO DE LOGIN
// ==========================
(async function checkAuth() {
  try {
    const res = await fetch('http://localhost:5555/api/user/apicheck', {
      method: 'GET',
      credentials: 'include'
    });

    if (!res.ok) {
      // Token inválido ou não existe -> redireciona
      window.location.href = '../../../painelDeLogin/login/index.html';
      return;
    }

    const data = await res.json();
    console.log('Usuário autenticado:', data.user);

  } catch (err) {
    console.error('Erro na verificação de token:', err);
    window.location.href = '../../../painelDeLogin/login/index.html';
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

transferCloseBtn.onclick = (e) => {
  e.stopPropagation();
  transferPanel.style.display = 'none';
  transferencias = {};
  transferList.innerHTML = '';
};

transferPanelHeader.onclick = () => {
  panelMinimizado = !panelMinimizado;
  transferList.style.display = panelMinimizado ? 'none' : 'block';
  transferToggleIcon.textContent = panelMinimizado ? '▸' : '▾';
};

function criarTransferencia(nome, tipo) {
  const id = ++transferIdCounter;

  transferencias[id] = { nome, tipo, percent: 0, status: 'running' };

  const item = document.createElement('div');
  item.className = 'transfer-item';
  item.id = `transfer-${id}`;

  const icone = tipo === 'upload' ? '⬆️' : '⬇️';

  item.innerHTML = `
    <div class="transfer-item-header">
      <span class="transfer-item-name">${icone} ${nome}</span>
      <span class="transfer-item-status" id="transfer-status-${id}">0%</span>
    </div>
    <div class="transfer-bar-bg">
      <div class="transfer-bar-fill" id="transfer-bar-${id}"></div>
    </div>
  `;

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

function atualizarTransferencia(id, percent) {
  const bar = document.getElementById(`transfer-bar-${id}`);
  const status = document.getElementById(`transfer-status-${id}`);

  if (!bar || !status) return;

  bar.style.width = percent + '%';
  status.textContent = Math.round(percent) + '%';
}

function finalizarTransferencia(id, sucesso = true) {
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










function limparSelecaoVisual() {
  document.querySelectorAll('.file-card').forEach(card => card.classList.remove('selected'));
}

function marcarSelecionado(el) {
  el.classList.add('selected');
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
    const response = await fetch(`http://localhost:5555/api/atlas-drive/cloud?path=${encodeURIComponent(path)}`, {
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

      xhr.open('POST', 'http://localhost:5555/api/atlas-drive/upload', true);
      xhr.withCredentials = true;

      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) {
          atualizarTransferencia(id, (e.loaded / e.total) * 100);
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
    const response = await fetch('http://localhost:5555/api/atlas-drive/download', {
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
        if (e.ctrlKey) {
          if (itensSelecionados.has(file.nome)) { itensSelecionados.delete(file.nome); div.classList.remove('selected'); }
          else { itensSelecionados.add(file.nome); div.classList.add('selected'); }
          atualizarContadorSelecao(); return;
        }
        // clique simples só seleciona, não entra
        itensSelecionados.clear();
        limparSelecaoVisual();
        div.classList.add('selected');
        itensSelecionados.add(file.nome);
        atualizarContadorSelecao();
      };

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

  selectionInfo.innerHTML = `
    <div style="color:#22d3ee; margin-bottom:6px;">
      ${itensSelecionados.size} item(s) selecionado(s)
    </div>
    <div style="font-size:12px; color:#94a3b8;">
      ${nomes.join('<br>--------------------<br>')}
      ${itensSelecionados.size > 5 ? '<br>...' : ''}
    </div>
  `;
}




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






function downloadFile(caminho_relativo, nomeOriginal) {
  const id = criarTransferencia(nomeOriginal || caminho_relativo, 'download');

  const xhr = new XMLHttpRequest();
  xhr.open('POST', 'http://localhost:5555/api/atlas-drive/download', true);
  xhr.responseType = 'blob';
  xhr.withCredentials = true;
  xhr.setRequestHeader('Content-Type', 'application/json');

  xhr.onprogress = (e) => {
    if (e.lengthComputable) {
      atualizarTransferencia(id, (e.loaded / e.total) * 100);
    }
  };

  xhr.onload = () => {
    if (xhr.status === 200) {
      finalizarTransferencia(id, true);

      const a = document.createElement('a');
      const url = window.URL.createObjectURL(xhr.response);
      a.href = url;
      a.download = nomeOriginal || caminho_relativo;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } else {
      finalizarTransferencia(id, false);
    }
  };

  xhr.onerror = () => finalizarTransferencia(id, false);

  xhr.send(JSON.stringify({ caminho_arquivo: caminho_relativo }));
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

    const response = await fetch('http://localhost:5555/api/atlas-drive/download', {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        caminho_arquivo: caminho_relativo
      })
    });

    if (!response.ok) throw new Error('Erro ao buscar arquivo');

    const blob = await response.blob();
    const url = URL.createObjectURL(blob);

    const nome = (nomeOriginal || '').toLowerCase();

    previewHeader.textContent = `${getIcon(nome)} ${formatarNomeArquivo(nomeOriginal)}`;

    previewContent.innerHTML = '';

    //  IMAGEM
    if (nome.match(/\.(jpg|jpeg|png|gif|webp)$/)) {
      previewContent.innerHTML = `<img src="${url}" style="max-width:100%; max-height:100%;">`;
    }

    //  TEXTO
    else if (nome.match(/\.(txt|json|js|html|css|md)$/)) {
      const text = await blob.text();
      previewContent.innerHTML = `<pre style="white-space: pre-wrap;">${text}</pre>`;
    }

    //  ZIP (básico)
    else if (nome.match(/\.(zip)$/)) {
      previewContent.innerHTML = `
        <div style="color:#94a3b8;">
          Visualização básica de ZIP não implementada ainda <br>
          (precisa de lib tipo JSZip)
        </div>
      `;
    }

    // OUTROS
    else {
      previewContent.innerHTML = `
        <div style="color:#94a3b8;">
          Não foi possível pré-visualizar esse item
        </div>
      `;
    }

    previewModal.style.opacity = '1';
    previewModal.style.pointerEvents = 'all';

  } catch (err) {
    console.error(err);
    alert('Erro ao visualizar arquivo');
  } finally {
    finishProgress();
  }
}





async function deleteFile(caminho_relativo, pasta_ou_arquivo) {
  try {
    const response = await fetch('http://localhost:5555/api/atlas-drive/delete', {
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
}


// RENOMEIA TANTO ARQUIVO QUANTO PASTA - DEPENDENDO DE COMO O CAMINHO DIRETORIO É ENVIADO
async function renameFile(caminho_relativo, novo_nome, pasta_ou_arquivo, mover) {
  try {
    const response = await fetch('http://localhost:5555/api/atlas-drive/renomear', {
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

  } catch (error) {
    console.error('renameFile:', error);
    alert('Erro ao renomear arquivo');
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



// CONTEXTO SOBRE ARQUIVOS
function abrirMenuContexto(e, nome, nomeOriginal) {
  e.preventDefault();

  const caminho_relativo = currentPath === '/' ? nome : currentPath + '/' + nome;

  // Posiciona primeiro invisível
  contextMenu.style.top = `${e.pageY}px`;
  contextMenu.style.left = `${e.pageX}px`;

  // força reflow pra animação funcionar sempre
  contextMenu.classList.remove('active');
  void contextMenu.offsetWidth;

  // ativa animação
  contextMenu.classList.add('active');

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

  const caminho_relativo = currentPath === '/' ? nome : currentPath + '/' + nome;

  // posição
  contextMenu.style.top = `${e.pageY}px`;
  contextMenu.style.left = `${e.pageX}px`;

  contextMenu.classList.remove('active');
  void contextMenu.offsetWidth;
  contextMenu.classList.add('active');

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

  // posição
  contextMenu.style.top = `${e.pageY}px`;
  contextMenu.style.left = `${e.pageX}px`;

  contextMenu.classList.remove('active');
  void contextMenu.offsetWidth;
  contextMenu.classList.add('active');

  // 🔥 ESCONDE opções de arquivo
  visualizarItem.style.display = 'none';
  downloadOption.style.display = 'none';
  MudarNomeOption.style.display = 'none';
  deletarArquivo.style.display = 'none';

  // 🔥 MOSTRA opções novas
  criarArquivo.style.display = 'block';
  criarPasta.style.display = 'block';

  // ==========================
  // AQUI VAI AS FUNÇÕES
  // ==========================
  criarArquivo.onclick = () => {
    console.log('Criar arquivo de texto');
    fecharMenuContexto();
  };

  criarPasta.onclick = () => {
    console.log('Criar nova pasta');
    fecharMenuContexto();
  };
}



// Esconde o menu se o usuário clicar em qualquer outro lugar da tela
document.addEventListener('click', (e) => {
  if (!contextMenu.contains(e.target)) {
    fecharMenuContexto();
  }
});


function fecharMenuContexto() {
  contextMenu.classList.remove('active');

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


previewModal.addEventListener('click', (e) => {
  if (e.target === previewModal) {
    previewModal.style.opacity = '0';
    previewModal.style.pointerEvents = 'none';
    previewContent.innerHTML = '';
  }
});



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
  // só botão esquerdo
  if (e.button !== 0) return;

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
      card.style.border = '1px solid #22d3ee';
    } else {
      itensSelecionados.delete(nome);
      card.style.border = '1px solid transparent';
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
    acabouDeSelecionar = false; // 🔥 consome a flag, ignora esse click
    return;
  }

  const clicouEmArquivo = e.target.closest('.file-card');
  const clicouMenu = e.target.closest('.context-menu');

  if (!clicouEmArquivo && !clicouMenu) {
    itensSelecionados.clear();
    limparSelecaoVisual();
    atualizarContadorSelecao();
  }
});

