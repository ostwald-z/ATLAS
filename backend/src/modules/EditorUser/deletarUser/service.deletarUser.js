const AppError = require("../../../error/AppError")
const repo = require("./repo.deletarUser")


const logDeletarUser = require("./deletarLOGGER")

const {notifyAdmin} = require("../../../utils/telegram_notify")

async function deletarUser(id, httpInfo, id_autor) {
    
    const idLimpo = Number(id)

    if(isNaN(idLimpo)){
        logDeletarUser.deletarLogger("falha", "ID inválido", httpInfo, id, id_autor)
        throw new AppError("ID Inválido")
    }

    if(!Number.isInteger(idLimpo) || id <= 0){
        logDeletarUser.deletarLogger("falha", "ID inválido", httpInfo, id, id_autor)
        throw new AppError("ID inválido")
    }

    const resultado = await repo.deletarUser(idLimpo)
    
    if(resultado.affectedRows === 0){
        logDeletarUser.deletarLogger("falha", "ID não encontrado", httpInfo, id, id_autor)
        throw new AppError("ID colocado não foi encontrado")
    }


    const [usuario] = repo.buscarUser(id)
    const [autor] = repo.buscarUser(id_autor)

    
    logDeletarUser.deletarLogger("sucesso", "Deletou usuário corretamente.", httpInfo, id, id_autor)

    // NOTIFICA VIA TELEGRAM.
    notifyAdmin(`🚀 <b>NOVO LOG DE SISTEMA: Deletar Usuário</b>
--------------------------
<b>SISTEMA:</b> Atlas System
<b>AÇÃO:</b> Deletar Usuário
<b>USUÁRIO:</b> ${id} -- ${usuario.user}
<b>STATUS:</b> Sucesso
<b>AUTOR:</b> ${id_autor} -- ${autor.user}

<b>Origem da ação:</b>
IP: ${httpInfo?.ip}
Localização: ${httpInfo?.location}

<pre> userAgent: ${httpInfo?.userAgent}</pre>
--------------------------

<i> 📅 Enviado em: ${new Date().toLocaleString('pt-BR')} </i>

`)


    
    return resultado;
}


module.exports = {deletarUser}