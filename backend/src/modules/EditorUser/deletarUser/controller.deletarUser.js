const service = require("./service.deletarUser")


async function deletarUser(req,res,next) {
    try{
        
        const id = req.params.id

        const resultado = await service.deletarUser(id)

        res.status(200).json({
            message: "Usuário deletado com sucesso: " + id + " !!!",
            prova: resultado.affectedRows
        })


    }catch(erro){
        next(erro)
    }
}

module.exports = {deletarUser}