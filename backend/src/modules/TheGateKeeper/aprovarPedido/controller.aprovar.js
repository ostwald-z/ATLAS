const service = require("./service.aprovar")

async function aprovarForm(req,res,next) {
    try{

        const id = req.params.id

        const id_autor = req.user.id

        const httpInfo = req.httpInfo

        const resultado = await service.aprovarForm(id, id_autor, httpInfo)

        res.status(200).json({
            message: "Usuário Criado com sucesso!",
            NovoID: "NOVO ID: " + resultado.insertId
        })

    }catch(erro){
        next(erro)
    }
}


module.exports = {aprovarForm}