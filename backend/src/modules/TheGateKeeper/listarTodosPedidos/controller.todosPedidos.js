const service = require("./service.todosPedidos")

async function listarTodosPedidos(req,res,next) {
    try{

        const resultado = await service.listarTodosPedidos()

        res.status(200).json({
            resultado
        })

    }catch(erro){
        next(erro)
    }
}

module.exports = {listarTodosPedidos}