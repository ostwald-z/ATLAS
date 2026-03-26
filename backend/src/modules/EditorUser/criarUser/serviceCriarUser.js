const repo = require("./repoCriarUser")
const AppError = require("../../../error/AppError")
const bcrypt = require("bcrypt")
const validator = require("validator")


async function criarUser(user,senha,email, MagicWordCriar,MagicWordRole, obs, chaveNoPending) {
    
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

    //cria Interruptor para NoPending
    const noPendingkey = [] //pode ser VAZIO ou true ---


    //verifica se o usuário ACIONOU o NoPending
    if(typeof chaveNoPending === "string" && chaveNoPending.trim().length > 0){
        //padroniza a chave e verifica
        const NoPending = chaveNoPending.trim()

        const verificaChavePending = await bcrypt.compare(NoPending, process.env.CHAVE_NOPENDING)
        if(!verificaChavePending){
            throw new AppError("Algumas das chaves está errada.", 401)
        }

        noPendingkey.push("true")
    }


    //padronizando valores pra validação
    const senhaLimpa = senha.trim()
    const emailLimpo = email.trim()
    const userLimpo = user.trim()


    //verifica se usuario E email já existem
    const [verificaUser] = await repo.buscarUser(userLimpo)
    if(verificaUser){
        throw new AppError("Usuário já existente")
    }

    const [verificaEmail] = await repo.buscarEmail(emailLimpo)
    if(verificaEmail){
        throw new AppError("Email já existente")
    }


    //valida user, email e senha
    if(userLimpo.length < 3){
        throw new AppError("Min 3 caracteres para nome de Usuário")
    }

    if(!validator.isEmail(emailLimpo)){
        throw new AppError("Email inválido")
    }

    if(!validator.isStrongPassword(senhaLimpa)){
        throw new AppError("Senha Fraca: Min 8 caracteres, 1 caixa alta, 1 caixa baixa, 1 número, 1 símbolo")
    }



    //validar palavras magicas

    if(typeof MagicWordRole !== "string" || typeof MagicWordCriar !== "string"){
        throw new AppError("Palavra Mágica inválida")
    }

    if(MagicWordCriar.trim().length === 0){
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
                throw new AppError("Algumas das chaves está errada.", 401)
            }

            const validacaoWordCriar = await bcrypt.compare(MagicWordCriarLIMPA, process.env.MAGIC_WORD_CRIAR)
            if(!validacaoWordCriar){
                throw new AppError("Algumas das chaves está errada.", 401)
            }

            //SE O PENDING KEY TIVE CONTEUDO (true) ELE CRIA DIRETO, não envia pra aprovação
            if(noPendingkey.length > 0){
                const criarUser = await repo.criarUser(userLimpo, senhaHash, emailLimpo, "admin", obs)
                return criarUser;
            }

            const resultado = await repo.enviarParaAprovacao(userLimpo, senhaHash,emailLimpo, "admin", obs)
            return resultado;

        }
    }
    
    //validar palavra mágica para criar USER
    const verificarWordCriar = await bcrypt.compare(MagicWordCriarLIMPA, process.env.MAGIC_WORD_CRIAR)
    if(!verificarWordCriar){
        throw new AppError("Algumas das chaves está errada.", 401)
    }

    //SE O PENDING KEY TIVE CONTEUDO (true) ELE CRIA DIRETO, não envia pra aprovação
    if(noPendingkey.length > 0){
        const criarUser = await repo.criarUser(userLimpo, senhaHash, emailLimpo, "user", obs)
        return criarUser;
    }

    const resultado = await repo.enviarParaAprovacao(userLimpo, senhaHash, emailLimpo, "user", obs)
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