const sql = require("../../../config/DB")


async function pegarVault(vaultName, id_user) {
    const comandosql = "SELECT nome_vault FROM vaults WHERE dono_id = ? AND nome_vault = ?"
    const valores = [id_user, vaultName]
    const [resultado] = await sql.query(comandosql, valores)

    return resultado;

}


module.exports = {pegarVault}