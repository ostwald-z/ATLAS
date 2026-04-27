const AppError = require("../../../error/AppError")
const repo = require("./repo.UpdateUser")
const validator = require("validator")
const bcrypt = require("bcrypt")

const logUpdate = require("./updateLOGGER")


const {notifyAdmin} = require("../../../utils/telegram_notify")


//fazer patch aqui

async function updateUser(user,email,senha, obs, roleEdit, roleToken, id, idUser, nome_completo, httpInfo) {

    const campos = []
    const valores = []
    const changes = [];

    const idLimpo = Number(id)

    if(isNaN(idLimpo)){
        throw new AppError("ID Inválido")
    }

    if(!Number.isInteger(idLimpo) || idLimpo <= 0){
        throw new AppError("ID inválido")
    }


    const [usuarioAntes] = await repo.buscarPorId(idLimpo);

    if (!usuarioAntes) {
    logUpdate.logUpdate({
        status: "falha",
        detalhes: "ID não encontrado",
        actorId: idUser,
        targetId: id,
        httpInfo,
    });

    throw new AppError("ID não encontrado");
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


        if (userLimpo !== usuarioAntes.user) {
            changes.push({
                field: "user",
                before: usuarioAntes.user,
                after: userLimpo,
            });

            campos.push("user = ?");
            valores.push(userLimpo);
        }

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


        if (emailLimpo !== usuarioAntes.email) {
            changes.push({
                field: "email",
                before: usuarioAntes.email,
                after: emailLimpo,
            });

            campos.push("email = ?");
            valores.push(emailLimpo);
        }
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

        changes.push({
            field: "senha",
            before: "HASH_OCULTADO",
            after: "HASH_OCULTADO",
        });

    }

    if(typeof obs === "string" && obs.trim().length > 0){

        if (obs !== usuarioAntes.obs) {
            changes.push({
                field: "obs",
                before: usuarioAntes.obs,
                after: obs,
            });

            campos.push("obs = ?");
            valores.push(obs);
        }
        
    }


    if(typeof nome_completo === "string" && nome_completo.trim().length > 0){

        //padronizo nome completo
        const nome_completo_limpo = nome_completo.trim()

        if (nome_completo_limpo !== usuarioAntes.nome_completo) {
            changes.push({
                field: "nome_completo",
                before: usuarioAntes.nome_completo,
                after: nome_completo_limpo,
            });

            campos.push("nome_completo = ?");
            valores.push(nome_completo_limpo);
        }
    }



    if(typeof roleEdit === "string" && roleEdit.trim().length > 0){
        //verifica se o cara tem PERMISSÃO para mudar o privilégio de alguém

        if(roleEdit !== "user"){
            if(roleToken !== "admin"){
                logUpdate.logUpdate({
                    status: "falha",
                    detalhes: "Não tem permissão para mudar o privilégio de alguêm",
                    actorId: idUser,
                    targetId: idLimpo,
                    changes: [],
                    httpInfo,
                });
                throw new AppError("Você não tem permissão para mudar seu privilégio.", 403)
            }

        }


        if (roleEdit !== usuarioAntes.role) {
            changes.push({
                field: "role",
                before: usuarioAntes.role,
                after: roleEdit,
            });
        }


        // se chegou aqui, então DE FATO, a role é ADMIN - e o usuário É ADMIN para fazer isso
        // do contrário, executa outro IF, não esse de admin
        if(roleEdit !== "user"){

            campos.push("role = ?")
            valores.push(roleEdit)
            valores.push(idLimpo)


            const resultado = await repo.updateUser(campos, valores)
            if(resultado.affectedRows === 0){

                logUpdate.logUpdate({
                    status: "falha",
                    detalhes: "ID não encontrado",
                    actorId: idUser,
                    targetId: idLimpo,
                    changes: [],
                    httpInfo,
                });
                throw new AppError("ID não encontrado, nenhuma mudança feita.")

            }


            logUpdate.logUpdate({
                status: "sucesso",
                detalhes: "Usuário atualizado com sucesso PROMOVENDO para ADMIN",
                actorId: idUser,
                targetId: idLimpo,
                changes,
                httpInfo,     
            });

                const [autor] = await repo.buscarPorId(idUser)
                const [usuario] = await repo.buscarPorId(idLimpo)

                // NOTIFICA VIA TELEGRAM.
                notifyAdmin(`🚀 **NOVO LOG DE SISTEMA: Editar Usuário**
            --------------------------
            **SISTEMA:** Atlas System
            **AÇÃO**: Editar Usuário
            **USUÁRIO:** ${idLimpo} -- ${usuario.user}
            **STATUS:** Sucesso
            **AUTOR:** ${idUser} -- ${autor.user}
            --------------------------

            Mudanças:

            ${changes}

            --------------------------
            OBS: O usuário foi editado normalmente


            **Origem da ação:**
            IP: ${httpInfo?.ip}
            Localização: ${httpInfo?.location}
            userAgent: ${httpInfo?.userAgent}
            --------------------------`)





            return resultado;

        }
    }


    if(campos.length === 0){
        throw new AppError("Nenhum campo Válido para atualizar")
    }

    valores.push(idLimpo)

    const resultado = await repo.updateUser(campos, valores)
    if(resultado.affectedRows === 0){
        throw new AppError("ID não encontrado, nenhuma mudança feita.")
    }

    logUpdate.logUpdate({
        status: "sucesso",
        detalhes: "Usuário atualizado com sucesso normalmente",
        actorId: idUser,
        targetId: idLimpo,
        changes,
        httpInfo
    });


    const [autor] = await repo.buscarPorId(idUser)
    const [usuario] = await repo.buscarPorId(idLimpo)

    // NOTIFICA VIA TELEGRAM.
    notifyAdmin(`🚀 <b>NOVO LOG DE SISTEMA: Editar Usuário</b>
--------------------------
<b>SISTEMA:</b> Atlas System
<b>AÇÃO:</b> Editar Usuário
<b>USUÁRIO:</b> ${idLimpo} -- ${usuario.user}
<b>STATUS:</b> Sucesso
<b>AUTOR:</b> ${idUser} -- ${autor.user}
--------------------------

OBS: O usuário foi editado normalmente

<b>Origem da ação:</b>
IP: ${httpInfo?.ip}
Localização: ${httpInfo?.location}

<pre>${httpInfo?.userAgent}</pre>
--------------------------

<i>📅 Enviado em: ${new Date().toLocaleString('pt-BR')}</i>
`);

    


    return resultado;
}



module.exports = {updateUser}