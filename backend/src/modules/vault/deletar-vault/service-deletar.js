const AppError = require("../../../error/AppError")

const repo = require("./repo-deletar")

const fs = require("fs/promises")
const path = require("path")


async function service_deletar(vaultName, id) {
    
    const [vaultUser] = await repo.buscarVault(vaultName, id)

    if(!vaultUser){
        throw new AppError("Vault não encontrado no servidor", 404)
    }

    const pasta_vaults = process.env.CAMINHO_VAULTS
    const nome_vault_user = vaultUser.nome_vault

    const caminho_completo = path.join(pasta_vaults, nome_vault_user)
    const caminho_normalizado = path.resolve(caminho_completo)

    // verifica se ESTÁ dentro da pasta vaults o caminho final ( contra path transversal)
        const pasta_vaults_normalizada = path.resolve(pasta_vaults)

    const caminhoSeguro = caminho_normalizado.startsWith(
        pasta_vaults_normalizada + path.sep
    )

    if (!caminhoSeguro) {
        throw new AppError("Caminho inválido", 400)
    }

    // verifica se o arquivo existe no disco
    try {
        await fs.access(caminho_normalizado)
    } catch {
        throw new AppError("Arquivo do vault não encontrado no disco", 404)
    }

    // remove o arquivo
    await fs.unlink(caminho_normalizado)

    const vault = vaultUser.nome_vault

    //remover do banco também
    await repo.deletar_vault_banco(vault, id)

    return "ok"

}

module.exports = {service_deletar}