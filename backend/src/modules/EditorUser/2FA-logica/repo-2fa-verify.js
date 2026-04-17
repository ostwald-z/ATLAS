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




module.exports = {buscarUser, buscar_seed_User}