const AppError = require("../error/AppError")


function checkRoles(permitidasRoles = []){
    return (req,res,next) => {
        try{

            if(!permitidasRoles.includes(req.user.role)){
                return res.status(403).json({
                    erro: "Permissão Negada"
                })
            }

            next();

           

        }catch(erro){
            console.log("ERRO DESCONHECIDO: " + erro.message)
            res.status(500).json({
                erro: "Erro Interno"
            })
        }
    }
}


module.exports = checkRoles;