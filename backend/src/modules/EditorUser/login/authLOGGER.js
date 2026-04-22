const { buildLogger } = require("../../../logger/logger")

const logger = buildLogger("auth.log", "info")

function logLoginAttempt( user, httpInfo, status, detalhes ) {
  logger.info({
    type: 'Tentativa_login',
    status,
    detalhes,
    userUser: user?.user || null,
    userId: user?.id || null,
    email: user?.email || null,
    
    ip: httpInfo?.ip,
    location: httpInfo?.location,
    userAgent: httpInfo?.userAgent,

  });
}


module.exports = {logLoginAttempt}