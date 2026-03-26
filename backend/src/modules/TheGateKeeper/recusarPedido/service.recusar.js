const AppError = require("../../../error/AppError")
const repo = require("./repo.recusar")

async function deletarForm(id) {
    const idLimpo = Number(id)

    if(isNaN(idLimpo)){
        throw new AppError("ID inválido")
    }

    if(!Number.isInteger(idLimpo) || idLimpo <= 0){
        throw new AppError("ID inválido")
    }

    const resultado = await repo.deletarForm(idLimpo)
    if(resultado.affectedRows === 0){
        throw new AppError("Formulário não encontrado para deletar com base no ID fornecido")
    }

    return resultado;

}

module.exports = {deletarForm}