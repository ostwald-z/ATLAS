const sql = require("../../../config/DB")



async function upload_arquivo(metadado_arquivo) {
    
    comandosql = "INSERT INTO atlas_drive (dono_id,tipo,caminho,nome_original,tamanho,unique_uuid) VALUES(?,?,?,?,?,?)"

    const valores = [
        metadado_arquivo.owner_id,
        metadado_arquivo.type,
        metadado_arquivo.path,
        metadado_arquivo.name,
        metadado_arquivo.size,
        metadado_arquivo.uuid
    ]

    const [resultado] = await sql.query(comandosql, valores)

    return resultado

}


module.exports = {
    upload_arquivo
}