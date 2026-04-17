//só  verifica o token, pego poor cookies



// VERIFICA o token que tem , com base no codigo de token gerado apenas para fazer requisição no 2FA
// DEPOIS de digitar ccrretamente o user e senha.

const AppError = require("../error/AppError")
const jwt = require("jsonwebtoken")

function authMiddle_login_init(req,res,next){
        try{
            const token = req.cookies.token; 
  
            
            if(!token){
                throw new AppError("Não Autenticado", 401)
            }

            const payload = jwt.verify(token, process.env.JWT_SECRET_LOGIN_INIT);
            req.user = payload;
            next();

            

        }catch(erro){
            if(!erro.status){
                res.status(401).json({
                    erro: "Não Autenticado"
                })
            }
            next(erro)
        }
    }


module.exports = {authMiddle_login_init}