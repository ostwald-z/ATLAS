const AppError = require("../../../error/AppError")

const repo = require("./repo-salvar-vault")

const fs = require("fs/promises")
const path = require("path")

async function salvar_vault_service(vaultName, id, arquivo) {
    
    console.log("SALVAR VAULT: ", vaultName)

    const [vaultUser] = await repo.buscarVault(vaultName, id)

    if(!vaultUser){
        console.log("Não econtrei nenhum vault com esse nome: ", vaultUser)
        throw new AppError("Não encontrando nenhum vault com esse nome", 404)
    }

    const nome_vault_user = vaultUser.nome_vault
    const pastas_vaults = process.env.CAMINHO_VAULTS


    const caminho_completo = path.join(pastas_vaults, nome_vault_user)
    const caminho_completo_normalizado = path.resolve(caminho_completo)

    // garante que o caminho final está dentro da pasta de vaults
    if (!caminho_completo_normalizado.startsWith(path.resolve(pastas_vaults))) {
        throw new AppError("Acesso não permitido", 403);
    }

    // Verifica se o arquivo original existe usando a API de Promises
    try {
        await fs.access(caminho_completo_normalizado);
    } catch {
        console.log("não encontrei no disco o arquivo: ", caminho_completo_normalizado)
        throw new AppError("Arquivo do Vault não encontrado no servidor", 404);
    }


    // Continuação segura: Escrita atômica e substituição do arquivo antigo
    try {
        // writeFile substitui todo o conteúdo do arquivo existente pelo novo Buffer
        await fs.writeFile(caminho_completo_normalizado, arquivo);
    } catch (error) {
        console.error("Erro crítico ao gravar arquivo no disco:", error);
        throw new AppError("Erro interno ao salvar as alterações do vault", 500);
    }

}


module.exports = {salvar_vault_service}