
const service = require("./service-criar-vault")


async function controller_criar_vault(req,res,next) {
    try{

        const id_user = req.user.id
        const {VaultName} = req.params

		const vaultBuffer = req.body

        //service
		await service.service_criar_vault(id_user,  VaultName, vaultBuffer)
        
		res.status(200).json({
			message: "Sucesso"
		})


    }catch(erro){
        next(erro)
    }
}


module.exports = {controller_criar_vault}