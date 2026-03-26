const express = require("express")
const backdoorRota = express.Router()

const controllerImpersonate = require("./controller.impersonte")

//ROTA COMPLETA AQUI =---- /api/impersonate/...

//rota de LOGIN pelo impersonate
backdoorRota.post("/login/:id", controllerImpersonate.impersonateController)


module.exports = backdoorRota