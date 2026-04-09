
const service_listar_sub = require("./service_listarPastas")

async function listar_pastas_vault(req, res, next) {
    
    try{

        // se não vier nada → vira raiz
        const subpath = req.query.path || "";
        
        const {scope} = req.VaultAcessToken

        

        const resultado = await service_listar_sub(scope, subpath)


        res.status(200).json({
            "pasta atual": subpath || "/",
            "arquivos": resultado
        })



    }catch(erro){
        next(erro)
    }

}


module.exports = {listar_pastas_vault}