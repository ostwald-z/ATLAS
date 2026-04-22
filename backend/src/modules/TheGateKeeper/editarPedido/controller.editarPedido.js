const service = require("./service.editarPedido")


async function updateForm(req,res,next) {
    try{

        const id = req.params.id
        const {user, senha, email, role, obs, nome_completo} = req.body

        const resultado = await service.updateForm(user, email, senha, obs, role, id, nome_completo)

        res.status(200).json({
            message: "Formulário atualizado com sucesso, ID: " + id
        })


    }catch(erro){
        next(erro)
    }
}


module.exports = {updateForm}