const AppError = require("../../../error/AppError");
const path = require("path");
const fs = require("fs/promises");



async function listar_subpasta_service(id_user, subpath = "") {
    
    const pasta_atlas_cloud = process.env.ATLAS_CLOUD_PATH;

    if (!pasta_atlas_cloud) {
        throw new AppError("Caminho do cloud não definido", 500);
    }

    // caminho base do usuário
    const pasta_user = path.join(pasta_atlas_cloud, String(id_user));

    // normaliza o caminho vindo do frontend
    const caminho_final = path.join(pasta_user, subpath);

    // SEGURANÇA: impede sair da pasta do usuário
    if (!caminho_final.startsWith(pasta_user)) {
        throw new AppError("Acesso inválido", 403);
    }


    // verifica se existe
    try {
        await fs.access(caminho_final);
    } catch {
        await fs.mkdir(caminho_final, { recursive: true });;
    }


    let arquivos;
    try {
        arquivos = await fs.readdir(caminho_final);
    } catch {
        throw new AppError("Erro ao listar arquivos", 500);
    }


    const resultado = await Promise.all(
        arquivos.map(async (nome) => {
            const caminho_completo = path.join(caminho_final, nome);
            const stats = await fs.stat(caminho_completo);
            const isDir = stats.isDirectory();

            return {
                nome,                                        // nome no disco = nome original
                nome_original: nome,                         // mantém o campo que o frontend já usa
                path: path.join(subpath, nome),
                tipo: isDir ? "pasta" : "arquivo",
                tamanho: isDir ? null : stats.size,
                criado_em: stats.birthtime,
                atualizado_em: stats.mtime,
            };
        })
    );

    return resultado;
}

module.exports = listar_subpasta_service;