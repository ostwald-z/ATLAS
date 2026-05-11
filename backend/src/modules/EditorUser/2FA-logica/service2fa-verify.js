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


    // REFRESH TOKEN !!!
    const RefreshToken = jwt.sign(
        {id:usuario.id},
        process.env.JWT_REFRESH_SECRET,
        {expiresIn: process.env.JWT_REFRESH_EXPIRES})
    
    // access Token !!!!
    const AcessToken = jwt.sign(
        {id:usuario.id, role:usuario.role},
        process.env.JWT_SECRET,
        {expiresIn: process.env.JWT_EXPIRES})
    
    
    const refreshHash = await bcrypt.hash(RefreshToken, 10)
    
    // verifica se EXISTE sessão no banco
    const [user_sessao] = repo.buscar_sessao(usuario.id)
    
    // verifica todas as possibilidades
    // RTF_1 vazio, ou RTF_2 vazio, ou ambos vazios, ou ambos Preenchidos, ou não existe a sessão.
    
    if(!user_sessao){
        // se não tem sessão existente, cria RTF e coloca no RTF_1, deixando o 2 vazio.
        const expiresRefresh = new Date(Date.now() + 15 * 24 * 60 * 60 * 1000);
        repo.criar_sessao_user(usuario.id, expiresRefresh, refreshHash)
    
        return {RefreshToken, AcessToken}
    }
    
    
    // se não tiver RTF_1, e TIVER RTF_2 - coloca no vazio, sempre.
    if(!user_sessao.RTF_1 && user_sessao.RTF_2){
        // cria nova data de expiração 15 dias.
        const expiresRefresh = new Date(Date.now() + 15 * 24 * 60 * 60 * 1000);
        await repo.atualizar_RTF_1(usuario.id, refreshHash, expiresRefresh)
    
        return {RefreshToken, AcessToken}
    
    }
    
    
    if(user_sessao.RTF_1 && !user_sessao.RTF_2){
        const expiresRefresh = new Date(Date.now() + 15 * 24 * 60 * 60 * 1000);
        await repo.atualizar_RTF_2(usuario.id, refreshHash, expiresRefresh)
    
        return {RefreshToken, AcessToken}
    
    }
    
    if(!user_sessao.RTF_1 && !user_sessao.RTF_2){
        // se não tem sessão existente, cria RTF e coloca no RTF_1, deixando o 2 vazio.
        const expiresRefresh = new Date(Date.now() + 15 * 24 * 60 * 60 * 1000);
        repo.atualizar_RTF_1(usuario.id, refreshHash, expiresRefresh)
    
        return {RefreshToken, AcessToken}
    }
    
    
    if(user_sessao.RTF_1 && user_sessao.RTF_2){
        // faz lógica de quem é mais antigo , para substituir por esse novo refresh.
        const expiresRefresh = new Date(Date.now() + 15 * 24 * 60 * 60 * 1000);
    
        const maisAntigo = user_sessao.RTF_1_createdAt < user_sessao.RTF_2_createdAt
                ? "RTF_1"
                : "RTF_2";
    
        
        const nomeFuncao = `atualizar_${maisAntigo}`;
    
        await repo[nomeFuncao](usuario.id, refreshHash, expiresRefresh);
            
        return {RefreshToken, AcessToken}
    
    }

    throw new AppError("Erro interno inesperado ao logar, tente novamente mais tarde")

}


module.exports = {service2fa_verify}