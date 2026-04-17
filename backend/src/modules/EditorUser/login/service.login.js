const AppError = require("../../../error/AppError")
const repo = require("./repo.login")
const bcrypt = require("bcrypt")
const jwt = require("jsonwebtoken")

const totp2fa = require("../2FA-logica/2falogica")




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


    // verifica se ele tem 2FA ativado

    // se ele não tiver configurado ainda, VALIDA O COOKIE E ENTREGA TOKEN
    // mas com uma mensagem que ele nao tem TOPT, frontend recebe e abre uma pagina pedindo para adicionar 2FA 
    // nesse  frontend faz requisição para GERAR 2fa

    if(usuario.totp !== "1"){
        const totpStatus = "falsetotp"

        const token = jwt.sign(
            {id:usuario.id, role:usuario.role},
            process.env.JWT_SECRET,
            {expiresIn: process.env.JWT_EXPIRES})


        return {token, totpStatus}

    }


    // gera token válido para fazer requisição com 2FA
    const totpStatus = "truetotp"

    const token = jwt.sign(
        {id:usuario.id, role:usuario.role},
        process.env.JWT_SECRET_LOGIN_INIT,
        {expiresIn: process.env.JWT_EXPIRES})


    return {token, totpStatus}


}


module.exports = {
    loginUser,
}