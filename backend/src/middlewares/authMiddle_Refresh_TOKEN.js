//só  verifica o token, pego poor cookies
const AppError = require("../error/AppError")
const jwt = require("jsonwebtoken")

const bcrypt = require("bcrypt")
const sql = require("../config/DB")

//busca a sessão do usuário no banco de dados 
// (se não existir sessão, ou é porque nunca se logou, OU seu login já expirou, e foi deletado)
async function buscar_session_user(id_user) {
    const comandosql = "SELECT * FROM sessions WHERE dono_id = ?"
    const valores = [id_user]
    const [resultado] = await sql.query(comandosql, valores)

    return resultado

}


async function comparar_refresh_token(token, id_user) {

    const [user_session] = await buscar_session_user(id_user)

    const refreshToken_User = user_session.RefreshToken

    const validacao = await bcrypt.compare(token, refreshToken_User)

    return validacao
}




async function authMiddle_Refresh_TOKEN(req,res,next){
        try{
            const RefreshToken = req.cookies.RefreshToken

            if(!RefreshToken){
                throw new AppError("Não Autenticado", 401)
            }

            const payload = jwt.verify(RefreshToken, process.env.JWT_REFRESH_SECRET);

            const comparar_refreshtokens = await comparar_refresh_token(RefreshToken, payload.id)

            if(!comparar_refreshtokens){
                throw new AppError("Login em outro lugar OU Sessão expirada", 401)
            }

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



module.exports = {authMiddle_Refresh_TOKEN}