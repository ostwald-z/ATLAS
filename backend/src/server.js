require("dotenv").config()
const express = require("express")
const server = express()
const cookies = require("cookie-parser")
require("./config/DB")
const erroMiddle = require("./middlewares/erro.middleware")
const rotaGeral = require("./rotasGerais/index")
const cors = require("cors")

server.use(cookies())

server.use(cors({
    origin: process.env.FRONTEND_URL,  // só trocar no .env quando for testar NGROK ou localhost
    credentials: true
}))

server.listen(process.env.PORT, () =>{
    console.log("Server: ON")
})


server.use(express.json())


server.use("/api", rotaGeral)



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