const jwt = require('jsonwebtoken');


const verificarAcessoUser = (req, res, next) => {

    console.log("🚨 BATEU NO MIDDLEWARE USER! Token:", req.cookies.token);

    // Pegando o token do Cookie (mais rápido para rotas de página)
    const token = req.cookies.token; 

    if (!token) {
        return res.redirect(process.env.FRONTEND_URL + '/login');
    }

    try {
        // 1. Valida se o token foi criado por você (Segurança)
        const decodificado = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decodificado;

        // 2. Verifica a Permissão (Role)
        if (req.user.role === 'user' || req.user.role === "admin") {

            // Se passou em tudo, libera o acesso 

            next();
        }else{
            return res.status(403).send("Acesso Proibido");
        }

        
        
    } catch (err) {
        // Se o token for inválido ou expirado
        res.clearCookie('token');
        return res.redirect('/login');
    }
};

module.exports = { verificarAcessoUser };
