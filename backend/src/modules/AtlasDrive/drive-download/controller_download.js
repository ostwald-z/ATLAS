const service_download = require("./service_download");

const fs = require("fs");
const path = require("path");

async function controller_download_arq(req, res, next) {
    try {
        const id_usuario = req.user.id;

        // tenta body se for preview, ou editar txt, ou visualizar.
        const {caminho_arquivo} = req.body
        
        console.log("CHEGOU controller download, caminho: ", caminho_arquivo) 


        const arquivo = await service_download.download_arquivo_service(
            caminho_arquivo,
            id_usuario
        );

        const stat = fs.statSync(arquivo.path);

        // 🔹 HEADERS IMPORTANTES
        res.setHeader("Content-Length", stat.size);
        res.setHeader("Content-Type", "application/octet-stream");
        res.setHeader(
            "Content-Disposition",
            `attachment; filename="${arquivo.originalName}"`
        );

        // 🔹 (OPCIONAL mas recomendado)
        res.setHeader("Accept-Ranges", "bytes");

        // 🔹 STREAM DO ARQUIVO 
        const stream = fs.createReadStream(arquivo.path);

        stream.pipe(res);

        // 🔹 tratamento de erro do stream 
        stream.on("error", (err) => {
            console.error("Erro no stream:", err);
            if (!res.headersSent) {
                res.status(500).end();
            }
        });

    } catch (erro) {
        console.log("ERRO NO DOWNLOAD DE ARQUIVO (controller catch): ", erro);
        next(erro);
    }
}

module.exports = { controller_download_arq };