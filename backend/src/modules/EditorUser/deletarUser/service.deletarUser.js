const AppError = require("../../../error/AppError")
const repo = require("./repo.deletarUser")


async function deletarUser(id) {
    
    const idLimpo = Number(id)

    if(isNaN(idLimpo)){
        throw new AppError("ID Inválido, não é um número")
    }

    if(!Number.isInteger(idLimpo) || id <= 0){
        throw new AppError("ID inválido, sei la po")
    }

    const resultado = await repo.deletarUser(idLimpo)
    
    if(resultado.affectedRows === 0){
        throw new AppError("ID colocado não foi encontrado")
    }

    return resultado;
}


module.exports = {deletarUser}