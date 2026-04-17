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



server.use(cookies())


// Ativa a confiança no proxy (essencial para rate limiting em produção)
server.set('trust proxy', 1); 


server.use(cors({
    origin: process.env.FRONTEND_URL,  // só trocar no .env quando for testar NGROK ou localhost
    credentials: true
}))


server.use(express.json())



server.use("/api", rotaGeral)


// Rota protegida — backend verifica ANTES de servir
server.get('/dashboard/admin', verificarAcessoAdmin, (req, res) => {
  res.sendFile(path.resolve(__dirname, '../../frontend/dashboard/admin/index.html'));
});

server.get('/dashboard/user', verificarAcessoUser, (req, res) => {
  res.sendFile(path.resolve(__dirname, '../../frontend/dashboard/user/index.html'));
});

// Login é público
server.get('/login', (req, res) => {
  res.sendFile(path.resolve(__dirname, '../../frontend/painelDeLogin/login/index.html'));
});

server.use('/login', express.static(path.join(__dirname, '../../frontend/painelDeLogin')));

// --- FUNÇÃO PRA ENCRIPTAR ALGO RAPIDÃO, pra colocar no .env e poder usar o bcrypt


/*
async function encriptarAlog() {
    
    const bcrypt = require("bcrypt")

    const algo = await bcrypt.hash("Uw!BV76aW", 10)
    console.log(algo)
}
encriptarAlog()

*/



server.use(erroMiddle)



server.listen(process.env.PORT, '127.0.0.1', () => {
    console.log("Server: ON na porta", process.env.PORT)
})
