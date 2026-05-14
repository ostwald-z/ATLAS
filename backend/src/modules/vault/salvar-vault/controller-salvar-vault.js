
const service = require("./service_salvar_vault")

const AppError = require("../../../error/AppError")

async function controller_salvar_vault(req,res,next) {
    try{

        const {VaultName} = req.params;

        const id = req.user.id

        const arquivoBuffer = req.body; 

        console.log("Vaulte name", VaultName)
        console.log("body: ", arquivoBuffer)

        if (!arquivoBuffer || arquivoBuffer.length === 0) {
            throw new AppError("Nenhum conteúdo de arquivo foi enviado", 400);
        }

        //service
        await service.salvar_vault_service(VaultName, id, arquivoBuffer)

        return res.status(200).json({
            message: "Arquivo sobrescrito e salvo."
        })


    }catch(erro){
        next(erro)
    }
}


module.exports = {controller_salvar_vault}