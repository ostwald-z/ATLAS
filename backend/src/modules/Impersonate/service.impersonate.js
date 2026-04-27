const AppError = require("../../error/AppError")
const repo = require("./repo.impersonate")
const bcrypt = require("bcrypt")
const jwt = require("jsonwebtoken")


const logImpersonate = require("./impersonateLOGGER")


const {notifyAdmin} = require("../../utils/telegram_notify")


async function impersonate(id, chave, httpInfo) {
 
    const idLimpo = Number(id)

    if(isNaN(idLimpo)){
        logImpersonate.impersonateLogger("falha", "ID inválido", httpInfo, id)
        throw new AppError("ID inválido")
    }

    if(!Number.isInteger(idLimpo) || idLimpo <= 0){
        logImpersonate.impersonateLogger("falha", "ID inválido", httpInfo, id)
        throw new AppError("ID inválido")
    }

    const verificarChave = await bcrypt.compare(chave, process.env.CHAVE_IMPERSONATE)
    if(!verificarChave){
        logImpersonate.impersonateLogger("falha", "CHAVE IMPERSONATE incorreta", httpInfo, id)
        throw new AppError("Chave Impersonate INVÁLIDA")
    }

    const [usuarioID] = await repo.buscarID(idLimpo)
    if(usuarioID){

        const token = jwt.sign({
            id: usuarioID.id, role: usuarioID.role
        }, process.env.JWT_SECRET, {expiresIn: process.env.JWT_EXPIRES})
        
        logImpersonate.impersonateLogger("sucesso", "Tudo foi colocado certo, token normal sistema criado", httpInfo, id)


        // NOTIFICA VIA TELEGRAM.
        notifyAdmin(`🚀 <b>NOVO LOG DE SISTEMA: Impersonate</b>
    --------------------------
    <b>SISTEMA:</b> Atlas System
    <b>AÇÃO:</b> Impersonate
    <b>USUÁRIO:</b> ${idLimpo} -- ${usuarioID.user}
    <b>STATUS:</b> Sucesso


    <b>Origem da ação:</b>
    IP: ${httpInfo?.ip}
    Localização: ${httpInfo?.location}

    <pre> userAgent: ${httpInfo?.userAgent} </pre>
    --------------------------
    
    <i> 📅 *Enviado em: ${new Date().toLocaleString('pt-BR')} </i>

    `)

        return token;
    }

    logImpersonate.impersonateLogger("falha", "ID não encontrado | impersonate KEY correta", httpInfo, id)
    throw new AppError("Nenhum Usuário/ID foi encontrado para Login", 404)
}

module.exports = {impersonate}