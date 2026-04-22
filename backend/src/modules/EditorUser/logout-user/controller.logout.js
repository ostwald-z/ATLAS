
const isProd = process.env.NODE_ENV === 'prod';

async function logout_controller_user(req,res,next) {
    try{

        res.cookie('token', '', {
            httpOnly: true,
            // Fica true apenas em produção (HTTPS)
            secure: isProd, 
            // 'lax' para o mesmo domínio, ou 'none' se precisar de cross-site no futuro
            sameSite: 'lax', 
            maxAge: new Date(0) // expira imediatamente
        });

        res.status(200).json({
            message: "Logout realizado com sucesso!."
        })


    }catch(erro){
        next(erro)
    }
}

module.exports = {logout_controller_user}