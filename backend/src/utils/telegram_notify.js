const { Telegraf } = require('telegraf');

// Apenas inicializa, não precisa do .launch() aqui!
const bot = new Telegraf(process.env.KIMI_BOT_TOKEN);
const MEU_CHAT_ID = process.env.CHAT_ID_TELEGRAM_ADMIN; // Seu ID pessoal



const notifyAdmin = async (mensagem) => {
  try {
    // Usamos o objeto 'telegram' dentro do bot para enviar direto
    await bot.telegram.sendMessage(MEU_CHAT_ID, mensagem, {
      parse_mode: 'HTML'
    });
  } catch (err) {
    console.error("Falha ao enviar notificação pro Telegram", err);
  }
};


// Exemplo de uso em algum lugar do seu backend
// notifyAdmin("O backend Node acabou de processar um pagamento com sucesso! ✅");


module.exports = {notifyAdmin}