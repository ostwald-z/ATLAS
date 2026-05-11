//só  verifica o vaultToken entregue por JSON com header personalizado para vault.
const AppError = require("../error/AppError")
const jwt = require("jsonwebtoken")

function authMiddle_vault(req,res,next){
        try{
            const vaultToken = req.cookies.VaultCookie

            if(!vaultToken){
                throw new AppError("Não Autenticado", 401)
            }

            const payload = jwt.verify(vaultToken, process.env.JWT_SECRET_VAULT_DRIVE);
            req.VaultAcessToken = payload;

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



module.exports = {authMiddle_vault}