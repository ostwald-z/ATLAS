const express = require("express")
const rotaGeral = express.Router()
const rotaUser = require("../modules/EditorUser/userRoutes")
const rotaKeeper = require("../modules/TheGateKeeper/rotas.gatekeeper")
const rotaImpersonate = require("../modules/Impersonate/rotas.impersonate")
const rotaAtlasDrive = require("../modules/AtlasDrive/rotasAtlasDrive")


rotaGeral.use("/user", rotaUser)
rotaGeral.use("/gatekeeper", rotaKeeper)
rotaGeral.use("/impersonate", rotaImpersonate)
rotaGeral.use("/atlas-drive", rotaAtlasDrive)

module.exports = rotaGeral
