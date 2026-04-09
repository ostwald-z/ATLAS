const AppError = require("../../../../error/AppError");
const path = require('path');
const fs = require("fs");
const mime = require("mime-types"); // Sugestão: npm install mime-types (opcional, veja abaixo)

/**
 * Service para Download e Visualização de arquivos.
 * Root: ATLAS_CLOUD_PATH/_vault020/
 */
async function download_arquivo_service_vault(caminho_do_arquivo) {
    
    // 1. Configuração da Raiz (Root do Vault)
    const base_vault = path.resolve(process.env.ATLAS_CLOUD_PATH, "_vault020");

    // 2. Limpeza e Normalização do caminho vindo do front
    // Remove barras iniciais/finais e garante que seja relativo
    const caminho_limpo = caminho_do_arquivo.replace(/^[\\/]+|[\\/]+$/g, '').replace(/\\/g, '/');

    // 3. Construção do Caminho Absoluto
    const filePath = path.join(base_vault, caminho_limpo);

    // 4. VALIDAÇÃO DE SEGURANÇA (Anti-Jailbreak)
    // Garante que o usuário não pediu algo como "../../env"
    if (!filePath.startsWith(base_vault)) {
        throw new AppError('Acesso não autorizado', 403);
    }

    // 5. Verifica se o arquivo de fato existe no disco
    if (!fs.existsSync(filePath)) {
        throw new AppError('Arquivo não encontrado no servidor', 404);
    }

    // Opcional: Garante que não estão tentando baixar uma pasta como se fosse arquivo
    const stats = fs.statSync(filePath);
    if (stats.isDirectory()) {
        throw new AppError('O caminho especificado é uma pasta e não um arquivo.', 400);
    }

    // 6. Resgata informações básicas do arquivo físico
    const originalName = path.basename(filePath);
    
    // Tenta identificar o tipo do arquivo pela extensão (MIME Type)
    // Se não quiser usar a lib 'mime-types', pode retornar null ou 'application/octet-stream'
    const mimeType = mime.lookup(filePath) || 'application/octet-stream';

    return {
        path: filePath,        // Caminho absoluto para o fs.readFile ou res.download
        originalName: originalName,
        mimeType: mimeType
    };
}

module.exports = { download_arquivo_service_vault };
