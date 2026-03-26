const AppError = require("../../error/AppError")
const repo = require("./repo.impersonate")
const bcrypt = require("bcrypt")
const jwt = require("jsonwebtoken")


async function impersonate(id, chave) {
 
    const idLimpo = Number(id)

    if(isNaN(idLimpo)){
        throw new AppError("ID inválido")
    }

    if(!Number.isInteger(idLimpo) || idLimpo <= 0){
        throw new AppError("ID inválido")
    }

    const verificarChave = await bcrypt.compare(chave, process.env.CHAVE_IMPERSONATE)
    if(!verificarChave){
        throw new AppError("Chave Impersonate INVÁLIDA")
    }

    const [usuarioID] = await repo.buscarID(idLimpo)
    if(usuarioID){

        const token = jwt.sign({
            id: usuarioID.id, role: usuarioID.role
        }, process.env.JWT_SECRET, {expiresIn: process.env.JWT_EXPIRES})
        
        return token;
    }


    throw new AppError("Nenhum Usuário/ID foi encontrado para Login", 404)
}

module.exports = {impersonate}