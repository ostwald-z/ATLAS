//chama o service
const service = require("./service.upload")


async function drive_upload_vault(req, res , next) {
    try{    

        const arquivo = req.files && req.files.length > 0 ? req.files[0] : null;

        //const {caminho_escolhido} = req.body

        const resultado = await service.upload_arquivo_service_vault(
            arquivo, 
            req.body.caminho_escolhido
        );


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