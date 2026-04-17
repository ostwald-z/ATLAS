const AppError = require("../../../error/AppError")
const repo = require("./repo.UpdateUser")
const validator = require("validator")
const bcrypt = require("bcrypt")

//fazer patch aqui

async function updateUser(user,email,senha, obs, roleEdit, roleToken, id, idUser) {
    const campos = []
    const valores = []


    const idLimpo = Number(id)

    if(isNaN(idLimpo)){
        throw new AppError("ID Inválido")
    }

    if(!Number.isInteger(idLimpo) || idLimpo <= 0){
        throw new AppError("ID inválido")
    }


    //VERIFICA SE ELE QUER ATUALIZAR O PROPRIO USUARIO OU OUTRO ALGUEM
    //apenas deixar outro alguem, se ele for admin
    if(idLimpo !== idUser){
        //verifica se ele é ADMIN para deixar algo deste tipo
        if(roleToken !== "admin"){
            throw new AppError("Você não tem permissão para atualizar OUTRO usuário, ah não ser o seu!. (SEU ID: " + idUser + ")")
        }
    }



    if (typeof user === "string" && user.trim().length > 0){
        //padroniza user
        const userLimpo = user.trim()

        if(userLimpo.length < 3){
            throw new AppError("Caracteres MIN para usuario: 3")
        }

        if(userLimpo.length > 100){
            throw  new AppError("Limite de caracteres: 100 para usuario")
        }

        //verifica se ja existe ou nao o User
        const [verificaUser] = await repo.buscarUser(userLimpo)

        if(verificaUser && verificaUser.id !== idLimpo){
            throw new AppError("Usuário já existente", 409)
        }

        campos.push("user = ?")
        valores.push(userLimpo)
    }


    if(typeof email === "string" && email.trim().length > 0){
        //padronizo email
        const emailLimpo = email.trim()

        if(!validator.isEmail(emailLimpo)){
            throw new AppError("Email Inválido")
        }

        //verifica se já existe email
        const [verificaEmail] = await repo.buscarEmail(emailLimpo)
        if(verificaEmail && verificaEmail.id !== idLimpo){
            throw new AppError("Email já existente", 409)
        }

        campos.push("email = ?")
        valores.push(emailLimpo)
    }


    if(typeof senha === "string" && senha.trim().length > 0){
        //padroniza
        const senhaLimpa = senha.trim()


        // ELE SÓ VERIFICA A SENHA, SE QUEM ESTÁ EDITANDO FOR USUÁRIO E NAO ADMIN
        // ISSO DA LIBERDADE PARA O ADMIN ESCOLHER A SENHA QUE ELE QUISER - ELE SABE OQUE ESTÁ FAZENDO 
        if(roleToken !== "admin"){
            if(!validator.isStrongPassword(senhaLimpa)){
                throw new AppError("Senha fraca: min 8 caracteres, 1 caixa alta, 1 caixa baixa,  1 número, 1 símbolo EX: (!@#$%&)")
            }
        }

        const senhaHash = await bcrypt.hash(senhaLimpa, 10)
        campos.push("senha_hash = ?")
        valores.push(senhaHash)
    }

    if(typeof obs === "string" && obs.trim().length > 0){
        campos.push("obs = ?")
        valores.push(obs)
    }



    if(typeof roleEdit === "string" && roleEdit.trim().length > 0){
        //verifica se o cara tem PERMISSÃO para mudar o privilégio de alguém

        if(roleEdit !== "user"){
            if(roleToken !== "admin"){
            throw new AppError("Você não tem permissão para mudar seu privilégio.", 403)
        }}


        campos.push("role = ?")
        valores.push(roleEdit)
        valores.push(idLimpo)

        const resultado = await repo.updateUser(campos, valores)
        if(resultado.affectedRows === 0){
            throw new AppError("ID não encontrado, nenhuma mudança feita.")
        }

        return resultado;

    }



    if(campos.length === 0){
        throw new AppError("Nenhum campo Válido para atualizar")
    }

    valores.push(idLimpo)

    const resultado = await repo.updateUser(campos, valores)
    if(resultado.affectedRows === 0){
        throw new AppError("ID não encontrado, nenhuma mudança feita.")
    }

    return resultado;
}



module.exports = {updateUser}