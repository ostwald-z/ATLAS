const AppError = require("../../../error/AppError")
const repo = require("./repocriar2fa")
const totp2fa = require("../2FA-logica/2falogica")

async function criar_2fa_service(id_user) {
    
    if(!id_user){
        throw new AppError("Identificação ausente")
    }

    //busca o USUARIO do cara , apenas para melhor UX
    const [usuario] = await repo.buscarUser(id_user)

    // VERIFICA se o animal já não tem 2FA ativado
    if(usuario.totp !== "0"){
        throw new AppError("Você já tem 2FA ativado, não pode criar outro")
    }


    //gera a porra da seed
    const seed = totp2fa.generateSecret()

    const user_User = usuario.user

    const {qrCode} = await totp2fa.generateQRCode(seed, user_User, appName = 'ATLAS System')


    // liga o 2FA no banco
    await repo.ligarTOTP_user_banco(id_user)


    //guarda seed do user no banco
    await repo.colocar_SEED_no_usuario_banco(id_user, seed)



    //retorna base64 para printar QRcode na tela
    return qrCode


}

module.exports = {criar_2fa_service}