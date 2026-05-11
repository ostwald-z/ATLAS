
const service = require("./service.refresh")

const isProd = process.env.NODE_ENV === 'prod';

async function controller_refresh(req,res, next) {
    try{

        const id_user = req.user.id

        const refresh_token = req.rft

        console.log("controller refresh: ", refresh_token)

        const {AcessToken, RefreshToken} = await service.service_refresh(id_user, refresh_token)

        res.cookie("RefreshToken", RefreshToken, {
            httpOnly: true,
            // Fica true apenas em produção (HTTPS)
            secure: isProd,
            // 'lax' para o mesmo domínio, ou 'none' se precisar de cross-site no futuro
            sameSite: 'lax', 
            maxAge: 3600000 // 1 hora
        })

        res.cookie("AcessToken", AcessToken, {
            httpOnly: true,
            // Fica true apenas em produção (HTTPS)
            secure: isProd,
            // 'lax' para o mesmo domínio, ou 'none' se precisar de cross-site no futuro
            sameSite: 'lax', 
            maxAge: 900000  // 15 minutos
        })


        res.status(200).json({
            message: "ok"
        })


    }catch(erro){
        next(erro)
    }
}

module.exports = {controller_refresh}