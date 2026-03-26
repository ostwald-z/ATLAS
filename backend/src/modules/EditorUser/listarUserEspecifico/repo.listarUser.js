const sql = require("../../../config/DB")


async function listarUser(id) {
    const comandosql = "SELECT * FROM usuarios WHERE id = ?"
    const valores = [id]
    const [resultado] = await sql.query(comandosql, valores)
    return resultado;
}



module.exports = {
    listarUser
}