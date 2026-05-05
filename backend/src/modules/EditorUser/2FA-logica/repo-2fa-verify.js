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



async function criar_sessao_user(user_id, expiresIn, refresh, acess, ) {
    
    const comandosql = "INSERT INTO sessions (dono_id, expira, RefreshToken, AcessToken) VALUES (?,?,?,?)"
    const valores = [user_id, expiresIn, refresh, acess]
    const [resultado] = await sql.query(comandosql, valores)

    return resultado

}


async function atualizar_sessao(refresh, access, user_id, expiresIn) {
    const comandosql = "UPDATE sessions SET RefreshToken = ?, AcessToken = ?, expira = ? WHERE dono_id = ?"
    const valores = [refresh, access, user_id, expiresIn]
    const [resultado] = await sql.query(comandosql, valores)

    return resultado

}


async function buscar_sessao(user_id) {
    const comandosql = "SELECT * FROM sessions WHERE dono_id = ?"
    const valores = [user_id]
    const [resultado] = await sql.query(comandosql, valores)

    return resultado

}



module.exports = {buscarUser, buscar_seed_User, atualizar_sessao, buscar_sessao, criar_sessao_user}