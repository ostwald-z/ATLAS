const AppError = require("../../../error/AppError");
const path = require("path");
const fs = require("fs/promises");

const repo_listar_sub = require("./repo_listar_subpastas")


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

            let nome_original = null;

            // só busca no repo se for arquivo
            if (!stats.isDirectory()) {
                try {
                    const resposta = await repo_listar_sub.pegar_original_nome_por_uuid(nome);

                    // cobre TODOS os cenários possíveis
                    if (Array.isArray(resposta) && resposta.length > 0) {
                        nome_original = resposta[0].nome_original;
                    } else if (resposta && resposta.nome_original) {
                        nome_original = resposta.nome_original;
                    }
                } catch (err) {
                    console.log("Erro ao buscar nome original:", err);
                }
            }

            return {
                nome,
                nome_original,
                path: path.join(subpath, nome), // importante pro frontend navegar
                tipo: stats.isDirectory() ? "pasta" : "arquivo",
                tamanho: stats.size,
                criado_em: stats.birthtime,
                atualizado_em: stats.mtime,
            };
        })
    );

    return resultado;
}

module.exports = listar_subpasta_service;