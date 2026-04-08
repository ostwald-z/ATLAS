const sql = require("../../../config/DB")



async function deletar_drive_repo(caminho, id_user) {
    const comandosql = "DELETE FROM atlas_drive WHERE caminho=? AND dono_id=?"
    const valores = [caminho, id_user]
    const [resultado] = await sql.query(comandosql, valores)

    return resultado;
}


async function deletar_arquivos_por_pasta_repo(caminho_pasta, id_user) {
    // 1. Garante que o caminho da pasta NÃO termina com barra para o primeiro parâmetro
    const pasta_limpa = caminho_pasta.replace(/\/+$/, '');
    
    // 2. O wildcard deve ser exatamente a pasta + / + qualquer coisa
    const caminho_com_wildcard = `${pasta_limpa}/%`;

    // A query está correta, mas o segredo é o rigor nos parâmetros
    const comandosql = `DELETE FROM atlas_drive WHERE dono_id=? AND (caminho = ? OR caminho LIKE ?)`;

    const [result] = await sql.query(comandosql, [id_user, pasta_limpa, caminho_com_wildcard]);
    return result;
}





module.exports = {deletar_drive_repo, deletar_arquivos_por_pasta_repo}