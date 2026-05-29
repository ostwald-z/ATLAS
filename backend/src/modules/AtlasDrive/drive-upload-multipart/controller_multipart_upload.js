
const service = require("./service_multipart_upload")


const fsp = require("fs/promises")

async function controller_initiate_upload(req,res,next) {
	try{

    console.log("chegou initiate upload")

		const result = await service.initiate(req.body)
  		res.json(result)


	}catch(erro){
		next(erro)
	}
}



const Busboy = require('busboy')

async function uploadPart_controller(req, res, next) {

  try{


    console.log("chegou part upload")

    const busboy = Busboy({
      headers: req.headers,
    });

    let uploadId;
    let partNumber;
    let fileStream;

    let pipelinePromise;
    
    
    busboy.on('field', (fieldname, value) => {
      if (fieldname === 'uploadId') uploadId = value;
      if (fieldname === 'partNumber') partNumber = value;
    });

    busboy.on('file', (fieldname, stream, info) => {
      if (fieldname === 'chunk') {
        // campos já chegaram, inicia o pipeline imediatamente
        pipelinePromise = service.uploadPart({ uploadId, partNumber, stream });
      }
    });

    busboy.on('finish', async () => {
      try {
        await pipelinePromise;
        res.sendStatus(200);
      } catch (err) {
        console.error(err);
        res.sendStatus(500);
      }
    });

    req.pipe(busboy);

  }catch(erro){


    const uploadIdSafe = path.basename(uploadId)

    const filepath = path.join(
      "/tmp/uploads-atlas",
      uploadIdSafe,
      `part-${partNumber}`
    )

    await fsp.rm(filepath, {
      force: true
    })
    next(erro)
  }

}





async function complete_controller(req, res, next) {
	try{
		const id_user = req.user.id

		const {uploadId, nome_arquivo, caminho_escolhido} = req.body

		const result = await service.complete(uploadId, nome_arquivo, caminho_escolhido ,id_user)
		res.json(result)
	
	}catch(erro){
		next(erro)
	}

}



module.exports = {controller_initiate_upload, uploadPart_controller, complete_controller}