const service_download = require("./service_download")

const fs = require("fs")

async function controller_download_arq(req, res, next) {
    try{

        const id_usuario = req.user.id

        const {caminho_arquivo} = req.body

        const arquivo = await service_download.download_arquivo_service(caminho_arquivo, id_usuario)

        const stat = fs.statSync(arquivo.path);

        // HEADERS IMPORTANTES
        res.setHeader('Content-Length', stat.size);
        res.setHeader('Content-Type', 'application/octet-stream');
        res.setHeader(
          'Content-Disposition',
          `attachment; filename="${arquivo.originalName}"`
        );

        // STREAM DO ARQUIVO
        const stream = fs.createReadStream(arquivo.path);
        stream.pipe(res);

    }catch(erro){
        console.log("ERRO NO DOWNLOAD DE ARQUIVO (controler catch): ", erro)
        next(erro)
    }
}


module.exports = {controller_download_arq}