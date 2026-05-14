const AppError = require("../../../error/AppError")

const fs = require("fs")
const path = require("path")

const sql_pegar_vault = require("./repo.pegarVault")

async function service_pegar_vault(vaultName, id_user) {
    
    const pasta_dos_vaults = process.env.CAMINHO_VAULTS

    const [vault_do_user] = await sql_pegar_vault.pegarVault(vaultName, id_user)

    if(!vault_do_user){
        throw new AppError("Nenhum vault com esse nome encontrado", 404)
    }

    const nome_vault_user = vault_do_user.nome_vault

    //monta o caminho
    const caminho_vault_completo = path.join(pasta_dos_vaults, nome_vault_user);

    // normaliza o caminho para evitar path traversal
    const caminho_vault_normalizado = path.resolve(caminho_vault_completo);

    // garante que o caminho final está dentro da pasta de vaults
    if (!caminho_vault_normalizado.startsWith(path.resolve(pasta_dos_vaults))) {
        throw new AppError("Acesso não permitido", 403);
    }

    // verifica se o caminho montado existe no disco
    if (!fs.existsSync(caminho_vault_normalizado)) {
        throw new AppError("Arquivo do Vault não encontrado no servidor", 404);
    }



    return caminho_vault_normalizado
}


module.exports = {service_pegar_vault}