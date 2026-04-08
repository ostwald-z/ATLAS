const AppError = require("../../../error/AppError");

const fs = require("fs/promises");
const path = require("path");
const crypto = require("crypto");

const repo_upload = require("./repo.upload");

async function upload_arquivo_service(arquivo, dono_id, caminho_escolhido = "") {

    if (!arquivo) {
        throw new AppError("Arquivo não enviado", 400);
    }

    const basePath = path.join(process.env.ATLAS_CLOUD_PATH, String(dono_id));

    // normaliza o caminho (remove coisas perigosas)
    const safeSubPath = path
    .normalize(caminho_escolhido || "")
    .replace(/^\/+/, "")   // remove barra do início
    .replace(/\\/g, "/");  // garante padrão

  
  
  const pastaUsuario = path.join(basePath, safeSubPath);

    // proteção contra sair da pasta do usuário
    if (!pastaUsuario.startsWith(basePath)) {
        throw new AppError("Caminho inválido", 403);
    }

    // cria pasta se não existir
    await fs.mkdir(pastaUsuario, { recursive: true });

    // gera nome único
    const extension = path.extname(arquivo.originalname);
    const uniqueName = crypto.randomUUID() + extension;

    const caminhoCompleto = path.join(pastaUsuario, uniqueName);

    // salva arquivo
    await fs.writeFile(caminhoCompleto, arquivo.buffer);

    // salva caminho RELATIVO (melhor)
    const caminhoRelativo = path.posix.join(safeSubPath,uniqueName).replace(/^\/+/, ""); // GARANTIA FINAL
    const metadata = {
        owner_id: dono_id,
        name: arquivo.originalname,
        path: caminhoRelativo, // melhor
        type: arquivo.mimetype,
        size: arquivo.size,
        uuid: uniqueName
    };

    const resultado = await repo_upload.upload_arquivo(metadata);

    return resultado;
}

module.exports = {
    upload_arquivo_service
};