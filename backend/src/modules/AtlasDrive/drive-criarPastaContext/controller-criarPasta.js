const service = require("./service-criarPasta")


async function controller_criar_pasta_context(req,res,next) {
    try{

        const id_user = req.user.id

        const {caminho_da_pasta} = req.body

        const resultado = await service.service_criar_pasta_context(id_user, caminho_da_pasta)


        res.status(200).json({
            message: "pasta criada."
        })



    }catch(erro){
        next(erro)
    }
}


module.exports = {controller_criar_pasta_context}