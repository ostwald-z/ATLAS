const AppError = require("../../../error/AppError")
const repo_download = require("./repo_download")

const path = require('path')
const fs = require("fs");

async function download_arquivo_service(caminho_do_arquivo, id_de_quem_chama) {
    
    const [arquivo_buscar] = await repo_download.buscar_arquivo_sql(caminho_do_arquivo, id_de_quem_chama)

    // se o NOME colocado na requisição, não existir 
    // OU o ID_owner do arquivo que de fato foi puxado NÃO CORRESPONDER ao ID de quem solicitou a requisição
    // por segurança, erro: Arquivo não encontrado (ou o ID do dono do arquivo não era o mesmo de quem pediu)
    if (!arquivo_buscar) {
        console.log(caminho_do_arquivo)
        throw new AppError('Arquivo não encontrado', 404)
    }


    id_owner_arquivo = arquivo_buscar.id


    const pasta_raiz_do_cloud_atlas = process.env.ATLAS_CLOUD_PATH

    // caminho completo no disco
    const filePath = path.join(pasta_raiz_do_cloud_atlas, String(id_de_quem_chama), arquivo_buscar.caminho)


    // verifica se o arquivo existe no disco
    if (!fs.existsSync(filePath)) {
        throw new AppError('Arquivo não encontrado no servidor', 404);
    }


    return {
        path: filePath,
        originalName: arquivo_buscar.nome_original,
        mimeType: arquivo_buscar.tipo

    }

}


module.exports = {download_arquivo_service}