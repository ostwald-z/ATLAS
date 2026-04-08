//só  verifica o token, pego poor cookies
const AppError = require("../error/AppError")
const jwt = require("jsonwebtoken")

function authMiddle_bearer(req,res,next){
        try{
            const token = req.headers.authorization?.split(" ")[1]

            
            if(!token){
                throw new AppError("Não Autenticado", 401)
            }

            

            const payload = jwt.verify(token, process.env.JWT_SECRET);
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



module.exports = {authMiddle_bearer}