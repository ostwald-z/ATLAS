const AppError = require("../../../error/AppError")
const repo = require("./repo.recusar")


const {notifyAdmin} = require("../../../utils/telegram_notify")

async function deletarForm(id, httpInfo) {
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


    const [autor] = await repo.buscarID(id_autor)

    // NOTIFICA VIA TELEGRAM.
    notifyAdmin(`🚀 <b>NOVO LOG DE SISTEMA: Formulário Recusado</b>
--------------------------
<b>SISTEMA:</b> Atlas System
<b>AÇÃO:</b> ❌ Pedido pendente de criar usuário RECUSADO
<b>USUÁRIO:</b> ${id}
<b>STATUS:</b> Sucesso
<b>AUTOR:</b> ${id_autor} -- ${autor.user}

<b>Origem da ação:</b>
IP: ${httpInfo?.ip}
Localização: ${httpInfo?.location}

<pre> userAgent: ${httpInfo?.userAgent} </pre>
--------------------------

<i> 📅 *Enviado em: ${new Date().toLocaleString('pt-BR')} </i>

`)

    return resultado;

}

module.exports = {deletarForm}