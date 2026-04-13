const service = require("./service.login")
const repo = require("./repo.login")

async function loginUser(req,res,next) {
    try{

        const {user, senha} = req.body
        const token = await service.loginUser(user,senha)
        const [usuario] = await repo.buscarUser(user)

        res.cookie("token", token, {
            httpOnly: true,
            secure: false,    // true se for HTTPS // false se for http
            sameSite: "lax",  //  none se estiver online e for o mesmo dominio // lax se for localhost gg
            maxAge: 3600000
        })


        res.status(200).json({
            message: "Login com sucesso!",
            role: usuario.role
        })

    }catch(erro){
        next(erro)
    }
}


module.exports = {
    loginUser,
}