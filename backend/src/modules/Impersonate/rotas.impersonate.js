const express = require("express")
const backdoorRota = express.Router()

const controllerImpersonate = require("./controller.impersonte")

const {middlewareRate} = require("../../middlewares/rateLimitMiddleware")


//ROTA COMPLETA AQUI =---- /api/impersonate/...

//rota de LOGIN pelo impersonate
backdoorRota.post("/login/:id", middlewareRate, controllerImpersonate.impersonateController)


module.exports = backdoorRota