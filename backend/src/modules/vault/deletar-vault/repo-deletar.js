const sql = require("../../../config/DB")



async function buscarVault(vault, id) {
    const comandosql = "SELECT nome_vault FROM vaults WHERE dono_id = ? AND nome_vault = ?"
    const valores = [id, vault]
    const [resultado] = await sql.query(comandosql, valores)

    return resultado
}



async function deletar_vault_banco(vault, id) {
    const comandosql = "DELETE FROM vaults WHERE dono_id = ? AND nome_vault = ?"
    const valores = [id,vault]
    const [resultado] = await sql.query(comandosql, valores)
    console.log(resultado)
    return resultado;
}



module.exports = {buscarVault, deletar_vault_banco}