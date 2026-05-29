const AppError = require("../../../error/AppError")

const fs = require("fs")
const fsp = require("fs/promises")
const crypto = require("crypto")
const path = require("path")

const {pipeline} = require("stream/promises")


//funções que sanitizam ==============

function sanitizeFilename(filename) {
  return path.basename(filename)
}


function sanitizeRelativePath(inputPath = "") {

  const normalized =
    path.normalize(inputPath)

  return normalized
    .replace(/^(\.\.(\/|\\|$))+/, '')
}

// =============================================




async function initiate({ filename }) {
  const uploadId = crypto.randomUUID()

  const uploadDir = path.join(
    "/tmp/uploads-atlas",
    uploadId
  )

  await fsp.mkdir(uploadDir, { recursive: true })

  console.log("sucesso service innitiate")

  return {
    uploadId,
  }
}




async function uploadPart({uploadId,partNumber,stream,}) {
  
  const uploadIdSafe = path.basename(uploadId)

  const filepath = path.join(
    "/tmp/uploads-atlas",
    uploadIdSafe,
    `part-${partNumber}`
  )

  const writeStream = fs.createWriteStream(filepath)

  console.log("sucesso part upload")

  try{
  	await pipeline(stream, writeStream)
  }catch(erro){
  	await fsp.rm(filepath, {
    force: true
   })

  	console.log("falha criar TMP, erro interno servidor")
  	throw new AppError("Falha ao começar upload, tente novamente mais tarde", 500)
  }
}





async function complete(uploadId, nome_arquivo, caminho_escolhido, id_user) {

  const uploadIdSafe = path.basename(uploadId)

  const nome_arquivo_safe = sanitizeFilename(nome_arquivo)

  const caminho_escolhido_safe = sanitizeRelativePath(caminho_escolhido)

  const atlas_cloud = process.env.ATLAS_CLOUD_PATH
  const pasta_base_usuario = path.join(atlas_cloud, String(id_user))

  const uploadDir = path.join(
    "/tmp/uploads-atlas",
    uploadIdSafe
  )

  const caminhoOriginalFinal = path.join(
    pasta_base_usuario,
    caminho_escolhido_safe,
    nome_arquivo_safe
  )

  const finalPath = await gerarCaminhoSemConflito(
    caminhoOriginalFinal
  )

  const basePath = path.resolve(pasta_base_usuario)


  if (!finalPath.startsWith(basePath)) {
  	throw new AppError("Path inválido", 403)
	}


	// tenta concatenação
  try {
	  await fsp.mkdir(
	  	path.dirname(finalPath),
	  	{ recursive: true }
		)

	  const writeStream = fs.createWriteStream(finalPath)

	  const parts = await fsp.readdir(uploadDir)

	  parts.sort((a, b) => {
	  const partA = Number(a.split("-")[1])
	  const partB = Number(b.split("-")[1])

	  return partA - partB
		})


	  for (const part of parts) {
	    const partPath = path.join(uploadDir, part)

	    const readStream = fs.createReadStream(partPath)

	    await new Promise((resolve, reject) => {
	  	readStream.pipe(writeStream, { end: false })

	  	readStream.on("end", resolve)
	  	readStream.on("error", reject)
		})

	  }

	  await new Promise(resolve => {
	  writeStream.end(resolve)
		})


	  await fsp.rm(uploadDir, {
		  recursive: true,
		  force: true,
		})

	  return {
	    success: true,
	  }



  } catch (erro) {

   await fsp.rm(finalPath, {
     force: true
   })

   console.log("falha criar TMP, erro interno servidor")
   throw new AppError("Falha ao começar upload, tente novamente mais tarde", 500) 

  }

}



// evita nomes iguais

async function gerarCaminhoSemConflito(caminhoOriginal) {

  const diretorio = path.dirname(caminhoOriginal)

  const extensao = path.extname(caminhoOriginal)

  let nomeBase = path.basename(caminhoOriginal, extensao)

  // remove "(numero)" anterior
  nomeBase = nomeBase.replace(/\s\(\d+\)$/, '')

  let contador = 1

  let caminhoFinal = caminhoOriginal

  while (true) {

    try {

      await fsp.access(caminhoFinal)

      // existe
      const novoNome =
        `${nomeBase} (${contador})${extensao}`

      caminhoFinal = path.join(
        diretorio,
        novoNome
      )

      contador++

    } catch {

      // não existe
      return caminhoFinal
    }
  }
}









module.exports = {initiate, uploadPart, complete}