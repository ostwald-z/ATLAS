document.getElementById("enviarForm").addEventListener("click", async (evento) => {
    evento.preventDefault();

    const perro = document.getElementById("erro")
    perro.textContent = "Aguardando instruções do núcleo ATLAS..."
    perro.style.color = "#94a3b8"

    const user = document.getElementById("user").value;
    const email = document.getElementById("email").value;
    const obs = document.getElementById("obs").value;
    const senha = document.getElementById("senha").value;
    const chaveCriar = document.getElementById("chaveCriar").value;
    const chavePrivilegio = document.getElementById("chavePrivilegio").value;
    const chaveNoPending = document.getElementById("chaveNoPending").value
    const senhaConfirm = document.getElementById("senhaConfirmar").value;

    if(!user.trim() || !email.trim() || !obs.trim() || !chaveCriar.trim() || !senha.trim()){
        perro.textContent = "Todos os campos (exceto RoleKey/NoPending) são obrigatorios, não deixe nenhum em branco."
        perro.style.color = "red"
        return;
    }

    if(senhaConfirm !== senha){
        perro.textContent = "Senha não está igual"
        perro.style.color = "red"
        return;
    }


    const resposta = await fetch (`${window.CONFIG.API_BASE_URL}api/user/`, {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({

            user: user,
            senha: senha,
            email: email,
            obs: obs,
            magicRole: chavePrivilegio,
            magicCriar: chaveCriar,
            chaveNoPending: chaveNoPending

        })
    })

    const respostaf = await resposta.json()

    if(!resposta.ok){
        perro.textContent = respostaf.erro
        perro.style.color = "red";
        return;
    }


    if(respostaf.atlas === "on"){
        perro.textContent = respostaf.message + " " + respostaf.idUser
        perro.style.color = "rgba(255, 233, 39, 1)";
        return;
    }


    perro.textContent = respostaf.message + " " + respostaf.idEspera
    perro.style.color = "green";

})