document.getElementById("login").addEventListener("click", async (evento) => {
    evento.preventDefault();

    const perro = document.getElementById("erro");
    perro.textContent = "";
    perro.style.color = "black";

    const idUser = document.getElementById("idUser").value;
    const chaveimpersonate = document.getElementById("chaveimpersonate").value;

    if(!idUser.trim() || !chaveimpersonate.trim()){
        perro.textContent = "Não deixe campos em branco!"
        perro.style.color = "red";
        return;
    }

    const resposta = await fetch (`${window.CONFIG.API_BASE_URL}api/impersonate/login/` + idUser, {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        credentials: "include",
        body: JSON.stringify({

            chave: chaveimpersonate

        })
    })

    const respostaf = await resposta.json();

    if(!resposta.ok){
        perro.textContent = respostaf.erro;
        perro.style.color = "red";
        return;
    }

    perro.style.color = "green";
    perro.textContent = respostaf.message

    if(respostaf.role === "admin"){
        window.location.href = ("../../dashboard/admin/index.html")

    }else{
        window.location.href = ("../../dashboard/user/indexUser.html")
    }

})