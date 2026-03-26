const AppError = require("../../../error/AppError")
const repo = require("./repo.listarUser")


async function listarUser(id) {
    
    const idLimpo = Number(id)

    if(isNaN(idLimpo)){
        throw new AppError("ID inválido")
    }

    if(!Number.isInteger(idLimpo) || idLimpo <= 0){
        throw new AppError("ID inválido")
    }

    const resultado = await repo.listarUser(idLimpo)
    if(resultado.length === 0){
        throw new AppError("ID não encontrado para listar.")
    }

    return resultado;
}


module.exports = {
    listarUser
}