const AppError = require("../../../error/AppError")
const repo = require("./repo.login")
const bcrypt = require("bcrypt")
const jwt = require("jsonwebtoken")

const totp2fa = require("../2FA-logica/2falogica")


// pega o necessário para LOGS
const logLoginAttempt = require("./authLOGGER")


// colocar  depois a cada login, especificando usuário.
const {notifyAdmin} = require("../../../utils/telegram_notify")




const sendLoginAlertEmail = require("../email-LOGICA/emailService")




async function loginUser(user,senha, httpInfo) {
    
    if(typeof user !== "string" || user.trim().length === 0){
        throw new AppError("User ou Senha Inválidos")
    }

    if(typeof senha !== "string" || senha.trim().length === 0){
        throw new AppError("User ou Senha Inválidos")
    }



    // busca usuario

    const [usuario] = await repo.buscarUser(user)
    if(!usuario){
        logLoginAttempt.logLoginAttempt(usuario, httpInfo, "falha", "usuário errado")
        throw new AppError("Usuario ou Senha inválidos")
    }

    //valida senha
    const validacao = await bcrypt.compare(senha, usuario.senha_hash)
    if(!validacao){
        logLoginAttempt.logLoginAttempt(usuario, httpInfo, "falha", "senha errada")
        throw new AppError("Usuario ou Senha inválidos")
    }


    // nesse ponto ele já sabe user e senha - envia notificação para o email do usuario alertando sobre.
    logLoginAttempt.logLoginAttempt(usuario, httpInfo, "sucesso", "User e Senha corretos.")
    await sendLoginAlertEmail.sendLoginAlertEmail(usuario, httpInfo)



    // verifica se ele tem 2FA ativado

    // se ele não tiver configurado ainda, VALIDA O COOKIE E ENTREGA TOKEN
    // mas com uma mensagem que ele nao tem TOPT, frontend recebe e abre uma pagina pedindo para adicionar 2FA 
    // nesse  frontend faz requisição para GERAR 2fa
    if(usuario.totp !== "1"){
        const totpStatus = "falsetotp"

        // REFRESH TOKEN !!!
        const token = jwt.sign(
            {id:usuario.id},
            process.env.JWT_REFRESH_SECRET,
            {expiresIn: process.env.JWT_REFRESH_EXPIRES})

        // access TOKEN !!!!
        const acess_Token = jwt.sign(
            {id:usuario.id, role:usuario.role},
            process.env.JWT_SECRET,
            {expiresIn: process.env.JWT_EXPIRES})


        const refreshHash = await bcrypt.hash(token, 10)

        // verifica se EXISTE sessão no banco
        const [user_sessao] = await repo.buscar_sessao(usuario.id)


        // verifica todas as possibilidades
        // RTF_1 vazio, ou RTF_2 vazio, ou ambos vazios, ou ambos Preenchidos, ou não existe a sessão.

        if(!user_sessao){
            // se não tem sessão existente, cria RTF e coloca no RTF_1, deixando o 2 vazio.
            const expiresRefresh = new Date(Date.now() + 15 * 24 * 60 * 60 * 1000);
            await repo.criar_sessao_user(usuario.id, expiresRefresh, refreshHash)

            return {token, totpStatus, acess_Token}
        }


        // se não tiver RTF_1, e TIVER RTF_2 - coloca no vazio, sempre.
        if(!user_sessao.RTF_1 && user_sessao.RTF_2){
            // cria nova data de expiração 15 dias.
            const expiresRefresh = new Date(Date.now() + 15 * 24 * 60 * 60 * 1000);
            await repo.atualizar_RTF_1(usuario.id, refreshHash, expiresRefresh)

            return {token, totpStatus, acess_Token}

        }


        if(user_sessao.RTF_1 && !user_sessao.RTF_2){
            const expiresRefresh = new Date(Date.now() + 15 * 24 * 60 * 60 * 1000);
            await repo.atualizar_RTF_2(usuario.id, refreshHash, expiresRefresh)

            return {token, totpStatus, acess_Token}

        }

        if(!user_sessao.RTF_1 && !user_sessao.RTF_2){
            // se não tem sessão existente, cria RTF e coloca no RTF_1, deixando o 2 vazio.
            const expiresRefresh = new Date(Date.now() + 15 * 24 * 60 * 60 * 1000);
            await repo.atualizar_RTF_1(usuario.id, refreshHash, expiresRefresh)

            return {token, totpStatus, acess_Token}
        }


        if(user_sessao.RTF_1 && user_sessao.RTF_2){
            // faz lógica de quem é mais antigo , para substituir por esse novo refresh.
            const expiresRefresh = new Date(Date.now() + 15 * 24 * 60 * 60 * 1000);

            const maisAntigo = user_sessao.RTF_1_createdAt < user_sessao.RTF_2_createdAt
                    ? "RTF_1"
                    : "RTF_2";

    
            const nomeFuncao = `atualizar_${maisAntigo}`;

            await repo[nomeFuncao](usuario.id, refreshHash, expiresRefresh);
        
            return {token, totpStatus, acess_Token}

        }

        throw new AppError("Erro inesperado ao logar, tente novamente mais tarde.")

    }


    // gera token válido para fazer requisição com 2FA
    const totpStatus = "truetotp"

    const token = jwt.sign(
        {id:usuario.id, role:usuario.role},
        process.env.JWT_SECRET_LOGIN_INIT,
        {expiresIn: process.env.JWT_SECRET_LOGIN_INIT_EXPIRES})

    return {token, totpStatus, acess_Token}


}


module.exports = {
    loginUser,
}