const AppError = require("../../../error/AppError")

const fs = require("fs/promises")
const path = require("path")

const repo = require("./repo-criar-vault")


async function service_criar_vault(id, vaultName, vaultBuffer) {
    
    // validação do nome vaultName 
    if(typeof vaultName !== "string" || vaultName.trim().length === 0){
        throw new AppError("Nome do Vault inválido")
    }

    if(!vaultBuffer){
        throw new AppError("Nenhum arquivo válido.")
    }

    // remove espaços extras
    vaultName = vaultName.trim()


    // impede path traversal
    if (
        vaultName.includes("..") ||
        vaultName.includes("/") ||
        vaultName.includes("\\")
    ) {
        throw new AppError("Nome do Vault inválido")
    }


    // cria no disco, depois no banco    
    const pasta_vaults = process.env.CAMINHO_VAULTS

    const caminho_completo = path.join(pasta_vaults, vaultName)
    const caminho_completo_normalizado = path.resolve(caminho_completo)

    // garante que o caminho final está dentro da pasta de vaults
    if (!caminho_completo_normalizado.startsWith(path.resolve(pasta_vaults))) {
        throw new AppError("Acesso não permitido", 403);
    }

    try {
        // garante que a pasta existe
        await fs.mkdir(pasta_vaults, { recursive: true })

        // verifica se já existe
        try {
            await fs.access(caminho_completo_normalizado)

            throw new AppError("Já existe um Vault com esse nome")
        } catch (err) {
            // ENOENT = arquivo não existe -> pode continuar
            if (err.code !== "ENOENT") {
                throw err
            }
        }

        // escreve o arquivo no disco
        await fs.writeFile(caminho_completo_normalizado, vaultBuffer)

        
        // salvar no banco
        await repo.criar_vault_banco(vaultName, id)


        return {
            sucesso: true,
            vault: vaultName,
            caminho: caminho_completo_normalizado
        }

        
    } catch (err) {
        if (err instanceof AppError) {
            throw err
        }
        console.error(err)
        throw new AppError("Erro ao criar Vault", 500)
    }

}



module.exports = {service_criar_vault}