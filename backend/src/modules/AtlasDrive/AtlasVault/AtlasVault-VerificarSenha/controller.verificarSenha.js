const service = require("./service.verificarSenha")



async function controller_verificar_senha_vault(req,res,next) {
    try{

        const user_id = req.user.id

        const user_role = req.user.role

        const {senha_vault} = req.body

        const token_vault_drive = await service.service_verificar_senha_vault(user_id, user_role, senha_vault)

        res.status(200).json({
            vaultToken: token_vault_drive
        })


    }catch(erro){
        next(erro)
    }
}


module.exports = {controller_verificar_senha_vault}