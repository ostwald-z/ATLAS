const path = require("path");
const fs = require("fs/promises");
const AppError = require("../../../../error/AppError");


async function listar_pasta_vault_service(scope, subpath = "") {

    if(scope !== "vault_drive_atlas"){
        throw new AppError("Sem permissão de scopo", 403)
    }


    // 1. Define a Raiz do Cofre (Absolute Path)
    const baseVault = path.resolve(process.env.ATLAS_CLOUD_PATH, "_vault020");


    // 2. Limpa e resolve o caminho solicitado
    const cleanSubpath = subpath.replace(/^(\/|\\)+/, ""); 
    const finalPath = path.resolve(baseVault, cleanSubpath);


    // SEGURANÇA: Trava o usuário dentro da pasta base
    if (!finalPath.startsWith(baseVault)) {
        throw new AppError("Acesso negado: Fora do escopo permitido.", 403);
    }


    try {
        // 3. Lê o conteúdo do diretório
        const entradas = await fs.readdir(finalPath, { withFileTypes: true });

        // 4. Mapeia os itens buscando detalhes extras (stats)
        const listaPromises = entradas.map(async (item) => {
            const itemPath = path.join(finalPath, item.name);
            const stats = await fs.stat(itemPath);

            const isDirectory = item.isDirectory();

            return {
                nome: item.name,
                tipo: isDirectory ? "pasta" : "arquivo",
                extensao: isDirectory ? null : path.extname(item.name).toLowerCase(),
                tamanho_bytes: stats.size, // Tamanho bruto

                tamanho_formatado: formatBytes(stats.size), // Ex: "1.5 MB"

                criado_em: stats.birthtime,
                modificado_em: stats.mtime
            };
        });

        // Aguarda todas as leituras de disco terminarem
        const resultado = await Promise.all(listaPromises);


        return resultado;


    } catch (error) {
        if (error.code === 'ENOENT') {
            console.log("Erro, caminho interno nao existe")
            throw new AppError("O caminho especificado não existe no disco.", 404);
        }

        console.log("Erro kkkkkk ao listar a porra do vault: ", error.message)
        throw new AppError("Erro interno ao ler disco: " + error.message, 500);
    }
}



/**
 * Função auxiliar para deixar o tamanho legível
 */


function formatBytes(bytes, decimals = 2) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}



module.exports = listar_pasta_vault_service;
