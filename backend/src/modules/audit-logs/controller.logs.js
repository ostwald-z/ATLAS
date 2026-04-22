const service_listarLogs = require("./serviceListarLogs")


async function controller_listarLogs(req,res,next) {
    try{

        const nome_log_arquivo = req.params.log

        const resultado = await service_listarLogs.service_listarlogs(nome_log_arquivo)

        // Define o tipo como texto e envia apenas a string
        res.setHeader('Content-Type', 'text/plain'); 
        res.status(200).send(resultado); 

    }catch(erro){
        next(erro)
    }
}

module.exports = {controller_listarLogs}