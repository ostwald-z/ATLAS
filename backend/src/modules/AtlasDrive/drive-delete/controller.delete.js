const service_deletar_arquivo_drive = require("./service.delete")


async function controller_deletar_arquivo_drive(req,res,next) {
    try{

        const id_user = req.user.id

        const {caminho_arquivo, pasta_ou_arquivo} = req.body

        await service_deletar_arquivo_drive.deletar_drive_serice(caminho_arquivo, id_user, pasta_ou_arquivo)

        res.status(200).json({
            message: "Arquivo deletado com sucesso."
        })


    }catch(erro){
        next(erro)
    }
}


module.exports = {controller_deletar_arquivo_drive}