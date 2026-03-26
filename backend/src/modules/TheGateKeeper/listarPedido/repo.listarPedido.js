const sql = require("../../../config/DB")

async function listarPedido(id) {
    const comandosql = "SELECT * FROM usuarios_pendentes WHERE id = ?"
    const valores = [id]
    const [resultado] = await sql.query(comandosql, valores)
    return resultado;
}

module.exports = {listarPedido}