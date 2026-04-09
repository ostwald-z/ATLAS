const AppError = require("../../../../error/AppError");
const fs = require("fs");
const path = require("path");

/**
 * Service para renomear ou mover arquivos e pastas no disco.
 * Operação 100% via FileSystem dentro da raiz _vault020.
 */
async function renomear_arquivo_vault(caminho_arquivo, novo_nome, pasta_ou_arquivo, mover) {
    
    if (!pasta_ou_arquivo) {
        throw new AppError("Tipo (pasta ou arquivo) não definido.", 400);
    }

    // 1. Definição da Raiz Real (Root)
    // Onde tudo acontece: ATLAS_CLOUD_PATH/_vault020/
    const base_vault = path.resolve(process.env.ATLAS_CLOUD_PATH, "_vault020");

    // 2. Limpeza dos inputs do frontend (remove barras iniciais/finais e normaliza contra caminhos do Windows)
    const caminho_relativo_origem = caminho_arquivo.replace(/^[\\/]+|[\\/]+$/g, '').replace(/\\/g, '/');
    let caminho_relativo_destino = novo_nome.replace(/^[\\/]+|[\\/]+$/g, '').replace(/\\/g, '/');

    // 3. Lógica de Destino: Se não for mover, o novo nome deve ficar na MESMA pasta da origem
    if (mover !== "sim") {
        const pastaPaiOrigem = path.dirname(caminho_relativo_origem);
        
        // Sanitiza apenas o nome final para não quebrar o sistema de arquivos
        const nomeFinalSanitizado = sanitizarNomeFinal(novo_nome);

        caminho_relativo_destino = pastaPaiOrigem === '.' 
            ? nomeFinalSanitizado 
            : path.join(pastaPaiOrigem, nomeFinalSanitizado).replace(/\\/g, '/');
    }

    // 4. Construção dos Caminhos Absolutos no Servidor
    const abs_origem = path.join(base_vault, caminho_relativo_origem);
    const abs_destino = path.join(base_vault, caminho_relativo_destino);

    // 5. VALIDAÇÃO DE SEGURANÇA (Anti-Jailbreak)
    // Impede que o usuário use "../" para tentar acessar pastas fora do _vault020
    if (!abs_origem.startsWith(base_vault) || !abs_destino.startsWith(base_vault)) {
        throw new AppError("Acesso não autorizado: Tentativa de sair do diretório permitido.", 403);
    }

    // 6. Verificações de Existência
    if (!fs.existsSync(abs_origem)) {
        throw new AppError(`${pasta_ou_arquivo === 'pasta' ? 'Pasta' : 'Arquivo'} de origem não encontrado no vault.`, 404);
    }

    // Opcional: Impedir sobrescrever arquivos existentes
    if (fs.existsSync(abs_destino)) {
        throw new AppError("Já existe um item com esse nome/caminho no destino.", 400);
    }

    try {
        // 7. Garantir que a pasta de destino existe (útil para o comando MOVER)
        const pastaDestinoPaiAbsoluta = path.dirname(abs_destino);
        if (!fs.existsSync(pastaDestinoPaiAbsoluta)) {
            fs.mkdirSync(pastaDestinoPaiAbsoluta, { recursive: true });
        }

        // 8. Execução no Disco
        // fs.renameSync move o arquivo se o path for diferente, ou renomeia se for o mesmo path.
        fs.renameSync(abs_origem, abs_destino);

        return { 
            status: "sucesso", 
            operacao: mover === "sim" ? "mover" : "renomear",
            caminho_final: caminho_relativo_destino
        };

    } catch (err) {
        console.error("Erro crítico no FS:", err);
        throw new AppError("Erro técnico ao manipular o item no servidor.", 500);
    }
}

/**
 * Remove caracteres proibidos por sistemas operacionais (Windows/Linux)
 * para evitar erros ao criar pastas ou arquivos físicos.
 */
function sanitizarNomeFinal(nome) {
    if (!nome || typeof nome !== 'string') return "item_sem_nome";
    
    // Remove <>:"/\|?* e caracteres de controle
    let limpo = nome.trim()
        .replace(/[<>:"/\\|?*\x00-\x1F]/g, '')
        .replace(/[.\s]+$/g, ''); // Remove pontos/espaços no final (proibido no Windows)

    const reservados = /^(con|prn|aux|nul|com[1-9]|lpt[1-9])(\..*)?$/i;
    if (reservados.test(limpo)) limpo = `v_${limpo}`;

    return limpo || "item_renomeado";
}

module.exports = { renomear_arquivo_vault };
