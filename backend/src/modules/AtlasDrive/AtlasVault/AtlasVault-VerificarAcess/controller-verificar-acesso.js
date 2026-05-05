const service = require("./service-verificar-acesso")



async function controller_verificar_acesso_inicial(req,res,next) {
    try{

        const role_user = req.user.role

        const {codigo} = req.body


        // RETONAR UM BEARER TOKEN AQUI 
        // para poder fazer requisição no painel de acesso ao vault secreto.


        await service.service_verificar_acesso_vault(role_user, codigo)

        res.status(200).json({
            message: "tudo certo."
        })

    }catch(erro){
        next(erro)
    }
}


module.exports = {controller_verificar_acesso_inicial}