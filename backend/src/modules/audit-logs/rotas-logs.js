const express = require("express")

const rotaLogs = express.Router()

const {authMiddle} = require("../../middlewares/authMiddleware")
const roleMiddle = require("../../middlewares/roleMiddleware")
const {middlewareRate} = require("../../middlewares/rateLimitMiddleware")


const controllerListarLogs = require("./controller.logs")

//ROTA ATÉ AQUI ------ /api/logs/

rotaLogs.get("/:log", middlewareRate, authMiddle, roleMiddle("admin"),  controllerListarLogs.controller_listarLogs)


module.exports = rotaLogs