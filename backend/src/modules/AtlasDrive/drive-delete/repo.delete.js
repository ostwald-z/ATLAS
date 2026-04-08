const sql = require("../../../config/DB")



async function deletar_drive_repo(caminho, id_user) {
    const comandosql = "DELETE FROM atlas_drive WHERE caminho=? AND dono_id=?"
    const valores = [caminho, id_user]
    const [resultado] = await sql.query(comandosql, valores)

    return resultado;
}


async function deletar_arquivos_por_pasta_repo(caminho_pasta, id_user) {
    // O prefixo garante que pegamos a pasta exata e tudo que está dentro dela
    // Exemplo: 'fotos/' vira 'fotos/%'
    const caminho_com_wildcard = `${caminho_pasta}/%`;

    const comandosql = `DELETE FROM atlas_drive WHERE dono_id=? AND (caminho = ? OR caminho LIKE ?)`;

    // Deleta o registro da pasta em si (se existir) OU qualquer arquivo que comece com o caminho dela
    const [result] = await sql.query(comandosql, [id_user, caminho_pasta, caminho_com_wildcard]);
    return result;
}





module.exports = {deletar_drive_repo, deletar_arquivos_por_pasta_repo}