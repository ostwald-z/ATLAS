const otplib = require("otplib");
const qrcode = require('qrcode');

// Tenta pegar o authenticator direto, ou dentro do .default
const authenticator = otplib.authenticator || (otplib.default && otplib.default.authenticator);

// Se MESMO ASSIM estiver undefined, a gente trava a aplicação aqui e avisa
if (!authenticator) {
    console.error("🚨 DETALHE DO OTPLIB:", otplib);
    throw new Error("O otplib foi carregado, mas o authenticator não existe dentro dele. Veja o log acima.");
}

// ─── Configuração paranóica ───────────────────────────────────────────────────
authenticator.options = {
  step: 10,       // janela de 10 segundos (padrão é 30)
  window: 1,      // aceita: código anterior, atual e próximo (±1 janela)
  digits: 6,      // 6 dígitos padrão
  algorithm: 'sha1', // sha1 é o padrão TOTP — apps como Google Authenticator esperam isso
};

// ─── Gera o seed do usuário ───────────────────────────────────────────────────
/**
 * Gera um secret aleatório em base32.
 * Chame isso UMA VEZ por usuário, salve no banco (criptografado).
 * @returns {string} secret em base32
 */
function generateSecret() {
  return authenticator.generateSecret(32); // 32 bytes = ~160 bits de entropia
}

// ─── Gera URI + QR Code pra configuração inicial ─────────────────────────────
/**
 * Retorna a URI otpauth:// e o QR code em base64.
 * Use isso no fluxo de setup do 2FA pro usuário escanear com o app.
 * @param {string} secret  - o secret do usuário
 * @param {string} userEmail - email/identificador do usuário
 * @param {string} appName   - nome que aparece no app authenticator
 * @returns {Promise<{ uri: string, qrCode: string }>}
 */
async function generateQRCode(secret, userEmail, appName = 'ATLAS Drive') {
  const uri = authenticator.keyuri(userEmail, appName, secret);
  const qrCode = await qrcode.toDataURL(uri); // base64 PNG, pronto pra jogar no <img>
  return { uri, qrCode };
}

// ─── Valida o token ───────────────────────────────────────────────────────────
/**
 * Verifica se o token informado pelo usuário é válido.
 * Com window: 1, o otplib automaticamente testa:
 *   - token da janela anterior  (agora - 10s)
 *   - token da janela atual     (agora)
 *   - token da janela seguinte  (agora + 10s)
 *
 * @param {string} token  - o código de 6 dígitos digitado pelo usuário
 * @param {string} secret - o secret armazenado no banco pra esse usuário
 * @returns {boolean}
 */

// secret = seed | token = codigo que o user coloca.
function verifyToken(token, secret) {
  try {
    return authenticator.verify({ token, secret });
  } catch {
    return false;
  }
}

module.exports = {
  generateSecret,
  generateQRCode,
  verifyToken,
};