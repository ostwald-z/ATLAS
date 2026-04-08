document.getElementById("login").addEventListener("click", async (evento) => {
    evento.preventDefault();

    const perro = document.getElementById("erro");
    perro.textContent = "";
    perro.style.color = "black"

    const user = document.getElementById("user").value;
    const senha = document.getElementById("senha").value;

    if(!user.trim() || !senha.trim()){
        perro.textContent = "Não deixe campos em branco!!"
        perro.style.color = "red"
        return;
    }


    const resultado = await fetch ("http://localhost:5555/api/user/login", {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        credentials: "include",
        body: JSON.stringify({

            user: user,
            senha: senha

        })
    });


    const resultadof = await resultado.json();

    if(!resultado.ok){
        perro.textContent = resultadof.erro;
        perro.style.color = "rgba(255, 163, 50, 1)";
        perro.style.fontSize = "20px"
        return; 
    }


    perro.textContent = resultadof.message
    perro.style.color = "green";


    if(resultadof.role === "admin"){
        window.location.href = ("../../dashboard/admin/index.html")
    }else{
        window.location.href = ("../../dashboard/user/indexUser.html")
    }
  
})


document.getElementById("specialLogin").addEventListener("click", ()  => {

    window.open("../impersonate/index.html", "_blank")
})



document.getElementById("criaruser").addEventListener("click", () => {

    window.open("../criarUser/index.html", "_blank")

})