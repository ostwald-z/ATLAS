const sql = require("../../../config/DB")

async function listarTodosPedidos() {
    const comandosql = "SELECT * FROM usuarios_pendentes"
    const [resultado] = await sql.query(comandosql)
    return resultado
}


module.exports = {listarTodosPedidos}