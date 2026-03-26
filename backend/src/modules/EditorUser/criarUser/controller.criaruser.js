const service = require("./serviceCriarUser")



async function criarUser(req,res,next) {
    try{

        const {user,senha,email,obs,magicRole,magicCriar} = req.body
        const {chaveNoPending} = req.body

        const resultado = await service.criarUser(user, senha, email, magicCriar, magicRole, obs, chaveNoPending)



        const validarNoPending = await service.validarNoPending(chaveNoPending)

        if(validarNoPending === "sim"){
            res.status(200).json({
                message: "Usuário Criado diretamente com uma ATLAS-KEY",
                idUser: "----NOVO ID: " + resultado.insertId,
                atlas: "on"
            })
            console.log("USOU o no Pending")
            return;
        }


        res.status(200).json({
            message: "Pedido de criação enviado, Aguarde Aprovação!",
            idEspera: "Seu ID de espera: " + resultado.insertId,
            atlas: "off"
        })


    }catch(erro){
        next(erro)
    }
}


module.exports = {criarUser}