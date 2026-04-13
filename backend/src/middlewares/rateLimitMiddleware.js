const rateLimit = require("express-rate-limit");

const middlewareRate = rateLimit({
  windowMs: 30 * 60 * 1000, // Janela de 30 minutos
  max: 4, // Apenas 4 tentativas!
  message: { erro: "Acesso bloqueado por segurança. Tente novamente em 30 min." },
  standardHeaders: true,
  legacyHeaders: false,
});

module.exports = {middlewareRate};
