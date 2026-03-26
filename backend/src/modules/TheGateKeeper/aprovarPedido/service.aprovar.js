const AppError = require("../../../error/AppError")
const repo = require("./repo.aprovar")

async function aprovarForm(id) {
    
    const idLimpo = Number(id)

    if(isNaN(idLimpo)){
        throw new AppError("ID Inválido")
    }

    if(!Number.isInteger(idLimpo) || idLimpo <= 0){
        throw new AppError("ID Inválido")
    }

    const [resultado] = await repo.buscarPedido(idLimpo)
    if(!resultado){
        throw new AppError("ID não encontrado para aprovar")
    }


    const user = resultado.user
    const email = resultado.email
    const senha_hash = resultado.senha_hash
    const obs = resultado.obs
    const role = resultado.role

    const [verificaUser] = await repo.buscarUser(user)
    if(verificaUser){
        throw new AppError("Usuario já existente no banco original", 409)
    }

    const [verificarEmail] = await repo.buscarEmail(email)
    if(verificarEmail){
        throw new AppError("Email já existente no banco original", 409)
    }


    const criarUser = await repo.aprovarForm(user,senha_hash,email,obs,role)

    //deletar este form que já foi APROVADO, liberar espaço do banco de dados de usuarios pendentes
    const deletarForm = await repo.deletarForm(idLimpo)
    
    return criarUser;

}


module.exports = {aprovarForm}