const service = require("./service.verificarSenha")

const isProd = process.env.NODE_ENV === 'prod';

async function controller_verificar_senha_vault(req,res,next) {
    try{

        const user_id = req.user.id

        const user_role = req.user.role

        const {senha_vault} = req.body

        const token_vault_drive = await service.service_verificar_senha_vault(user_id, user_role, senha_vault)

        res.cookie("VaultCookie", token_vault_drive, {
            httpOnly: true,
            // Fica true apenas em produção (HTTPS)
            secure: isProd, 
            // 'lax' para o mesmo domínio, ou 'none' se precisar de cross-site no futuro
            sameSite: 'lax', 
            maxAge: 10 * 60 * 1000, // 10 minutos em milissegundos
        })



        res.status(200).json({
            message: "ok"
        })


    }catch(erro){
        next(erro)
    }
}


module.exports = {controller_verificar_senha_vault}