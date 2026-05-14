
const sql = require("../../../config/DB")

async function buscar_vault(id) {
    
    const comandosql = "SELECT * FROM vaults WHERE dono_id = ?"
    const valores = [id]
    const [resultado] = await sql.query(comandosql, valores)

    return resultado

}




module.exports = {buscar_vault}