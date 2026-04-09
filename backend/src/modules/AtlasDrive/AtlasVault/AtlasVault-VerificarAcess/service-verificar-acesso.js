
const AppError = require("../../../../error/AppError")

const bcrypt = require("bcrypt")

async function service_verificar_acesso_vault(role_user, codigo) {
    
    //verifica se é admin
    if(role_user !== "admin"){
        throw new AppError("Código errado OU não tem permissão.", 403)
    }



    // verifica o codigo se está correto



    const validarCodigoInicial = await bcrypt.compare(codigo, process.env.CODIGO_INICIAL_VAULT)



    if(!validarCodigoInicial){
        console.log("ERRO, senha errada ")
        throw new AppError("Código errado OU não tem permissão.", 403)
    }
    

    return
}


module.exports = {service_verificar_acesso_vault}