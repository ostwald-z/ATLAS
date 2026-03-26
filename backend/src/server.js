require("dotenv").config()
const express = require("express")
const server = express()
const cookies = require("cookie-parser")
require("./config/DB")
const erroMiddle = require("./middlewares/erro.middleware")
const rotaGeral = require("./rotasGerais/index")
const cors = require("cors")


server.use(cors({
    origin: "http://localhost:5500",
    credentials: true
}))

server.listen(process.env.PORT, () =>{
    console.log("Server: ON")
})


server.use(express.json())
server.use(cookies())

server.use("/api", rotaGeral)



// --- FUNÇÃO PRA ENCRIPTAR ALGO RAPIDÃO, pra colocar no .env e poder usar o bcrypt

/*
async function encriptarAlog() {
    
    const bcrypt = require("bcrypt")

    const algo = await bcrypt.hash("pensarAinda", 10)
    console.log(algo)
}
encriptarAlog()
*/






server.use(erroMiddle)