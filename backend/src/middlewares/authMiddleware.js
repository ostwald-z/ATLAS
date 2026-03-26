//só  verifica o token, pego poor cookies
const AppError = require("../error/AppError")
const jwt = require("jsonwebtoken")

function authMiddle(req,res,next){
        try{
            const token = req.cookies.token
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



module.exports = {authMiddle}