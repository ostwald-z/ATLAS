const AppError = require("../error/AppError")


function validarBody(schema){
    return (req,res,next) => {
        try{

            req.body = schema.parse(req.body)
            next()

        }catch(erro){
            console.log(req.body)
            throw new AppError("Body Inválido")
        }
    }
}

module.exports = {validarBody}