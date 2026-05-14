const sql = require("../../../config/DB")



async function buscarVault(vaultName, id) {
    const comandosql = "SELECT nome_vault FROM vaults WHERE dono_id = ? AND nome_vault = ?"
    const valores = [id, vaultName]
    const [resultado] = await sql.query(comandosql, valores)

    return  resultado
}


module.exports = {buscarVault}