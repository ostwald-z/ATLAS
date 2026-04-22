const repo = require("./repoCriarUser")
const AppError = require("../../../error/AppError")
const bcrypt = require("bcrypt")
const validator = require("validator")

const logCreateAttemptive = require("./loggerCREATE")



async function criarUser(user,senha,email, MagicWordCriar,MagicWordRole, obs, chaveNoPending, nome_completo, httpInfo) {
    

    if(typeof user !== "string" || user.trim().length === 0){
        throw new AppError("Usuario inválido para criar usuário")
    }

    if(typeof senha !== "string" || senha.trim().length === 0){
        throw new AppError("Senha inválida para criar usuário")
    }

    if(typeof email !== "string" || email.trim().length === 0){
        throw new AppError("Email inválido para criar usuário")
    }

    if(typeof obs !== "string" || obs.trim().length === 0){
        throw new AppError("Observação inválida")
    }

    if(typeof nome_completo !== "string" || nome_completo.trim().length === 0){
        throw new AppError("Nome inválido.")
    }

    //cria Interruptor para NoPending
    const noPendingkey = [] //pode ser VAZIO ou true ---


    //verifica se o usuário ACIONOU o NoPending
    if(typeof chaveNoPending === "string" && chaveNoPending.trim().length > 0){
        //padroniza a chave e verifica
        const NoPending = chaveNoPending.trim()

        const verificaChavePending = await bcrypt.compare(NoPending, process.env.CHAVE_NOPENDING)
        if(!verificaChavePending){
            logCreateAttemptive.logCreateAttemptive("falha", "Chave NoPending está errada", httpInfo, user, email, nome_completo, obs, MagicWordRole, MagicWordCriar, chaveNoPending)
            throw new AppError("Algumas das chaves está errada.", 401)
        }

        noPendingkey.push("true")
    }


    //padronizando valores pra validação
    const senhaLimpa = senha.trim()
    const emailLimpo = email.trim()
    const userLimpo = user.trim()
    const nome_comp_limpo = nome_completo.trim()


    //verifica se usuario E email já existem
    const [verificaUser] = await repo.buscarUser(userLimpo)
    if(verificaUser){
        logCreateAttemptive.logCreateAttemptive("falha", "Usuário já existente", httpInfo, user, email, nome_completo, obs, MagicWordRole, MagicWordCriar, chaveNoPending)
        throw new AppError("Usuário já existente")
    }


    const [verificaEmail] = await repo.buscarEmail(emailLimpo)
    if(verificaEmail){
        logCreateAttemptive.logCreateAttemptive("falha", "Email já existente", httpInfo, user, email, nome_completo, obs, MagicWordRole, MagicWordCriar, chaveNoPending)
        throw new AppError("Email já existente")
    }


    //valida user, email senha e nome completo
    if(userLimpo.length < 3){
        logCreateAttemptive.logCreateAttemptive("falha", "Mínimo 3 caracteres de USER", httpInfo, user, email, nome_completo, obs, MagicWordRole, MagicWordCriar, chaveNoPending)
        throw new AppError("Min 3 caracteres para nome de Usuário")
    }

    if(!validator.isEmail(emailLimpo)){
        logCreateAttemptive.logCreateAttemptive("falha", "email inválido", httpInfo, user, email, nome_completo, obs, MagicWordRole, MagicWordCriar, chaveNoPending)
        throw new AppError("Email inválido")
    }

    if(emailLimpo.length > 140){
        logCreateAttemptive.logCreateAttemptive("falha", "email muito grande", httpInfo, user, email, nome_completo, obs, MagicWordRole, MagicWordCriar, chaveNoPending)
        throw new AppError("Email muito grande.")
    }

    if(senhaLimpa.length > 200){
        logCreateAttemptive.logCreateAttemptive("falha", "senha muito grande", httpInfo, user, email, nome_completo, obs, MagicWordRole, MagicWordCriar, chaveNoPending)
        throw new AppError("Senha muito grande")
    }

    if(!validator.isStrongPassword(senhaLimpa)){
        logCreateAttemptive.logCreateAttemptive("falha", "senha fraca", httpInfo, user, email, nome_completo, obs, MagicWordRole, MagicWordCriar, chaveNoPending)
        throw new AppError("Senha Fraca: Min 8 caracteres, 1 caixa alta, 1 caixa baixa, 1 número, 1 símbolo")
    }

    if(nome_comp_limpo.length > 100){
        logCreateAttemptive.logCreateAttemptive("falha", "Nome e Sobrenome muito grande", httpInfo, user, email, nome_completo, obs, MagicWordRole, MagicWordCriar, chaveNoPending)
        throw new AppError("Nome muito grande.")
    }



    //validar palavras magicas

    if(typeof MagicWordRole !== "string" || typeof MagicWordCriar !== "string"){
        logCreateAttemptive.logCreateAttemptive("falha", "Role KEY inválida no formato", httpInfo, user, email, nome_completo, obs, MagicWordRole, MagicWordCriar, chaveNoPending)
        throw new AppError("Palavra Mágica inválida")
    }

    if(MagicWordCriar.trim().length === 0){
        logCreateAttemptive.logCreateAttemptive("falha", "Criar KEY inválida no formato", httpInfo, user, email, nome_completo, obs, MagicWordRole, MagicWordCriar, chaveNoPending)
        throw new AppError("Magic Word para Criar está inválida", 401)
    }


    const senhaHash = await bcrypt.hash(senhaLimpa, 10)

    //padroniza para comparar
    const MagicWordRoleLIMPA = MagicWordRole.trim()
    const MagicWordCriarLIMPA = MagicWordCriar.trim()


    if(typeof MagicWordRole === "string"){

        //valida a magicWord
        if(MagicWordRole.trim().length > 0){


            const validacaoWordRole = await bcrypt.compare(MagicWordRoleLIMPA, process.env.MAGIC_WORD_ROLE)
            if(!validacaoWordRole){
                logCreateAttemptive.logCreateAttemptive("falha", "Role KEY incorreta para criar ADMIN", httpInfo, user, email, nome_completo, obs, MagicWordRole, MagicWordCriar, chaveNoPending)
                throw new AppError("Algumas das chaves está errada.", 401)
            }

            const validacaoWordCriar = await bcrypt.compare(MagicWordCriarLIMPA, process.env.MAGIC_WORD_CRIAR)
            if(!validacaoWordCriar){
                logCreateAttemptive.logCreateAttemptive("falha", "Criar KEY incorreta para criar ADMIN - ROLE KEY correto", httpInfo, user, email, nome_completo, obs, MagicWordRole, MagicWordCriar, chaveNoPending)
                throw new AppError("Algumas das chaves está errada.", 401)
            }

            //SE O PENDING KEY TIVE CONTEUDO (true) ELE CRIA DIRETO, não envia pra aprovação
            if(noPendingkey.length > 0){
                logCreateAttemptive.logCreateAttemptive("sucesso", "USOU NO PENDING e ROLE KEY corretos", httpInfo, user, email, nome_completo, obs, MagicWordRole, MagicWordCriar, chaveNoPending)
                const criarUser = await repo.criarUser(userLimpo, senhaHash, emailLimpo, "admin", obs, nome_completo)
                return criarUser;
            }

            logCreateAttemptive.logCreateAttemptive("sucesso", "usou ROLE KEY correto.", httpInfo, user, email, nome_completo, obs, MagicWordRole, MagicWordCriar, chaveNoPending)
            const resultado = await repo.enviarParaAprovacao(userLimpo, senhaHash,emailLimpo, "admin", obs, nome_completo)
            return resultado;

        }
    }
    
    //validar palavra mágica para criar USER
    const verificarWordCriar = await bcrypt.compare(MagicWordCriarLIMPA, process.env.MAGIC_WORD_CRIAR)
    if(!verificarWordCriar){
        logCreateAttemptive.logCreateAttemptive("falha", "criar KEY está incorreta para criar USER", httpInfo, user, email, nome_completo, obs, MagicWordRole, MagicWordCriar, chaveNoPending)
        throw new AppError("Algumas das chaves está errada.", 401)
    }

    //SE O PENDING KEY TIVE CONTEUDO (true) ELE CRIA DIRETO, não envia pra aprovação
    if(noPendingkey.length > 0){
        logCreateAttemptive.logCreateAttemptive("falha", "noPedingKEY incorreta para criar USER", httpInfo, user, email, nome_completo, obs, MagicWordRole, MagicWordCriar, chaveNoPending)
        const criarUser = await repo.criarUser(userLimpo, senhaHash, emailLimpo, "user", obs, nome_completo)
        return criarUser;
    }


    logCreateAttemptive.logCreateAttemptive("sucesso", "Enviou formulário normal corretamente, com CRIAR KEY correto - sem chave atlas especial", httpInfo, user, email, nome_completo, obs, MagicWordRole, MagicWordCriar, chaveNoPending)
    const resultado = await repo.enviarParaAprovacao(userLimpo, senhaHash, emailLimpo, "user", obs, nome_completo)
    return resultado;
}







async function validarNoPending(chaveNoPending) {
    
    if(typeof chaveNoPending === "string" && chaveNoPending.trim().length > 0){
        //padroniza a chave
        const NoPending = chaveNoPending.trim()

        const validarChave = await bcrypt.compare(NoPending, process.env.CHAVE_NOPENDING)
        if(!validarChave){

            return "nao"
        }
        return "sim";
    }

    return "nao"
}


module.exports = {criarUser, validarNoPending}