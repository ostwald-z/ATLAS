const AppError = require("../../../error/AppError")
const repo = require("./repo.deletarUser")


const logDeletarUser = require("./deletarLOGGER")

async function deletarUser(id, httpInfo, id_autor) {
    
    const idLimpo = Number(id)

    if(isNaN(idLimpo)){
        logDeletarUser.deletarLogger("falha", "ID inválido", httpInfo, id, id_autor)
        throw new AppError("ID Inválido")
    }

    if(!Number.isInteger(idLimpo) || id <= 0){
        logDeletarUser.deletarLogger("falha", "ID inválido", httpInfo, id, id_autor)
        throw new AppError("ID inválido")
    }

    const resultado = await repo.deletarUser(idLimpo)
    
    if(resultado.affectedRows === 0){
        logDeletarUser.deletarLogger("falha", "ID não encontrado", httpInfo, id, id_autor)
        throw new AppError("ID colocado não foi encontrado")
    }

    
    logDeletarUser.deletarLogger("sucesso", "Deletou usuário corretamente.", httpInfo, id, id_autor)


    return resultado;
}


module.exports = {deletarUser}