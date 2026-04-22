const service = require("./service.UpdateUser")



async function updateUser(req,res,next) {
    try{

        const id = req.params.id
        const idUser = req.user.id
        const roleToken = req.user.role
        const {user, email, senha, obs, roleEdit, nome_completo} = req.body

        const httpInfo = req.httpInfo


        const resultado = await service.updateUser(user,email,senha,obs,roleEdit,roleToken, id, idUser, nome_completo, httpInfo)

        res.status(200).json({
            message: "Usuario atualizado com sucesso!, ID: " + id,
            prova: resultado.affectedRows
        })


    }catch(erro){
        next(erro)
    }
}


module.exports = {updateUser}