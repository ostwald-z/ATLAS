const express = require("express")
const rotaDrive = express.Router()


//chama middleware do multter pra processar arquivo recebido
const upload_middle = require('../../middlewares/multter_arquivo')

//middleware de autenticação (joga token e dados pro req.user)
const {authMiddle_bearer} = require("../../middlewares/authMiddleBEARER")


//middleware de autenticação COOKIE
const {authMiddle} = require("../../middlewares/authMiddleware")



//MIDDLEWARE DE VALIDAÇÃO DE TOKEN VAULT ATLAS DRIVE
const {authMiddle_bearer_vault} = require("../../middlewares/authMiddleVaultDrive")


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


//TUDO REFERENTE AO ATLAS_VAULT !!!!!!!!!


//VERIFICA ACESSO INICIAL RENOMEAR
rotaDrive.post("/vault/verificar-acesso", authMiddle, middleRole("admin"), controller_vault.controller_verificar_acesso_inicial)

// autentica de fato o usuario após acertar a senha no painel , entrega SESSION TOKEN (sessionStorage)
// essa rota da o bearer token vault para mexer no vault de fato.
rotaDrive.post("/vault/autenticar", middlewareRate, authMiddle, middleRole("admin"), controller_vault_autenticar.controller_verificar_senha_vault)


// ROTA QUE LISTA A PORRA DO ATLAS VAULT  (MIDDLEWARE PERSONALIZADO para ler TOKEN DADO PARA ALTERAÇÕES E LEITURA DO VAULT)
rotaDrive.get("/vault/listar", authMiddle_bearer_vault, controller_lista_vault.listar_pastas_vault)


// ROTA QUE RENOMEIA/MOVE PASTAS E ARQUIVOS DENTRO DO VAULT
rotaDrive.patch("/vault/renomear", authMiddle_bearer_vault, controller_renomear_vault.renomear_arquivo_controller_vault)


// ROTA DE DOWNLOAD DE ARQUIVOS para o VAULT DRIVE
rotaDrive.post("/vault/download", authMiddle_bearer_vault, controller_download_vault.controller_download_vault)


// ROTA DE UPLOAD DE ARQUIVOS PARA VAULT DRIVE
rotaDrive.post("/vault/upload", authMiddle_bearer_vault, upload_middle.array("files"), controller_upload_vault.drive_upload_vault)


//ROTA DE DELETE PARA ARQUIVOS E PASTAS VAULT
rotaDrive.delete("/vault/deletar", authMiddle_bearer_vault, controller_delete_vault.controller_deletar_arquivo_vault)




//=================================== ROTAS PARA O ATLAS-DRIVE PADRÃO NORMAL NÃO SECRETO  ========================================




// Rota para UPLOAD -- USA o middleware do Multer para tratar e passar o arquivo para o Buffer.
// usa token via header pela facilidade com upload
rotaDrive.post("/upload", authMiddle, middleRole(["user", "admin"]) ,upload_middle.array("files"), controller_upload.drive_upload)


// Rota para Download - já usa token via cookie por segurança e padrão
rotaDrive.get("/download",authMiddle, middleRole(["user", "admin"]), controller_download.controller_download_arq)


// Rota para deletar arquivos OU pastas
rotaDrive.delete("/delete", authMiddle, middleRole(["user", "admin"]), controller_deletar_arquivo.controller_deletar_arquivo_drive)


// Rota para RENOMEAR ARQUIVOS
rotaDrive.patch("/renomear", authMiddle, middleRole(["user", "admin"]), controller_renomear_arquivo.renomear_arquivo_controller)


// Rota para LISTAR PASTA INICIAL OU listar SUBPASTAS, navegar dentro das pastas do drive do usuario
rotaDrive.get("/cloud", authMiddle, middleRole(["user", "admin"]), controller_listar.listar_sub_pastas)


//rota para CRIAR PASTAS context menu drive
rotaDrive.post("/criar-nova-Pasta", authMiddle, middleRole(["user", "admin"]), controller_criar_pasta_context.controller_criar_pasta_context)








module.exports = rotaDrive