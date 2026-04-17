const service2fa = require("./service2fa-verify")

const repo2fa = require("./repo-2fa-verify")


async function controller_2fa_verify(req, res,  next) {
    try{

        const {totpcode} = req.body

        const id_user = req.user.id

        const token = await service2fa.service2fa_verify(totpcode, id_user)

        const [usuario] = await repo2fa.buscarUser(id_user)

        res.cookie("token", token, {
            httpOnly: true,
            secure: true,    // true se for HTTPS // false se for http
            sameSite: "Lax",  //  none se estiver online e for o mesmo dominio // lax se for localhost gg
            maxAge: 3600000
        })

        res.status(200).json({
            message: "Login realizado com sucesso!",
            role: usuario.role
        })



    }catch(erro){
        next(erro)
    }
}

module.exports = {controller_2fa_verify}