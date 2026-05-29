const AppError = require("../../../error/AppError")

const repo = require("./repo-deletar")

const fs = require("fs/promises")
const path = require("path")


async function service_deletar(vaultName, id) {
    
    const pasta_vaults = process.env.CAMINHO_VAULTS
    const pasta_base_user = path.join(pasta_vaults, String(id))

    const caminho_completo = path.join(pasta_base_user, vaultName)

    const caminho_normalizado = path.resolve(caminho_completo)

    // garante que o caminho final está dentro da pasta de vaults
    if (!caminho_normalizado.startsWith(path.resolve(pasta_base_user))) {
        throw new AppError("Acesso não permitido", 403);
    }

    // verifica se o arquivo existe no disco
    try {
        await fs.access(caminho_normalizado)
    } catch {
        throw new AppError("Arquivo do vault não encontrado no servidor", 404)
    }

    // remove o arquivo
    await fs.unlink(caminho_normalizado)

    return "ok"

}

module.exports = {service_deletar}