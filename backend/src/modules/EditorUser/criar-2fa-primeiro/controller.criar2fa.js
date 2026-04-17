const service_2fa = require("./service.criar2fa")


async function controller_criar2FA(req, res, next) {
    try{

        const id_user = req.user.id
        
        const qrcode = await service_2fa.criar_2fa_service(id_user)

        res.status(200).json({
            qrCode: qrcode
        })


    }catch(erro){
        next(erro)
    }
}


module.exports = {controller_criar2FA}