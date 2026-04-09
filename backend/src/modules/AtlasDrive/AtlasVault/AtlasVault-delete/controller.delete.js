const service_deletar_arquivo_drive = require("./service.delete")


async function controller_deletar_arquivo_vault(req,res,next) {
    try{

        const {caminho_arquivo, pasta_ou_arquivo} = req.body

        await service_deletar_arquivo_drive.deletar_vault_serice(caminho_arquivo, pasta_ou_arquivo)

        res.status(200).json({
            message: "Arquivo deletado com sucesso."
        })


    }catch(erro){
        next(erro)
    }
}


module.exports = {controller_deletar_arquivo_vault}