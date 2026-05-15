const service = require("./service-deletar")


async function controller_deletar(req,res,next) {
    try{

        const {VaultName} = req.params

        const id = req.user.id

        //service
        await service.service_deletar(VaultName, id)

        res.status(200).json({
            message: "Vault deletado"
        })


    }catch(erro){
        next(erro)
    }
}


module.exports = {controller_deletar}