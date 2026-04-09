//chama o service
const service = require("./service.upload")


async function drive_upload_vault(req, res , next) {
    try{    

        const arquivos = req.files

        const {caminho_escolhido} = req.body


        for (const arquivo of arquivos) {
            await service.upload_arquivo_service_vault(arquivo, caminho_escolhido);
        }


        res.status(200).json({
            message: "Upload do arquivo foi um sucesso."
        })




    }catch (erro){
        next(erro)
    }
}



module.exports = {
    drive_upload_vault
}