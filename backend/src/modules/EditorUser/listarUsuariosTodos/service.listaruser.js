const AppError = require("../../../error/AppError")
const repo = require("./repo.listaruser")


async function listarTodosUsers() {
    

    const resultado = await repo.listarTodosUsers()

    if(resultado.length === 0){
        throw new AppError("Nenhum usuário a ser Listado")
    }

    return resultado;
}


module.exports = {listarTodosUsers}