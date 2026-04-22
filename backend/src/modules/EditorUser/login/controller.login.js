// ESSE É O CONTROLLER LOGIN-INIT, INICIAL, ele só gera o token necessário para VALIDAR O CODIGO2FA em outra rota
// no 2fa que gera o token válido no sistema GERAL.

const service = require("./service.login")
const repo = require("./repo.login")


const isProd = process.env.NODE_ENV === 'prod';


async function loginUser(req,res,next) {
    try{

        const {user, senha} = req.body

        const httpInfo = req.httpInfo

        const {token, totpStatus} = await service.loginUser(user, senha, httpInfo)

        
        const [usuario] = await repo.buscarUser(user)

        res.cookie("token", token, {
            httpOnly: true,
            // Fica true apenas em produção (HTTPS)
            secure: isProd, 
            // 'lax' para o mesmo domínio, ou 'none' se precisar de cross-site no futuro
            sameSite: 'lax', 
            maxAge: 3600000 // 1 hora
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