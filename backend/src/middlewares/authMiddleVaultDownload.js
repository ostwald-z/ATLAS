//só  verifica o vaultToken entregue por JSON com header personalizado para vault.
const AppError = require("../error/AppError")
const jwt = require("jsonwebtoken")

// PARA DOWNLOAD NATIVO DO BROWSER FUNCIONAR, NÃO CONSEGUIMOS ENVIAR HEADER PERSONALIZADO
// então enviamos o token via query, precisando de um middleware especifico pra aceitar.

function authMiddle_bearer_vaultDownload(req,res,next){
        try{
            const vaultToken = req.query.vault_token

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



module.exports = {authMiddle_bearer_vaultDownload}