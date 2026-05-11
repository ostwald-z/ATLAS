const sql = require("../../config/DB")

async function buscar_sessao(user_id) {
    const comandosql = "SELECT * FROM sessions WHERE dono_id = ?"
    const valores = [user_id]
    const [resultado] = await sql.query(comandosql, valores)

    return resultado

}


async function buscar_user(user_id) {
    const comandosql = "SELECT * FROM usuarios WHERE id = ?"
    const valores = [user_id]
    const [resultado] = await sql.query(comandosql, valores)

    return resultado

}


async function atualizar_RTF_1(id_user, refresh) {
    const comandosql = "UPDATE sessions SET RTF_1 = ? WHERE dono_id = ?"
    const valores = [refresh, id_user]
    const [resultado] = await sql.query(comandosql, valores)

    return resultado
}


async function atualizar_RTF_2(user_id, refresh) {
    const comandosql = "UPDATE sessions SET RTF_2 = ? WHERE dono_id = ?"
    const valores = [refresh, user_id]
    const [resultado] = await sql.query(comandosql, valores)

    return resultado
}



async function remover_sessao(user_id) {
    const comandosql = "DELETE FROM sessions WHERE dono_id = ?"
    const valores = [user_id]
    const [resultado] = await sql.query(comandosql, valores)

    return resultado

}








module.exports = {atualizar_RTF_1, atualizar_RTF_2, remover_sessao, buscar_sessao, buscar_user}