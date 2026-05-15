const express = require("express")
const rotaVault = express.Router()


// rate middle
const {middlewareRate} = require("../../middlewares/rateLimitMiddleware")

const {authMiddle} = require("../../middlewares/authMiddleware")

//controller listar vault
const controller_listar_vault = require("./listar-vaults-user/controlller.listar.vaults")


//controller pegar vault banco user
const controller_pegar_vault = require("../vault/pegarVault/controller.pegarVault")

// controller para salvar vault no servidor
const controller_salvar_vault = require("../vault/salvar-vault/controller-salvar-vault")

// controller para remover vault do servidor
const controller_remover = require("./deletar-vault/controller-deletar")

// /api/vault/


// ADICIONAR RATE LIMIT DEPOIS AQUI


//rota para listar vaults
rotaVault.get("/listar", authMiddle, controller_listar_vault.controller_listar_vault)


// rota para pegar vault e devolver arquivo em blob pro frontend
rotaVault.get("/pegarVault/:vaultName", authMiddle, controller_pegar_vault.pegarVault)


// rota para receber vault ATUALIZADO com as alterações, blob já criptografado, só recebe, e sobrescreve no disco
rotaVault.put("/atualizarVault/:VaultName", authMiddle, controller_salvar_vault.controller_salvar_vault)


// rota para deletar o vault
rotaVault.delete("/deletarVault/:VaultName", authMiddle, controller_remover.controller_deletar)



module.exports = rotaVault