const AppError = require("../../../error/AppError")
const repo = require("./repo.listarPedido")

async function listarPedido(id) {
    
    const idLimpo = Number(id)

    if(isNaN(idLimpo)){
        throw AppError("ID inválido")
    }

    if(!Number.isInteger(idLimpo) || idLimpo <= 0){
        throw new AppError("ID inválido")
    }

    const resultado = await repo.listarPedido(idLimpo)
    if(resultado.length === 0){
        throw new AppError("Nenhum pedido encontrado com ID fornecido", 404)
    }

    return resultado;

}

module.exports = {listarPedido}