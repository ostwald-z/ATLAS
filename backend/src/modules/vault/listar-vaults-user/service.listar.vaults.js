const AppError = require("../../../error/AppError")

const repo = require("./repo.listar.vaults")




async function service_listar_vault(id) {
    
    // pega no banco os vaults que estão no ID do user que recebeu.
    // SEM COLCHETES pois usamos .map futuramente
    const lista_vaults = await repo.buscar_vault(id)


    if(!lista_vaults || lista_vaults.length === 0){
        throw new AppError("Nenhum Vault encontrado", 404)
    }


    // Cria a array de strings extraindo apenas o campo 'nome_vault'
    const nomes_dos_vaults = lista_vaults.map(vault => vault.nome_vault);

    // Retorna a array de strings para o controller
    return nomes_dos_vaults;

}

module.exports = {service_listar_vault}
