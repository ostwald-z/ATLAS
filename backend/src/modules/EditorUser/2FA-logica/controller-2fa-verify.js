const service2fa = require("./service2fa-verify")

const repo2fa = require("./repo-2fa-verify")

const isProd = process.env.NODE_ENV === 'prod';

async function controller_2fa_verify(req, res,  next) {
    try{

        const {totpcode} = req.body

        const id_user = req.user.id

        const {RefreshToken, AcessToken} = await service2fa.service2fa_verify(totpcode, id_user)

        const [usuario] = await repo2fa.buscarUser(id_user)


        // COOKIE definitivo aceito pelo sistema
        res.cookie("RefreshToken", RefreshToken, {
            httpOnly: true,
            // Fica true apenas em produção (HTTPS)
            secure: isProd, 
            // 'lax' para o mesmo domínio, ou 'none' se precisar de cross-site no futuro
            sameSite: 'lax',
            maxAge: 3600000 // 1 hora
        })

        res.status(200).json({
            message: "Login realizado com sucesso!",
            role: usuario.role,
            AcessToken: AcessToken
        })



    }catch(erro){
        next(erro)
    }
}

module.exports = {controller_2fa_verify}