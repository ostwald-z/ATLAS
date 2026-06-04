const AppError = require("../../../error/AppError")


const path = require('path')
const fs = require("fs");

async function download_arquivo_service(caminho_do_arquivo, id_de_quem_chama) {
    

    // frontend chama sempre /arquivo, ou /pasta1/arquivo.txt - no banco, os caminhos dos arquivos SEMPRE começam SEM /
    // começam apenas com o nome direto.

    const caminho_do_arquivo_limpo = caminho_do_arquivo.replace(/^\//, '');

    //const [arquivo_buscar] = await repo_download.buscar_arquivo_sql(caminho_do_arquivo_limpo, id_de_quem_chama)


    //id_owner_arquivo = arquivo_buscar.id


    const pasta_raiz_do_cloud_atlas = process.env.ATLAS_CLOUD_PATH

    const pasta_base_usuario = path.join(pasta_raiz_do_cloud_atlas, String(id_de_quem_chama))

    // caminho completo no disco
    const filePath = path.join(pasta_base_usuario, caminho_do_arquivo_limpo)

    if(!filePath.startsWith(pasta_base_usuario)){
        throw new AppError("Não autorizado", 403)
    }

    // verifica se o arquivo existe no disco
    if (!fs.existsSync(filePath)) {
        throw new AppError('Arquivo não encontrado no servidor', 404);
    }



    // nome do arquivo
    const nomeArquivo = path.basename(filePath)

    // extensão
    const extensao = path.extname(filePath)

    // mime type
    //const mimeType = mime.lookup(filePath) || 'application/octet-stream'



    return {
        path: filePath,
        originalName: nomeArquivo,
        mimeType: extensao

    }

}


module.exports = {download_arquivo_service}