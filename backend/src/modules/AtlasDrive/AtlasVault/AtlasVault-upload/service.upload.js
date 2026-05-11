const AppError = require("../../../../error/AppError");
const fs = require("fs/promises");
const path = require("path");

/**
 * Service para Upload de arquivos.
 * Root: ATLAS_CLOUD_PATH/_vault020/
 */
async function upload_arquivo_service_vault(arquivo, caminho_escolhido = "") {
    // 1. Validação robusta antes de qualquer ação no disco
    if (!arquivo) throw new AppError("Nenhum arquivo recebido.", 400);

    // Se o multer mandar req.files (array), pegamos o primeiro
    const fileData = Array.isArray(arquivo) ? arquivo[0] : arquivo;

    // Pega o conteúdo (pode vir de .buffer ou de um arquivo temporário no disco)
    let conteudo;
    if (fileData.buffer) {
        conteudo = fileData.buffer;
    } else if (fileData.path) {
        conteudo = await fs.readFile(fileData.path); // lê do temp se não estiver na RAM
    }

    if (!conteudo) {
        throw new AppError("O conteúdo do arquivo está vazio ou inválido.", 400);
    }

    const base_vault = path.resolve(process.env.ATLAS_CLOUD_PATH, "_vault020");

    const safeSubPath = caminho_escolhido
        .replace(/^[\\/]+|[\\/]+$/g, '')
        .replace(/\\/g, "/");

    const pastaDestinoAbsoluta = path.join(base_vault, safeSubPath);

    if (!pastaDestinoAbsoluta.startsWith(base_vault)) {
        throw new AppError("Tentativa de acesso não autorizado.", 403);
    }

    // 2. Sanitização do nome
    const nomeOriginal = fileData.originalname || "arquivo_sem_nome";
    const nomeArquivoLimpo = nomeOriginal
        .replace(/[<>:"/\\|?*\x00-\x1F]/g, '')
        .replace(/[.\s]+$/g, '');

    const caminhoArquivoCompleto = path.join(pastaDestinoAbsoluta, nomeArquivoLimpo);

    try {
        // 3. Só cria a pasta AGORA, logo antes de escrever
        await fs.mkdir(pastaDestinoAbsoluta, { recursive: true });

        // 4. Escrita (usando a variável 'conteudo' que validamos lá em cima)
        await fs.writeFile(caminhoArquivoCompleto, conteudo);

        return {
            status: "sucesso",
            detalhes: {
                nome: nomeArquivoLimpo,
                caminho_relativo: path.posix.join(safeSubPath, nomeArquivoLimpo),
                tamanho: fileData.size
            }
        };
    } catch (err) {
        console.error("Erro no FS:", err);
        throw new AppError("Erro técnico ao salvar no disco.");
    }
}

module.exports = {
    upload_arquivo_service_vault
};
