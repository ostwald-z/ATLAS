//reponsável por processar arquivos enviados na requisição req.file
// ele processa informações e joga o arquivo no req.buffer para o service.

const multer = require("multer")

/*
---------------------------------------------
USA MEMÓRIA RAM


// storage em memória (RAM)
const storage = multer.memoryStorage();


// middleware configurado
const upload = multer({
  storage: storage,
  }
);
---------------------------------------------
*/




// USA O DISCO, NÃO MEMORIA RAM
const upload = multer({
  storage: multer.diskStorage({
    destination: "/tmp", // pasta temporária
    filename: (req, file, cb) => {
      cb(null, Date.now() + "-" + file.originalname);
    }
  })
});



module.exports = upload