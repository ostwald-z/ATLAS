
const service_listar_vault = require("./service.listar.vaults")


async function controller_listar_vault(req,res,next) {
    try{

        const id = req.user.id

        // Executa o service e recebe a array de strings
        const vaults_nomes = await service_listar_vault.service_listar_vault(id);

        // Envia a resposta no formato JSON esperado pelo frontend
        return res.status(200).json({
            vaults: vaults_nomes
        });

        
    }catch(erro){
        next(erro)
    }
}


module.exports = {controller_listar_vault}