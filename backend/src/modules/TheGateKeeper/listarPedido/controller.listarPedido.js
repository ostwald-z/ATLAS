const service = require("./service.listarPedido")

async function listarPedido(req,res,next) {
    try{

        const id = req.params.id

        const resultado = await service.listarPedido(id)

        res.status(200).json({
            resultado
        })

    }catch(erro){
        next(erro)
    }
}

module.exports = {listarPedido}