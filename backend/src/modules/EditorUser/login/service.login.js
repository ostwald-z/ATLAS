const AppError = require("../../../error/AppError")
const repo = require("./repo.login")
const bcrypt = require("bcrypt")
const jwt = require("jsonwebtoken")


async function loginUser(user,senha) {
    
    if(typeof user !== "string" || user.trim().length === 0){
        throw new AppError("User ou Senha Inválidos")
    }

    if(typeof senha !== "string" || senha.trim().length === 0){
        throw new AppError("User ou Senha Inválidos")
    }

    // busca usuario

    const [usuario] = await repo.buscarUser(user)
    if(!usuario){
        throw new AppError("Usuario ou Senha inválidos")
    }

    //valida senha
    const validacao = await bcrypt.compare(senha, usuario.senha_hash)
    if(!validacao){
        throw new AppError("Usuario ou Senha inválidos")
    }

    const token = jwt.sign(
        {id:usuario.id, role:usuario.role},
        process.env.JWT_SECRET,
        {expiresIn: process.env.JWT_EXPIRES})


    return token;
}


module.exports = {
    loginUser,
}