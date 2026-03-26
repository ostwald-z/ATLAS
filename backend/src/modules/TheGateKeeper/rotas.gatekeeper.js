const express = require("express")
const rotaKeeper = express.Router()
const {authMiddle} = require("../../middlewares/authMiddleware")
const roleMiddle = require("../../middlewares/roleMiddleware")

//importa controllers
const controllerListarPedido = require("./listarPedido/controller.listarPedido")
const controllerTodosPedidos = require("./listarTodosPedidos/controller.todosPedidos")
const controllerDeletarForm = require("./recusarPedido/controller.recusar")
const controllerAprovarForm = require("./aprovarPedido/controller.aprovar")
const controllerUpdateForm = require("./editarPedido/controller.editarPedido")

//ROTA COMPLETA AQUI ----- /api/gatekeeper
//ROTA para VALIDAR pedidos de criação de usuario


//rota para listar os pedidos
rotaKeeper.get("/", authMiddle, roleMiddle("admin"),controllerTodosPedidos.listarTodosPedidos)


//rota para listar pedido especifico
rotaKeeper.get("/:id", authMiddle, roleMiddle("admin"), controllerListarPedido.listarPedido)


//rota para deletar pedido
rotaKeeper.delete("/:id", authMiddle, roleMiddle("admin"), controllerDeletarForm.deletarForm)


//rota para aprovar pedido
rotaKeeper.post("/:id", authMiddle, roleMiddle("admin"), controllerAprovarForm.aprovarForm)


//rota para EDITAR pedido ANTES de aprovar
rotaKeeper.patch("/:id", authMiddle, roleMiddle("admin"), controllerUpdateForm.updateForm)

module.exports = rotaKeeper