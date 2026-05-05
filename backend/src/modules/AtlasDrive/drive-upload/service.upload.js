const AppError = require("../../../error/AppError");

const fs = require("fs/promises");
const path = require("path");
const crypto = require("crypto");

const repo_upload = require("./repo.upload");

/**
 * Upload de arquivo usando STREAM (via multer diskStorage)
 *
 * IMPORTANTE:
 * - Aqui NÃO usamos arquivo.buffer
 * - O multer já salvou o arquivo em disco (arquivo.path)
 * - Nós apenas movemos o arquivo para o destino final
 */
async function upload_arquivo_service(arquivo, dono_id, caminho_escolhido = "") {

    if (!arquivo) {
        throw new AppError("Arquivo não enviado", 400);
    }

    // 🔹 Caminho base do usuário
    const basePath = path.join(process.env.ATLAS_CLOUD_PATH, String(dono_id));

    // 🔹 Sanitização do caminho (proteção contra path traversal)
    const safeSubPath = path
        .normalize(caminho_escolhido || "")
        .replace(/^\/+/, "")   // remove barra inicial
        .replace(/\\/g, "/");  // padroniza

    const pastaUsuario = path.join(basePath, safeSubPath);

    // 🔒 Proteção: impede sair da pasta do usuário
    if (!pastaUsuario.startsWith(basePath)) {
        throw new AppError("Caminho inválido", 403);
    }

    // 📁 Garante que a pasta existe
    await fs.mkdir(pastaUsuario, { recursive: true });

    // 🔹 Gera nome único
    const extension = path.extname(arquivo.originalname);
    const uniqueName = crypto.randomUUID() + extension;

    const caminhoCompleto = path.join(pastaUsuario, uniqueName);

    /**
     * ✅ AQUI ESTÁ A MUDANÇA PRINCIPAL
     *
     * Antes:
     *   fs.writeFile(caminhoCompleto, arquivo.buffer)
     *
     * Agora:
     *   movemos o arquivo já salvo pelo multer
     *
     * Isso evita:
     * - carregar o arquivo na RAM
     * - travar o servidor com arquivos grandes
     */
    await fs.rename(arquivo.path, caminhoCompleto);

    // 🔹 Caminho relativo (pra salvar no banco)
    const caminhoRelativo = path
        .posix
        .join(safeSubPath, uniqueName)
        .replace(/^\/+/, "");

    const metadata = {
        owner_id: dono_id,
        name: arquivo.originalname,
        path: caminhoRelativo,
        type: arquivo.mimetype,
        size: arquivo.size,
        uuid: uniqueName
    };

    // 💾 Salva metadata no banco
    const resultado = await repo_upload.upload_arquivo(metadata);

    return resultado;
}

module.exports = {
    upload_arquivo_service
};