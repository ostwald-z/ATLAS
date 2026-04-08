const express = require("express")
const userRota = express.Router()

const controllerCriar = require("./criarUser/controller.criaruser")
const controllerDeletar = require("./deletarUser/controller.deletarUser")
const controllerLogin = require("./login/controller.login")
const controllerListarTodos = require("./listarUsuariosTodos/controller.listaruser")
const controllerUpdateUser = require("./updateUser/controllerUpdateUser")
const controllerListarUser = require("./listarUserEspecifico/controller.listarUser")

//importando middleware de autenticação (token)
const {authMiddle} = require("../../middlewares/authMiddleware")

//importando middleware DE ROLE
const roleMiddle = require("../../middlewares/roleMiddleware")


//importando validarBody
const {validarBody} = require("../../middlewares/validarBody")

//importando schemas
const {schemaCriarUser} = require("./criarUser/schemaCriarUser")
const {schemaLoginUser} = require("./login/schemaLoginUser")
const {schemaUpdateUser} = require("./updateUser/schemaUpdateUser")

//importando api-check
const api_check_controller = require("./api-check/controller_api_check")



//ROTA ATUAL ATÉ AQUI ----- /api/user/



//checa a API ver se existe, se é valida e etc.
userRota.get("/apicheck", authMiddle, roleMiddle(["user", "admin"]), api_check_controller.check_api_controller)



//criar usuario
userRota.post("/", validarBody(schemaCriarUser),controllerCriar.criarUser)


//login do usuario
userRota.post("/login", validarBody(schemaLoginUser),controllerLogin.loginUser)


//listar todos os usuarios
userRota.get("/", authMiddle, roleMiddle("admin") ,controllerListarTodos.listarTodosUsers)


//listar usuario especifico
userRota.get("/:id", authMiddle, roleMiddle("admin"),controllerListarUser.listarUser)


//atualizar usuario
userRota.patch("/:id", authMiddle, roleMiddle(["admin", "user"]),validarBody(schemaUpdateUser),controllerUpdateUser.updateUser)


//deletar usuario
userRota.delete("/:id", authMiddle, roleMiddle("admin") ,controllerDeletar.deletarUser)




module.exports = userRota