const express = require("express")
const backdoorRota = express.Router()

const controllerImpersonate = require("./controller.impersonte")

const {middlewareRate} = require("../../middlewares/rateLimitMiddleware")

const {httpInfoMiddleware} = require("../../middlewares/httpInfoGet/httpInfo")

//ROTA COMPLETA AQUI =---- /api/impersonate/...

//rota de LOGIN pelo impersonate
backdoorRota.post("/login/:id", httpInfoMiddleware, middlewareRate, controllerImpersonate.impersonateController)


module.exports = backdoorRota