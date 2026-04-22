const { getLocationFromIP } = require("../../utils/geo")

function httpInfoMiddleware(req, res, next) {
  try {
    // pega IP real (funciona com proxy se trust proxy estiver ativo)
    const ip =
        req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
        req.socket?.remoteAddress ||
        req.ip || '127.0.0.1'; // fallback LOCALHOST


    const location = getLocationFromIP(ip);

    req.httpInfo = {
      ip,
      location,
      userAgent: req.headers['user-agent'] || null,
      method: req.method,
      url: req.originalUrl,
      timestamp: new Date().toISOString()
    };

    return next();
  } catch (err) {
    // nunca quebra request por causa de log
    req.httpInfo = {
      ip: null,
      location: null,
      userAgent: null,
      method: req.method,
      url: req.originalUrl,
      timestamp: new Date().toISOString()
    };

    return next();
  }
}

module.exports = {httpInfoMiddleware}