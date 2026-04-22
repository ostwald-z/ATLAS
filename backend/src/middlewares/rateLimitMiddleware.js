const rateLimit = require("express-rate-limit");

const middlewareRate = rateLimit({
  windowMs: 30 * 60 * 1000, // Janela de 30 minutos
  max: 8, // Apenas 8 tentativas!
  message: { erro: "Acesso bloqueado por segurança. Tente novamente em 30 min." },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true, // 🔥 AQUI
});

module.exports = {middlewareRate};
