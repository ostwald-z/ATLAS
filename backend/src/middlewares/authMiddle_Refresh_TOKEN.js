//só  verifica o token, pego poor cookies
const AppError = require("../error/AppError")
const jwt = require("jsonwebtoken")



// ESQUEÇA TUDO, só verifica se o RTF que chegou é valido , assinatura e etc
// se for, manda pro controller e service, LÁ QUE VAI SER VERIFICADO, qual dos RTF o token é (1 ou 2)
// se nao for nenhum, OU oque ele for em questão estiver expirado > 401



async function authMiddle_Refresh_TOKEN(req,res,next){
        try{
            const RefreshToken = req.cookies.RefreshToken

            console.log("middle refresh: ", RefreshToken)

            if(!RefreshToken){
                throw new AppError("Não Autenticado", 401)
            }

            const payload = jwt.verify(RefreshToken, process.env.JWT_REFRESH_SECRET);

            req.rft = RefreshToken
            req.user = payload;
            
            next();

        }catch(erro){
            if(!erro.status){
                res.status(401).json({
                    erro: "Não Autenticado"
                })
            }
            return next(erro);
        }
    }



module.exports = {authMiddle_Refresh_TOKEN}