const {buildLogger} = require("../../logger/logger")

const logger = buildLogger("impersonateUser.log", "warn")

function impersonateLogger(status, detalhes, httpInfo, idAlvo){
  logger.warn({
    type: 'Tentativa_de_impersonate',
    status,
    detalhes,
    idAlvo,

    ip: httpInfo?.ip,
    location: httpInfo?.location,
    userAgent: httpInfo?.userAgent,

  });
}

module.exports = {impersonateLogger}