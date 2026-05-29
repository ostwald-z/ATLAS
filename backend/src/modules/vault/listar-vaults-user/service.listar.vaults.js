const AppError = require("../../../error/AppError")

const repo = require("./repo.listar.vaults")

const fs = require("fs")
const path = require("path")


async function service_listar_vault(id) {

    const pasta_atlas_vault = process.env.CAMINHO_VAULTS
    const pasta_base_usuario_vault = path.join(pasta_atlas_vault, String(id))

    // Se a pasta do usuário não existe, cria automaticamente
    if (!fs.existsSync(pasta_base_usuario_vault)) {
        fs.mkdirSync(pasta_base_usuario_vault, { recursive: true })
    }

    // Lê o conteúdo e filtra apenas arquivos (cada vault é um arquivo)
    const itens = await fs.promises.readdir(pasta_base_usuario_vault, { withFileTypes: true })
    const nomes_dos_vaults = itens
        .filter(item => item.isFile())
        .map(item => item.name)

    if (nomes_dos_vaults.length === 0) {
        throw new AppError("Nenhum Vault encontrado", 404)
    }

    return nomes_dos_vaults
}

module.exports = {service_listar_vault}
