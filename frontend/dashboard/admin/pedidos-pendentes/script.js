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




document.getElementById("reload").addEventListener("click", async () => {

    const requestList = document.querySelector(".list");
    requestList.textContent = "";


    const resultado = await fetch(`${window.CONFIG.API_BASE_URL}api/gatekeeper`, {
        method: "GET",
        credentials: "include"
    })


    const resultadof = await resultado.json()

    if(!resultado.ok){

        const erroMessage = document.createElement("div");
        erroMessage.classList.add("item")

        const pErro = document.createElement("span");
        pErro.textContent = resultadof.erro

        erroMessage.append(pErro)
        requestList.appendChild(erroMessage)
    }


    resultadof.resultado.forEach(resultadof => {
        
        const pedidoDiv = document.createElement("div");
        pedidoDiv.classList.add("item");

        pedidoDiv.addEventListener("click", () => {
            selectRequest(pedidoDiv)
        })

        const pUser = document.createElement("span")
        pUser.classList.add("nome")
        pUser.textContent = resultadof.user

        const pID = document.createElement("span")
        pID.classList.add("id")
        pID.textContent = resultadof.id

        const pEmail = document.createElement("span")
        pEmail.classList.add("email")
        pEmail.textContent = resultadof.email

        const pData = document.createElement("span")
        pData.classList.add("data")
        pData.textContent = resultadof.DATA

        const pRole = document.createElement("span")
        pRole.classList.add("role")
        pRole.textContent = resultadof.role

        const obs = document.createElement("span");
        obs.classList.add("obs")
        obs.textContent = resultadof.obs


        pedidoDiv.append(pID, pUser, pEmail ,pData)
        requestList.appendChild(pedidoDiv)

    });


})


async function selectRequest(el) {
    document.querySelectorAll('.item').forEach(i => i.classList.remove('active'));
    el.classList.add('active');

    const idUser = el.querySelector('.id').innerText;
    
    const resultado = await fetch(`${window.CONFIG.API_BASE_URL}api/gatekeeper/` + idUser, {
        method: "GET",
        credentials: "include"
    })

    const resultadof = await resultado.json()
    console.log(resultadof)

    document.getElementById('f-id').value = el.querySelector('.id').innerText;
    document.getElementById('f-nome').value = el.querySelector('.nome').innerText;
    document.getElementById('f-email').value = el.querySelector('.email').innerText;
    document.getElementById('f-data').value = el.querySelector('.data').innerText;
    document.getElementById('f-privilegio').value = resultadof.resultado[0].role;
    document.getElementById("f-obs").value = resultadof.resultado[0].obs;
}

document.getElementById("aprovarbotao").addEventListener("click", async () => {


    const requestList = document.querySelector(".list");
    requestList.textContent = "";

    const idUser = document.getElementById('f-id').value

    const resultado = await fetch(`${window.CONFIG.API_BASE_URL}api/gatekeeper/` + idUser, {
        method: "POST",
        credentials: "include"
    })


    const resultadof = await resultado.json();


    document.getElementById('f-id').value = ""
    document.getElementById('f-nome').value = ""
    document.getElementById('f-email').value = ""
    document.getElementById('f-data').value = ""
    document.getElementById('f-privilegio').value = ""
    document.getElementById("f-obs").value = ""


    if(!resultado.ok){

        const erroMessage = document.createElement("div");
        erroMessage.classList.add("item")

        const pErro = document.createElement("span");
        pErro.textContent = resultadof.erro

        erroMessage.append(pErro)
        requestList.appendChild(erroMessage)

    }

    const sucesso = document.createElement("div")
    sucesso.classList.add("item")

    const sucessoMessage = document.createElement("span")
    sucessoMessage.textContent = resultadof.message

    sucesso.append(sucessoMessage)
    requestList.appendChild(sucesso)

})


document.getElementById("recusarbotao").addEventListener("click", async () => {

    const requestList = document.querySelector(".list")
    requestList.textContent = "";

    const userID = document.getElementById("f-id").value;

    const resultado = await fetch (`${window.CONFIG.API_BASE_URL}api/gatekeeper/` + userID, {
        method: "DELETE",
        credentials: "include"
    })


    const resultadof = await resultado.json()

    if(!resultado.ok){

        const erroMessage = document.createElement("div");
        erroMessage.classList.add("item")

        const pErro = document.createElement("span");
        pErro.textContent = resultadof.erro

        erroMessage.append(pErro)
        requestList.appendChild(erroMessage)

    }

    const sucesso = document.createElement("div")
    sucesso.classList.add("item")

    const sucessoP = document.createElement("span")
    sucessoP.textContent = resultadof.message

    sucesso.append(sucessoP)
    requestList.appendChild(sucesso)
    

})


document.getElementById("editarbotao").addEventListener("click", async () => {

    const requestList = document.querySelector(".list")
    requestList.textContent = ""

    const idUser = document.getElementById("f-id").value;
    const user = document.getElementById("f-nome").value;
    const email = document.getElementById("f-email").value;
    const role = document.getElementById("f-privilegio").value;
    const obs = document.getElementById("f-obs").value;


    const resultado = await fetch(`${window.CONFIG.API_BASE_URL}api/gatekeeper/` + idUser, {
        method: "PATCH",
        headers: {"Content-Type": "application/json"},
        credentials: "include",
        body: JSON.stringify({

            user: user,
            email: email,
            role: role,
            obs: obs

        })
    })

    const resultadof = await resultado.json()

    if(!resultado.ok){

        const erroMessage = document.createElement("div");
        erroMessage.classList.add("item")

        const pErro = document.createElement("span");
        pErro.textContent = resultadof.erro

        erroMessage.append(pErro)
        requestList.appendChild(erroMessage)

    }

    const sucesso = document.createElement("div")
    sucesso.classList.add("item")

    const Psucesso = document.createElement("span")
    Psucesso.textContent = resultadof.message

    sucesso.append(Psucesso)
    requestList.appendChild(sucesso)

})