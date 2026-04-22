// ESSE É O CONTROLLER LOGIN-INIT, INICIAL, ele só gera o token necessário para VALIDAR O CODIGO2FA em outra rota
// no 2fa que gera o token válido no sistema GERAL.

const service = require("./service.login")
const repo = require("./repo.login")

async function loginUser(req,res,next) {
    try{

        const {user, senha} = req.body

        const httpInfo = req.httpInfo

        const {token, totpStatus} = await service.loginUser(user, senha, httpInfo)

        
        const [usuario] = await repo.buscarUser(user)

        res.cookie("token", token, {
            httpOnly: true,
            secure: true,    // true se for HTTPS // false se for http
            sameSite: "Lax",  //  Lax sempre, porque tanto em produção quanto testes o dominio é o mesmo.
            maxAge: 3600000
        })

        res.status(200).json({
            message: "Credenciais corretas.",
            totpStatus: totpStatus,
            role: usuario.role
        })


    }catch(erro){
        next(erro)
    }
}


module.exports = {
    loginUser,
}