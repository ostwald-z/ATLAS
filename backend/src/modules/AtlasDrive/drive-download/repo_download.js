const sql = require("../../../config/DB")



async function buscar_arquivo_sql(nome_arquivo, id_do_user_que_chama) {
    const comandosql = "SELECT * FROM atlas_drive WHERE caminho=? AND dono_id=?"
    const valores = [nome_arquivo, id_do_user_que_chama]
    const [resultado] = await sql.query(comandosql, valores)

    return resultado
}



module.exports = {buscar_arquivo_sql}