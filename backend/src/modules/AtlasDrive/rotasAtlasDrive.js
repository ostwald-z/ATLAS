const express = require("express")
const rotaDrive = express.Router()


//chama middleware do multter pra processar arquivo recebido
const upload_middle = require('../../middlewares/multter_arquivo')


//middleware de autenticação COOKIE
const {authMiddle} = require("../../middlewares/authMiddleware")



//MIDDLEWARE DE VALIDAÇÃO DE TOKEN VAULT ATLAS DRIVE
const {authMiddle_vault} = require("../../middlewares/authMiddleVaultDrive")


// middleware de rate limit 
const {middlewareRate} = require("../../middlewares/rateLimitMiddleware")


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

//controller criar pasta padrão context menu
const controller_criar_pasta_context = require("./drive-criarPastaContext/controller-criarPasta")


//VAULT DRIVE ==================================================

//controller vault acesso inicial verificara
const controller_vault = require("./AtlasVault/AtlasVault-VerificarAcess/controller-verificar-acesso")


//controller para autenticar o painel e entregar SessionToken para vault
const controller_vault_autenticar = require("./AtlasVault/AtlasVault-VerificarSenha/controller.verificarSenha")


//controller para LISTAR O VAULT DRIVE
const controller_lista_vault = require("./AtlasVault/AtlasVault-listarPasta/controller_listar_pastas")


//controller renomear para o VAULT DRIVE (move ou renomeia tudo)
const controller_renomear_vault = require("./AtlasVault/AtlasVault-renomearGeral/controller-renomear")


//controller de DOWLOAD DO VAULT DRIVE
const controller_download_vault = require("./AtlasVault/AtlasVault-download/controller_download")


//controller de UPLOAD DO VAULT DRIVE
const controller_upload_vault = require("./AtlasVault/AtlasVault-upload/controller.upload")


//controller de DELETE do vault drive
const controller_delete_vault = require("./AtlasVault/AtlasVault-delete/controller.delete")


//----------------------------------------------- ROTAS --------------------------------------------------


//=================================== ROTAS PARA O ATLAS-DRIVE  ========================================




// Rota para UPLOAD -- USA o middleware do Multer para tratar e passar o arquivo para o Buffer.
// usa token via header pela facilidade com upload
rotaDrive.post("/upload", authMiddle, middleRole(["user", "admin"]) ,upload_middle.array("files"), controller_upload.drive_upload)


// Rota para Download - já usa token por segurança e padrão
rotaDrive.post("/download",authMiddle, middleRole(["user", "admin"]), controller_download.controller_download_arq)


// Rota para deletar arquivos OU pastas
rotaDrive.delete("/delete", authMiddle, middleRole(["user", "admin"]), controller_deletar_arquivo.controller_deletar_arquivo_drive)


// Rota para RENOMEAR ARQUIVOS
rotaDrive.patch("/renomear", authMiddle, middleRole(["user", "admin"]), controller_renomear_arquivo.renomear_arquivo_controller)


// Rota para LISTAR PASTA INICIAL OU listar SUBPASTAS, navegar dentro das pastas do drive do usuario
rotaDrive.get("/cloud", authMiddle, middleRole(["user", "admin"]), controller_listar.listar_sub_pastas)


//rota para CRIAR PASTAS context menu drive
rotaDrive.post("/criar-nova-Pasta", authMiddle, middleRole(["user", "admin"]), controller_criar_pasta_context.controller_criar_pasta_context)


// UPLOAD MULTIPART ================

const controller_multi = require("./drive-upload-multipart/controller_multipart_upload")

rotaDrive.post("/upload-mult/initiate", authMiddle, middleRole(["user", "admin"]), controller_multi.controller_initiate_upload)
rotaDrive.post("/upload-mult/part", authMiddle, middleRole(["user", "admin"]), controller_multi.uploadPart_controller)
rotaDrive.post("/upload-mult/complete", authMiddle, middleRole(["user", "admin"]), controller_multi.complete_controller)




module.exports = rotaDrive