const repo = require("./repo.editarPedido")
const AppError = require("../../../error/AppError")
const bcrypt = require("bcrypt")
const validator = require("validator")

async function updateForm(user, email, senha, obs, role, id, nome_completo) {
    
    const campos = []
    const valores = []


    if(typeof user === "string" && user.trim().length > 0){
        //padroniza o user
        const userLimpo = user.trim()

        const [verificaUser] = await repo.buscarUser(userLimpo)
        if(verificaUser){
            throw new AppError("Usuário já existente")
        }

        campos.push("user = ?")
        valores.push(userLimpo)

    }


    if(typeof email === "string" && email.trim().length > 0){
        //padroniza email
        const emailLimpo = email.trim()

        if(!validator.isEmail(emailLimpo)){
            throw new AppError("Email inválido")
        }

        const [verificaEmail] = await repo.buscarEmail(emailLimpo)
        if(verificaEmail){
            throw new AppError("Email já existente")
        }

        campos.push("email = ?")
        valores.push(emailLimpo)

    }

    if(typeof senha === "string" && senha.trim().length > 0){
        //padroniza senha
        const senhaLimpa = senha.trim()

        const senhaHash = await bcrypt.hash(senhaLimpa, 10)

        campos.push("senha_hash = ?")
        valores.push(senhaHash)
    }


    if(typeof obs === "string" && obs.trim().length > 0){
        campos.push("obs = ?")
        valores.push(obs)
    }

    if(typeof role === "string" && role.trim().length > 0){
        //padroniza
        const roleLimpa = role.trim()
        const listaRolesPermitidas = ["user", "admin"]

        if(!listaRolesPermitidas.includes(roleLimpa)){
            throw new AppError("Privilégio não existente, apenas decida entre: user | admin")
        }

        campos.push("role = ?")
        valores.push(roleLimpa)
    }


    if(typeof nome_completo === "string" && nome_completo.trim().length > 0){

        //PADRONIZA

        const nome_comp_limpo = nome_completo.trim()

        if(nome_comp_limpo.length > 100){
            throw new AppError("Nome e Sobrenome maiores que o permitido")
        }

        campos.push("nome_completo = ?")
        valores.push(nome_comp_limpo)
    }


    if(campos.length === 0){
        throw new AppError("NADA válido para atualizar o Formulário")
    }

    valores.push(id)

    const resultado = await repo.updateForm(campos, valores)
    if(resultado.affectedRows === 0){
        throw new AppError("ID não encontrado para atualizar Formulário", 404)
    }

    return resultado;
}


module.exports = {
    updateForm
}