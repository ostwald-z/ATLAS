const AppError = require("../../../../error/AppError");
const fs = require("fs/promises");
const path = require("path");

/**
 * Service para Upload de arquivos.
 * Root: ATLAS_CLOUD_PATH/_vault020/
 */
async function upload_arquivo_service_vault(arquivo, caminho_escolhido = "") {

    if (!arquivo) {
        throw new AppError("Nenhum arquivo recebido.", 400);
    }

    // 1. Definição da Raiz (Vault)
    const base_vault = path.resolve(process.env.ATLAS_CLOUD_PATH, "_vault020");

    // 2. Sanitização do caminho de destino
    // Remove barras do início/fim e normaliza
    const safeSubPath = caminho_escolhido
        .replace(/^[\\/]+|[\\/]+$/g, '')
        .replace(/\\/g, "/");

    const pastaDestinoAbsoluta = path.join(base_vault, safeSubPath);

    // 3. Segurança Anti-Jailbreak
    if (!pastaDestinoAbsoluta.startsWith(base_vault)) {
        throw new AppError("Tentativa de acesso não autorizado ao diretório.", 403);
    }

    try {
        // 4. Cria a estrutura de pastas se não existir
        await fs.mkdir(pastaDestinoAbsoluta, { recursive: true });

        // 5. Sanitização do nome do arquivo original
        // Evita caracteres que quebram o Windows/Linux
        const nomeArquivoLimpo = arquivo.originalname
            .replace(/[<>:"/\\|?*\x00-\x1F]/g, '')
            .replace(/[.\s]+$/g, '');

        const caminhoArquivoCompleto = path.join(pastaDestinoAbsoluta, nomeArquivoLimpo);

        // 6. Verificação de Duplicidade (Opcional)
        // Se quiser sobrescrever, remova este bloco.
        try {
            await fs.access(caminhoArquivoCompleto);
            throw new AppError("Já existe um arquivo com este nome nesta pasta.", 400);
        } catch (err) {
            if (err.statusCode === 400) throw err;
            // Se cair no erro de 'não encontrado', segue o baile para o upload
        }

        // 7. Escrita do arquivo no disco
        await fs.writeFile(caminhoArquivoCompleto, arquivo.buffer);

        // 8. Retorno dos metadados físicos
        return {
            status: "sucesso",
            mensagem: "Arquivo salvo no vault",
            detalhes: {
                nome: nomeArquivoLimpo,
                caminho_relativo: path.posix.join(safeSubPath, nomeArquivoLimpo),
                tamanho: arquivo.size,
                mimetype: arquivo.mimetype
            }
        };

    } catch (err) {
        if (err instanceof AppError) throw err;
        console.error("Erro no upload FS:", err);
        throw new AppError("Erro técnico ao salvar o arquivo no disco.");
    }
}

module.exports = {
    upload_arquivo_service_vault
};
