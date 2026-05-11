const sql = require("../../../config/DB")


async function buscar_seed_User(id_user) {
    const comandosql = "SELECT * FROM seeds_2fa WHERE user_id=?"
    const valores = [id_user]
    const [resultado] = await sql.query(comandosql, valores)

    return resultado
}


async function buscarUser(id_user) {
    const comandosql = "SELECT * FROM usuarios WHERE id=?"
    const valores = [id_user]
    const [resultado] = await sql.query(comandosql, valores)

    return resultado
}



async function criar_sessao_user(user_id, expiresIn, refresh,) {
    
    const comandosql = "INSERT INTO sessions (dono_id, RTF_1_expireAt, RTF_1, RTF_1_createdAt) VALUES (?,?,?,CURRENT_TIMESTAMP)"
    const valores = [user_id, expiresIn, refresh]
    const [resultado] = await sql.query(comandosql, valores)

    return resultado

}


async function atualizar_RTF_1(id_user, refresh, expiresIn) {
    const comandosql = "UPDATE sessions SET RTF_1 = ?, RTF_1_expireAt = ?, RTF_1_createdAt = CURRENT_TIMESTAMP  WHERE dono_id = ?"
    const valores = [refresh, expiresIn, id_user,]
    const [resultado] = await sql.query(comandosql, valores)

    return resultado
}


async function atualizar_RTF_2(user_id, refresh, expiresIn) {
    const comandosql = "UPDATE sessions SET RTF_2 = ?, RTF_2_expireAt = ?, RTF_2_createdAt = CURRENT_TIMESTAMP WHERE dono_id = ?"
    const valores = [refresh, expiresIn, user_id]
    const [resultado] = await sql.query(comandosql, valores)

    return resultado
}


async function buscar_sessao(user_id) {
    const comandosql = "SELECT * FROM sessions WHERE dono_id = ?"
    const valores = [user_id]
    const [resultado] = await sql.query(comandosql, valores)

    return resultado

}



module.exports = {buscarUser, buscar_seed_User, atualizar_RTF_1, atualizar_RTF_2, buscar_sessao, criar_sessao_user}