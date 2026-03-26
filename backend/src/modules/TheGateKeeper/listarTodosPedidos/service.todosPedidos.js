const AppError = require("../../../error/AppError")
const repo = require("./repo.todosPedidos")

async function listarTodosPedidos() {
    const resultado = await repo.listarTodosPedidos()
    if(resultado.length === 0){
        throw new AppError("Nenhum pedido pendente a ser Listado", 404)
    }
    return resultado;
}


module.exports = {listarTodosPedidos}