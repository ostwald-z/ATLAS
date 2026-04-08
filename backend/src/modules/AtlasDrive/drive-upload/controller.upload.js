//chama o service
const service = require("./service.upload")


async function drive_upload(req, res , next) {
    try{    

        const arquivos = req.files

        const {caminho_escolhido} = req.body

        const dono_user_id = req.user.id


        for (const arquivo of arquivos) {
            await service.upload_arquivo_service(arquivo, dono_user_id, caminho_escolhido);
        }


        res.status(200).json({
            message: "Upload do arquivo foi um sucesso."
        })




    }catch (erro){
        next(erro)
    }
}



module.exports = {
    drive_upload
}