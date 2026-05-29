const service_renomear_arquivo = require("./service-renomear")


async function renomear_arquivo_controller(req,res,next) {
    try{

        const id_user = req.user.id

        const {novo_nome_arquivo, caminho_arquivo, pasta_ou_arquivo, mover} = req.body

        console.log("controller chegou aqui")
        console.log("BODY: ", novo_nome_arquivo, caminho_arquivo, pasta_ou_arquivo, mover)

        await service_renomear_arquivo.renomear_arquivo(caminho_arquivo, id_user, novo_nome_arquivo, pasta_ou_arquivo, mover)

        res.status(200).json({
            message: "Arquivo renomeado com sucesso."
        })


    }catch(erro){
        console.log("CONTROLLER erro mover/renomear arquivo: ", erro)
        next(erro)
    }
}


module.exports = {renomear_arquivo_controller}