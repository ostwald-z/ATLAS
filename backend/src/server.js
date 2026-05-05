require("dotenv").config()
const express = require("express")
const server = express()
const cookies = require("cookie-parser")
require("./config/DB")
const erroMiddle = require("./middlewares/erro.middleware")
const rotaGeral = require("./rotasGerais/index")
const cors = require("cors")

// server.js ou routes/pages.js
const path = require('path');
const {verificarAcessoAdmin} = require('./middlewares/verificarAcesso-antes-de-carregar');
const {verificarAcessoUser} = require("./middlewares/verificarAcesso-antes-User")

// middleware de HTTP pra pegar info
const  {httpInfoMiddleware} = require("./middlewares/httpInfoGet/httpInfo")

server.use(cookies())


// Ativa a confiança no proxy (essencial para rate limiting em produção)
server.set('trust proxy', 1); 


server.use(cors({
    origin: process.env.FRONTEND_URL,  // só trocar no .env quando for testar NGROK ou localhost
    credentials: true
}))


server.use(express.json())
server.use(httpInfoMiddleware)


server.use("/api", rotaGeral)


// --- FUNÇÃO PRA ENCRIPTAR ALGO RAPIDÃO, pra colocar no .env e poder usar o bcrypt


/*
async function encriptarAlog() {
    
    const bcrypt = require("bcrypt")

    const algo = await bcrypt.hash("Uw!BV76aWOGWDamigodoben10", 10)
    console.log(algo)
}
encriptarAlog()
*/



server.use(erroMiddle)



// Deixe sem o IP, assim ele aceita localhost e conexões da rede interna
server.listen(process.env.PORT, "127.0.0.1",() => {
    console.log(`Server: ON na porta ${process.env.PORT}`);
});

