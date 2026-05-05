//só  verifica o token, pego poor cookies
const AppError = require("../error/AppError")
const jwt = require("jsonwebtoken")
const bcrypt = require("bcrypt")
const sql = require("../config/DB")
const { cmp } = require("geoip-lite")

// VALIDAMOS AQUI O ACESS TOKEN

/*

----------------------------------------------------------------------------------------------

PRA EVITAR 2 LOGINS ATIVOS EM 1 UNICO USUÁRIO A LÓGICA É:

----------------------------------------------------------------------------------------------

1) pega o acess token do usuário na sessão

2) COMPARA COM O ACESS TOKEN que a requisição ENVIOU

3) SE NÃO BATER > LOGOUT

4) SE BATER, segue validação normal com JWT.verify

--------------------------------------------------------------

"porque funciona?"


porque, A CADA NOVO LOGIN bem sucedido, se a sessão já existe no banco ( tabela sessions )

um NOVO acessToken é gerado e enviado
um NOVO refreshToken é gerado e enviado

ou seja

Usuário antigo, ainda está com o acessToken antigo

quando, em tempo real, no banco de dados acabou de trocar para um mais recente, completamente diferente

a PRÓXIMA requisição do usuário antigo chegará nesse middleware

comparação entre o acessToken que chegou | acessToken que está no banco AGORA

se der diferente > logout no agente que enviou a requisição com acessToken antigo

*/




//busca a sessão do usuário no banco de dados 
// (se não existir sessão, ou é porque nunca se logou, OU seu login já expirou, e foi deletado)
async function buscar_session_user(id_user) {
    const comandosql = "SELECT * FROM sessions WHERE dono_id = ?"
    const valores = [id_user]
    const [resultado] = await sql.query(comandosql, valores)

    return resultado

}


async function comparar_acess_token(token, id_user) {

    const [user_session] = await buscar_session_user(id_user)

    const acessToken_User = user_session.AcessToken

    const validacao = await bcrypt.compare(token, acessToken_User)

    return validacao
}



async function authMiddle(req,res,next){
        try{
            //const token = req.cookies.token; 
  

            // 1. Pega o conteúdo do header 'Authorization'
            const authHeader = req.headers['authorization'];
                
            // 2. Verifica se o header existe e começa com 'Bearer '
            const AcessToken = authHeader && authHeader.split(' ')[1];


            if(!AcessToken){
                throw new AppError("Não Autenticado", 401)
            }


            // primeiro DECODIFICA o payload com a nossa chave do JWT do acess token
            // para informações como ID e ROLE ficarem visiveis (payload)
            const payload = jwt.verify(AcessToken, process.env.JWT_SECRET);

            // agora pegamos o valor que importa
            const user_id = payload.id

            // comparamos o acess token que chegou, com oque está no BANCO AGORA
            // evitando duplo login , ambos ativos.
            const comparacao_de_acess_tokens = await comparar_acess_token(AcessToken, user_id)

            if(!comparacao_de_acess_tokens){
                throw new AppError("Login realizado em outro lugar OU sessão EXPIRADA.", 401)
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



module.exports = {authMiddle}