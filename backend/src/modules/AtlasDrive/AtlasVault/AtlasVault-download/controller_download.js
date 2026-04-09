const service_download = require("./service_download")

const fs = require("fs")

async function controller_download_vault(req, res, next) {
    try{

        const {caminho_arquivo} = req.body

        const arquivo = await service_download.download_arquivo_service_vault(caminho_arquivo)

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


module.exports = {controller_download_vault}