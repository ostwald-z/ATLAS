//só  verifica o token, pego poor cookies
const AppError = require("../error/AppError")
const jwt = require("jsonwebtoken")


async function authMiddle(req,res,next){
        try{
            const AcessToken = req.cookies.AcessToken; 
  
            if(!AcessToken){
                throw new AppError("Não Autenticado", 401)
            }

            const payload = jwt.verify(AcessToken, process.env.JWT_SECRET);

            req.user = payload;
            next();

            

        }catch(erro){
            // transforma erro JWT em AppError
            if(
                erro.name === "JsonWebTokenError" ||
                erro.name === "TokenExpiredError"
            ){
                return next(
                    new AppError("Não Autenticado", 401)
                )
            }

            return next(erro)
        }
    }



module.exports = {authMiddle}