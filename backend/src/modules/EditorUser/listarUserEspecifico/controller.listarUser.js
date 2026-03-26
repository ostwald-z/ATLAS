const service = require("./service.listarUser")


async function listarUser(req,res,next) {
    try{

        const id = req.params.id

        const resultado = await service.listarUser(id)

        res.status(200).json({
            resultado
        })


    }catch(erro){
        next(erro)
    }
}

module.exports = {listarUser}