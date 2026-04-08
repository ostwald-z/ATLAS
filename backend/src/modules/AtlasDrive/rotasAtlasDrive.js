const express = require("express")
const rotaDrive = express.Router()


//chama middleware do multter pra processar arquivo recebido
const upload_middle = require('../../middlewares/multter_arquivo')

//middleware de autenticação (joga token e dados pro req.user)
const {authMiddle_bearer} = require("../../middlewares/authMiddleBEARER")

//middleware de autenticação COOKIE
const {authMiddle} = require("../../middlewares/authMiddleware")

//middleware de ROLE para permissão
const middleRole = require("../../middlewares/roleMiddleware")

//controller upload
const controller_upload = require("./drive-upload/controller.upload")


//controller download
const controller_download = require("../AtlasDrive/drive-download/controller_download")


//controller listar pasta inicial (inicio)
const controller_listar = require("./drive-listarSUBpastas/controller_listar_subpastas")


//controller deletar_arquivo_drive
const controller_deletar_arquivo = require("./drive-delete/controller.delete")

//controller renomear arquivo drive
const controller_renomear_arquivo = require("./drive-renomear-arquivo/controller-renomear")

//----------------------------------------------- ROTAS --------------------------------------------------



// Rota para UPLOAD -- USA o middleware do Multer para tratar e passar o arquivo para o Buffer.
// usa token via header pela facilidade com upload
rotaDrive.post("/upload", authMiddle, middleRole(["user", "admin"]) ,upload_middle.array("files"), controller_upload.drive_upload)


// Rota para Download - já usa token via cookie por segurança e padrão
rotaDrive.post("/download",authMiddle, middleRole(["user", "admin"]), controller_download.controller_download_arq)


// Rota para deletar arquivos OU pastas
rotaDrive.delete("/delete", authMiddle, middleRole(["user", "admin"]), controller_deletar_arquivo.controller_deletar_arquivo_drive)


// Rota para RENOMEAR ARQUIVOS
rotaDrive.patch("/renomear", authMiddle, middleRole(["user", "admin"]), controller_renomear_arquivo.renomear_arquivo_controller)


// Rota para LISTAR PASTA INICIAL OU listar SUBPASTAS, navegar dentro das pastas do drive do usuario
rotaDrive.get("/cloud", authMiddle, middleRole(["user", "admin"]), controller_listar.listar_sub_pastas)



module.exports = rotaDrive