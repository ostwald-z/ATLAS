const AppError = require("./../../error/AppError")

const repo = require("./repo.refresh")

const jwt = require("jsonwebtoken")

const bcrypt = require("bcrypt")

/*

VER qual RFT chegou, se ele é o RTF_1 ou RTF_2 no banco de dados com base no ID do usuário.

se for o RFT_1, gera novo acess token, NOVO RTF - substitui no banco no RFT_1

*/

async function service_refresh(id_user, refresh_token) {

    const [usuario] = await repo.buscar_user(id_user)

    if(!usuario){
        console.log("Usuário não encontrado.")
        throw new AppError("Usuário não encontrado", 401)
    }

    // busca no banco a sessão
    const [user_session] = await repo.buscar_sessao(id_user)


    if(!user_session){
        throw new AppError("Sessão expirada", 401)
    }


    if(!user_session.RTF_1 && !user_session.RTF_2){
        await repo.remover_sessao(id_user)
        throw new AppError("Sessão expirada", 401)
    }

    const match_RTF_1 = await bcrypt.compare(refresh_token, user_session.RTF_1)
    const match_RTF_2 = await bcrypt.compare(refresh_token, user_session.RTF_2)

    if(!match_RTF_1 && !match_RTF_2){
        throw new AppError("Não autenticado ou login em outro lugar.", 401)
    }

    if(match_RTF_1){
        // verfica se expirou a porra do RTF_1
        const expireAt_RTF_1 = user_session.RTF_1_expireAt

        if(expireAt_RTF_1 < new Date()){
            //se expirou, deixa VAZIO
            await repo.atualizar_RTF_1(id_user, "")
            throw new AppError("Sessão expirada", 401)
        }


        // se não tiver expirada, já gera novo refresh token
        const RefreshToken = jwt.sign(
            {id: usuario.id},
            process.env.JWT_REFRESH_SECRET,
            {expiresIn: process.env.JWT_REFRESH_EXPIRES}
        )

        // gera novo hash e ROTACIONA NO BANCO o NOVO refreshToken 1
        const refreshHash = await bcrypt.hash(RefreshToken, 10)
        await repo.atualizar_RTF_1(id_user, refreshHash)

        // gera AcessToken
        const AcessToken = jwt.sign(
            {id: usuario.id, role: usuario.role},
            process.env.JWT_SECRET,
            {expiresIn: process.env.JWT_EXPIRES}
        )

        return {AcessToken, RefreshToken}
    }

    if(match_RTF_2){
        // verfica se expirou a porra do RTF_2
        const expireAt_RTF_2 = user_session.RTF_2_expireAt

        if(expireAt_RTF_2 < new Date()){
            //se expirou, deixa VAZIO
            await repo.atualizar_RTF_2(id_user, "")
            throw new AppError("Sessão expirada", 401)
        }

        const RefreshToken = jwt.sign(
            {id: usuario.id},
            process.env.JWT_REFRESH_SECRET,
            {expiresIn: process.env.JWT_REFRESH_EXPIRES}
        )

        // gera novo hash e ROTACIONA NO BANCO o NOVO refreshToken 2
        const refreshHash = await bcrypt.hash(RefreshToken, 10)
        await repo.atualizar_RTF_2(id_user, refreshHash)

        // gera AcessToken
        const AcessToken = jwt.sign(
            {id: usuario.id, role: usuario.role},
            process.env.JWT_SECRET, 
            {expiresIn: process.env.JWT_EXPIRES}
        )

        return {AcessToken, RefreshToken}
    }

    console.log("Erro interno ao dar refresh, chegou aqui e não caiu em nenhum match, bizarro.")
    throw new AppError("ERRO ao dar REFRESH, tente novamente mais tarde", 401)

}

module.exports = {service_refresh}