
const service_listar_sub = require("./service_listarsubPastas")

async function listar_sub_pastas(req, res, next) {
    
    try{

        const user_id = req.user.id

        // se não vier nada → vira raiz
        const subpath = req.query.path || "";
      

        const resultado = await service_listar_sub(user_id, subpath)


        res.status(200).json({
            "pasta atual": subpath || "/",
            "arquivos": resultado
        })





    }catch(erro){
        next(erro)
    }

}


module.exports = {listar_sub_pastas}