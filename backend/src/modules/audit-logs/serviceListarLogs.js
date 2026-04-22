const fs = require("fs").promises;
const path = require("path");
const AppError = require("../../error/AppError");

/**
 * Lê o conteúdo de um arquivo de log específico dentro do diretório permitido.
 * @param {string} nome_log_arquivo - O nome do arquivo (ex: 'sistema.log')
 */
async function service_listarlogs(nome_log_arquivo) {
    const caminho_raiz_atlas_logs = process.env.CAMINHO_ATLAS_LOGS;

    if (!caminho_raiz_atlas_logs) {
        throw new AppError("A variável de ambiente CAMINHO_ATLAS_LOGS não foi definida.", 500);
    }

    if (!nome_log_arquivo) {
        throw new AppError("O nome do arquivo de log deve ser fornecido.", 400);
    }

    // 1. SEGURANÇA: Resolve o caminho e remove tentativas de sair da pasta (ex: ../../etc/passwd)
    const nomeBase = path.basename(nome_log_arquivo);
    const caminhoFinal = path.resolve(caminho_raiz_atlas_logs, nomeBase);

    // 2. SEGURANÇA: Verifica se o caminho final ainda começa com o diretório base permitido
    // (Previne burlar o path.basename em sistemas específicos)
    if (!caminhoFinal.startsWith(path.resolve(caminho_raiz_atlas_logs))) {
        throw new AppError("Acesso negado ao caminho especificado.", 403);
    }

    try {
        // 3. Verifica se o arquivo existe antes de tentar ler
        await fs.access(caminhoFinal);
        
        // 4. Lê o conteúdo em texto (UTF-8)
        const conteudo = await fs.readFile(caminhoFinal, "utf-8");
        
        return conteudo;
    } catch (error) {
        if (error.code === 'ENOENT') {
            throw new AppError("Arquivo de log não encontrado.", 404);
        }
        
        throw new AppError(`Erro ao ler o arquivo: ${error.message}`, 500);
    }
}

module.exports = { service_listarlogs };
