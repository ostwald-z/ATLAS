const sql = require("../../config/DB")


async function buscarID(id) {
    const comandosql = "SELECT * FROM usuarios WHERE id = ?"
    const valores = [id]
    const [resultado] = await sql.query(comandosql, valores)
    return resultado;
}


module.exports = {buscarID}