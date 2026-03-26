const service = require("./service.recusar")

async function deletarForm(req,res,next) {
    try{

        const id = req.params.id

        const resultado = await service.deletarForm(id)

        res.status(200).json({
            message: "Pedido removido com sucesso! ID: " + id
        })

    }catch(erro){
        next(erro)
    }
}

module.exports = {deletarForm}