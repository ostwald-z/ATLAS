

// só entrega a porra do cookie vencido
const isProd = process.env.NODE_ENV === "prod"

async function controller_logout_vault(req,res,next) {
    try{

        res.cookie('VaultCookie', '', { 
            httpOnly: true,
            secure: isProd, 
            // 'lax' para o mesmo domínio, ou 'none' se precisar de cross-site no futuro
            sameSite: 'lax', 
            expires: new Date(0)
        });




    }catch(erro){
        next(erro)
    }
}

module.exports = {controller_logout_vault}