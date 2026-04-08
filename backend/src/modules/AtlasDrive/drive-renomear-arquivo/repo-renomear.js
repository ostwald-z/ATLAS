const sql = require("../../../config/DB")



async function repo_renomear_arquivo(novo_nome, caminho_arquivo, user_id) {
    const comandosql = "UPDATE atlas_drive SET nome_original=? WHERE caminho=? AND dono_id=?"
    const valores = [novo_nome, caminho_arquivo, user_id]

    const [resultado] = await sql.query(comandosql, valores)

    return resultado

}


async function repo_atualizar_caminho_arquivos_dentro_de_pasta(caminho_antigo, id_user, novo_caminho) {
    // Exemplo: caminho_antigo = 'projetos'
    // novo_caminho = 'arquivados/projetos'
    
    const comandosql = `
        UPDATE atlas_drive 
        SET caminho = REPLACE(caminho, ?, ?) 
        WHERE dono_id = ? 
        AND (caminho = ? OR caminho LIKE ?)
    `;

    const wildcard = `${caminho_antigo}/%`;
    
    // O REPLACE vai trocar apenas o início do texto 'projetos' por 'arquivados/projetos'
    const [result] = await sql.query(comandosql, [
        caminho_antigo, 
        novo_caminho, 
        id_user, 
        caminho_antigo, 
        wildcard
    ]);
    return result;
}


async function repo_atualizar_caminho_arquivo(caminho_arquivo, id_user, novo_caminho) {
    
    const comandosql = "UPDATE atlas_drive SET caminho=? WHERE dono_id=? and caminho=?"
    const valores = [novo_caminho, id_user, caminho_arquivo]
    const [resultado] = await sql.query(comandosql, valores)

    return resultado;


}



module.exports = {repo_renomear_arquivo, repo_atualizar_caminho_arquivos_dentro_de_pasta, repo_atualizar_caminho_arquivo}