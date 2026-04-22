const { buildLogger } = require("../../../logger/logger")

const logger = buildLogger("create.log", "warn")

function logCreateAttemptive(status, detalhes, httpInfo, user, email, nome_completo, obs, chaveRole, chaveCriar,chaveNoPending){
  logger.warn({
    type: 'Tentativa_criação',
    status,
    detalhes,
    user,
    nome_completo,
    email,
    obs,
    chaveCriar,
    chaveNoPending,
    chaveRole,

    ip: httpInfo?.ip,
    location: httpInfo?.location,
    userAgent: httpInfo?.userAgent,

  });
}


module.exports = {logCreateAttemptive}