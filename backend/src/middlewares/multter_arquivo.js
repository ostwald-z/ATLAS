//reponsável por processar arquivos enviados na requisição req.file
// ele processa informações e joga o arquivo no req.buffer para o service.

const multer = require("multer")


// storage em memória (RAM)
const storage = multer.memoryStorage();


// middleware configurado
const upload = multer({
  storage: storage,
  }
);

module.exports = upload