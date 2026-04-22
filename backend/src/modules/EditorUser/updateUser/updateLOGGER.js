const { buildLogger } = require("../../../logger/logger");

const logger = buildLogger("updateUser.log", "warn");

function logUpdate({
  status,
  detalhes,
  actorId,
  targetId,
  changes = [],
  httpInfo = {},
}) {
  logger.warn({
    type: "AUDIT_USER_UPDATE",

    status, // "sucesso" | "falha"
    detalhes,

    actor: {
      id: actorId,
    },

    target: {
      id: targetId,
    },

    changes, // 🔥 PADRÃO NOVO

    context: {
      ip: httpInfo?.ip,
      location: httpInfo?.location,
      userAgent: httpInfo?.userAgent,
    },
  });
}

module.exports = { logUpdate };