const service = require("./service.listaruser")

async function listarTodosUsers(req,res,next) {
    try{

        const resultado = await service.listarTodosUsers()

        

        res.status(200).json({
            resultado
        })


    }catch(erro){
        next(erro)
    }
}

module.exports = {listarTodosUsers}