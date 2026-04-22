const {buildLogger} = require("../../../logger/logger")

const logger = buildLogger("deletarUser.log", "warn")

function deletarLogger(status, detalhes, httpInfo, idAlvo, IdDeQuemFez){
  logger.warn({
    type: 'Tentativa_de_remoção',
    status,
    detalhes,
    idAlvo,
    Autor: IdDeQuemFez,

    ip: httpInfo?.ip,
    location: httpInfo?.location,
    userAgent: httpInfo?.userAgent,

  });
}

module.exports = {deletarLogger}