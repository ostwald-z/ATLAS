const sql = require("../../../../config/DB")


async function buscarSenhDoUser(id_user) {
    const comandosql = "SELECT senha_hash_vault FROM usuarios WHERE id=?"
    const valores = [id_user]
    const [resultado] = await sql.query(comandosql, valores)

    return resultado

}




module.exports = {buscarSenhDoUser}