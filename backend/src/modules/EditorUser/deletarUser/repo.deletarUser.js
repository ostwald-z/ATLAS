const sql = require("../../../config/DB")



async function deletarUser(id) {
    const comandosql = "DELETE FROM usuarios WHERE id = ?"
    const valores = [id]
    const [resultado] = await sql.query(comandosql, valores)
    return resultado;
}



module.exports = {deletarUser}