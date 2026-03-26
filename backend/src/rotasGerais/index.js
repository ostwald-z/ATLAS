const express = require("express")
const rotaGeral = express.Router()
const rotaUser = require("../modules/EditorUser/userRoutes")
const rotaKeeper = require("../modules/TheGateKeeper/rotas.gatekeeper")
const rotaImpersonate = require("../modules/Impersonate/rotas.impersonate")

rotaGeral.use("/user", rotaUser)
rotaGeral.use("/gatekeeper", rotaKeeper)
rotaGeral.use("/impersonate", rotaImpersonate)

module.exports = rotaGeral
