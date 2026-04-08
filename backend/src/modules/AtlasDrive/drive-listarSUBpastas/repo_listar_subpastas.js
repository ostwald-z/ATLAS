const sql = require("../../../config/DB")


async function pegar_original_nome_por_uuid(uuid) {
    const comandosql = "SELECT * FROM atlas_drive WHERE unique_uuid=?"
    const valores = [uuid]

    const [resultado] = await sql.query(comandosql, valores)

    return resultado
}


module.exports = {pegar_original_nome_por_uuid}