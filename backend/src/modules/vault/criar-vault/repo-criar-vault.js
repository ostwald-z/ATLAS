const sql = require("../../../config/DB")




async function criar_vault_banco(vaultName, id) {
    const comandosql = "INSERT INTO vaults (nome_vault, dono_id) VALUES (?,?)"
    const valores = [vaultName, id]
    const [resultado] = await sql.query(comandosql, valores)

    return resultado

}

module.exports = {criar_vault_banco}