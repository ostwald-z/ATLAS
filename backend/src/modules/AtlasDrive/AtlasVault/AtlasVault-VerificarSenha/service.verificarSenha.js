const AppError = require("../../../../error/AppError")

const repo = require("./repo.verificarSenha")

const bcrypt = require("bcrypt")


const jwt = require("jsonwebtoken")


async function service_verificar_senha_vault(id_user, role_user, senha_vault) {
    

    if(role_user !== "admin"){
        throw new AppError("Sem permissão", 403)
    }

    // busca a senha do cara no banco
    const [buscarSenhaUser] = await repo.buscarSenhDoUser(id_user)
    const senhaVaultUser = buscarSenhaUser.senha_hash_vault


    // caso ele esteja vazia a tabela dele
    if(!senhaVaultUser){
        throw new AppError("Sem senha registrada.")
    }

    // verifica se bate
    const validarSenha = await bcrypt.compare(senha_vault, senhaVaultUser)

    if(!validarSenha){
        throw new AppError("Senha Incorreta", 403)
    }



    const token_vault_drive = jwt.sign(
        {id:buscarSenhaUser.id, role:buscarSenhaUser.role, scope:"vault_drive_atlas"},
        process.env.JWT_SECRET_VAULT_DRIVE,
        {expiresIn: "10m"})


    return token_vault_drive;


}


module.exports = {service_verificar_senha_vault}