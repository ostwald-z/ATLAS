// ==========================
// VERIFICAÇÃO DE LOGIN
// ==========================
(async function checkAuth() {
  try {
    const res = await fetch(`${window.CONFIG.API_BASE_URL}api/user/apicheck`, {
      method: 'GET',
      credentials: 'include'
    });

    if (!res.ok) {
      // Token inválido ou não existe -> redireciona
      window.location.href = '../../../painelDeLogin/login/index.html';
      return;
    }

    const data = await res.json();
    console.log('Usuário autenticado:', data.user);

  } catch (err) {
    console.error('Erro na verificação de token:', err);
    window.location.href = '../../../painelDeLogin/login/index.html';
  }
})();






document.getElementById("listarUsuariosBtn").addEventListener("click", async (evento) => {
    evento.preventDefault();


    const userList = document.querySelector(".user-list")
    userList.textContent = "";


    const resultado = await fetch(`${window.CONFIG.API_BASE_URL}api/user/`, {
        method: "GET",
        credentials: "include",
    })


    const resultadof = await resultado.json()


    if(!resultado.ok){
        const erroMessage = document.createElement("div")
        erroMessage.classList.add("user-item");

        const pErro = document.createElement("p")
        pErro.textContent = "ERRO: " + resultadof.erro

        erroMessage.appendChild(pErro)
        userList.append(erroMessage)
        
    }



    resultadof.resultado.forEach(resultadof => {
        
        const userItem = document.createElement("div")
        userItem.classList.add("user-item")

        const pID = document.createElement("p")
        pID.textContent = "ID: " + resultadof.id

        const pNome = document.createElement("p")
        pNome.textContent = "Nome: " + resultadof.user;

        const pEmail = document.createElement("p")
        pEmail.textContent = "Email: " + resultadof.email 

        const pObs = document.createElement("p")
        pObs.textContent = "obs: " + resultadof.obs;

        const pRole = document.createElement("p")
        pRole.textContent = "Privilégio: " + resultadof.role;


        userItem.append(pID, pNome, pEmail, pObs, pRole);
        userList.appendChild(userItem);

    });

})


document.getElementById("listarUsuarioBtnEspecifico").addEventListener("click", async (event) => {
    event.preventDefault();


    const filtroId = document.getElementById("filtroId").value;



    const userList = document.querySelector(".user-list")
    userList.textContent = "";


    const resultado = await fetch(`${window.CONFIG.API_BASE_URL}api/user/` + filtroId, {
        method: "GET",
        credentials: "include"
    })


    const resultadof = await resultado.json()



    if(!resultado.ok){

        const erroMessage = document.createElement("div")
        erroMessage.classList.add("user-item")

        const pErro = document.createElement("p")
        pErro.textContent = "ERRO: " + resultadof.erro

        erroMessage.appendChild(pErro)
        userList.append(erroMessage)
        
    }


    resultadof.resultado.forEach(resultadof => {
        
        const userItem = document.createElement("div")
        userItem.classList.add("user-item")

        const pID = document.createElement("p")
        pID.textContent = "ID: " + resultadof.id

        const pUser = document.createElement("p")
        pUser.textContent = "Nome: " + resultadof.user

        const pEmail = document.createElement("p")
        pEmail.textContent = "Email: " + resultadof.email

        const pObs = document.createElement("p")
        pObs.textContent = "Obs: " + resultadof.obs

        const pPrivilegio = document.createElement("p")
        pPrivilegio.textContent = "Privilégio: " + resultadof.role

        userItem.append(pID, pUser, pEmail, pObs, pPrivilegio)
        userList.appendChild(userItem)


    });


})


document.getElementById("aplicarPatch").addEventListener("click", async (evento) => {
    evento.preventDefault();


    const userList = document.querySelector(".user-list")
    userList.textContent = "";

    const id = document.getElementById("userId").value;
    const nome = document.getElementById("nome").value;
    const email = document.getElementById("email").value;
    const senha = document.getElementById("senha").value;
    const obs = document.getElementById("obs").value;
    const role = document.getElementById("privilegio").value;

    const resultado = await fetch(`${window.CONFIG.API_BASE_URL}api/user/` + id, {
        method: "PATCH",
        headers: {"Content-Type": "application/json"},
        credentials: "include",
        body: JSON.stringify({

            user: nome,
            senha: senha,
            email: email,
            roleEdit: role,
            obs: obs
        })
    })


    const resultadof = await resultado.json()


    if(!resultado.ok){

        const erroMessage = document.createElement("div")
        erroMessage.classList.add("user-item")

        const pErro = document.createElement("p")
        pErro.textContent = "ERRO: " + resultadof.erro

        erroMessage.appendChild(pErro)
        userList.append(erroMessage)
        
    }

    const sucesso = document.createElement("div")
    sucesso.classList.add("user-item")

    const pSucesso = document.createElement("p")
    pSucesso.textContent = resultadof.message

    sucesso.appendChild(pSucesso)
    userList.append(sucesso)



})


document.getElementById("deletarUser").addEventListener("click", async (evento) => {
    evento.preventDefault();


    const userList = document.querySelector(".user-list")
    userList.textContent = "";


    const id = document.getElementById("userId").value;

    const resultado = await fetch(`${window.CONFIG.API_BASE_URL}api/user/` + id, {
        method: "DELETE",
        credentials:"include"
    })


    const resultadof = await resultado.json()


    if(!resultado.ok){

        const erroMessage = document.createElement("div")
        erroMessage.classList.add("user-item")

        const pErro = document.createElement("p")
        pErro.textContent = "ERRO: " + resultadof.erro

        erroMessage.appendChild(pErro)
        userList.append(erroMessage)

    }


    const sucesso = document.createElement("div")
    sucesso.classList.add("user-item")

    const pSucesso = document.createElement("p")
    pSucesso.textContent = resultadof.message

    sucesso.appendChild(pSucesso)
    userList.append(sucesso)


})
