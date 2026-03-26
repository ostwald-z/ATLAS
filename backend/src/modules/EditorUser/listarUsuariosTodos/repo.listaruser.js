const sql = require("../../../config/DB")

async function listarTodosUsers() {
    const comandosql = "SELECT * FROM usuarios"
    const [resultado] = await sql.query(comandosql)
    return resultado;
}

module.exports = {listarTodosUsers}