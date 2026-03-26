const sql = require("../../../config/DB")

async function deletarForm(id) {
    const comandosql = "DELETE FROM usuarios_pendentes WHERE id = ?"
    const valores = [id]
    const [resultado] = await sql.query(comandosql, valores)
    return resultado;
}


module.exports = {deletarForm}