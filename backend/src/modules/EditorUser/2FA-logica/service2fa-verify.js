const AppError = require("../../../error/AppError")

const repo2fa = require("./repo-2fa-verify")
const totp2fa = require("./2falogica")

const bcrypt = require("bcrypt")

const jwt = require("jsonwebtoken")


async function service2fa_verify(totpcode, id_user) {

    if(typeof totpcode !== "string" || totpcode.trim().length === 0){
        throw new AppError("2FA Incorreto")
    }


    // busca o usuario e pega a seed dele
    const [buscar_seed_user] = await repo2fa.buscar_seed_User(id_user)

    if(!buscar_seed_user.seed || !buscar_seed_user){
        throw new AppError("Erro ao buscar segredo do usuário.", 404)
    }

    const seed_2fa_user = buscar_seed_user.seed

    const verificar_codigo_2fa = totp2fa.verifyToken(totpcode, seed_2fa_user)

    if(!verificar_codigo_2fa){
        throw new AppError("Código 2FA inválido")
    }

    //busca info do usuario, ROLE e ID
    const [usuario] = await repo2fa.buscarUser(id_user)

    if(!usuario){
        throw new AppError("Erro ao procurar informações do usuário")
    }


    // gera token definitivo para usar no sistema (acess)
    const AcessToken = jwt.sign(
        {id:usuario.id, role:usuario.role},
        process.env.JWT_SECRET,
        {expiresIn: process.env.JWT_EXPIRES})

    
    // gera refreshToken, necessário para pegar outro acessToken.
    const RefreshToken = jwt.sign(
        {id:usuario.id},
        process.env.JWT_REFRESH_SECRET,
        {expiresIn: process.env.JWT_REFRESH_EXPIRES}
    )

    // transforma em HASH as variaveis
    const refreshHash = await bcrypt.hash(RefreshToken, 10)
    const acessHash = await bcrypt.hash(AcessToken, 10)


    

    // VERIFICA SE A SESSÃO JÁ EXISTE, OU NÃO a sessão, criando ou atualizando.
    const [user_session] = await repo2fa.buscar_sessao(usuario.id)

    if(!user_session){
        const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
        repo2fa.criar_sessao_user(usuario.id, expiresAt, refreshHash, acessHash)
    }else{
        const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
        repo2fa.atualizar_sessao(refreshHash, acessHash, usuario.id, expiresAt)
    }

    
    return {RefreshToken, AcessToken}

}


module.exports = {service2fa_verify}