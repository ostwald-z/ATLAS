const AppError = require("../../../error/AppError")

const fs = require("fs")
const path = require("path")


async function service_pegar_vault(vaultName, id_user) {
    

    const pasta_dos_vaults = process.env.CAMINHO_VAULTS
    const pasta_base_user = path.join(pasta_dos_vaults, String(id_user))


    //monta o caminho
    const caminho_vault_completo = path.join(pasta_base_user, vaultName);

    // normaliza o caminho para evitar path traversal
    const caminho_vault_normalizado = path.resolve(caminho_vault_completo);


    // garante que o caminho final está dentro da pasta de vaults
    if (!caminho_vault_normalizado.startsWith(path.resolve(pasta_base_user))) {
        throw new AppError("Acesso não permitido", 403);
    }

    // verifica se o caminho montado existe no disco
    if (!fs.existsSync(caminho_vault_normalizado)) {
        throw new AppError("Nenhum vault com esse nome encontrado", 404);
    }


    return caminho_vault_normalizado
}


module.exports = {service_pegar_vault}