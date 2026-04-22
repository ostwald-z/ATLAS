const { MailerSend, EmailParams, Sender, Recipient } = require("mailersend");

const mailerSend = new MailerSend({
  apiKey: process.env.EMAILSENDER_API_KEY,
});


async function sendLoginAlertEmail( user, httpInfo ) {
  //const { ip, location } = httpInfo;

  const revokeLink = `https://seusite.com/security/revoke-session`;

  const sentFrom = new Sender(
    "security@mail.ostwald.top",
    "Sistema Segurança ATLAS"
  );

  const recipients = [
    new Recipient(user.email, user.nome_completo || "Usuário")
  ];

  const htmlContent = `
    <h2>Novo login detectado na sua conta</h2>

    <p><b><u>SISTEMA: ATLAS</u></b>        
    <p><b>Usuário:</b> ${user.user}
    <p><b>Data:</b> ${new Date().toLocaleString()}</p>
    <p><b>IP:</b> ${httpInfo.ip}</p>
    <p><b>Localização:</b> ${httpInfo.location?.city || '-'}, ${httpInfo.location?.region || '-'}, ${httpInfo.location?.country || '-'}</p>

    <br/>

    <p>Se não foi você:</p>

    <a href="${revokeLink}" 
       style="padding:10px 15px;background:red;color:white;text-decoration:none;">
       Revogar acesso e mudar senha
    </a>
  `;

  const textContent = `
Novo login detectado

Data: ${new Date().toLocaleString()}
IP: ${httpInfo.ip}
Localização: ${httpInfo.location?.city || '-'}, ${httpInfo.location?.region || '-'}, ${httpInfo.location?.country || '-'}

Se não foi você, acesse:
${revokeLink}
  `;

  const emailParams = new EmailParams()
    .setFrom(sentFrom)
    .setTo(recipients)
    .setReplyTo(sentFrom)
    .setSubject("Novo login na sua conta")
    .setHtml(htmlContent)
    .setText(textContent);

  try {
    /*console.log("EMAIL PAYLOAD:", {
    from: sentFrom,
    to: recipients,
    subject: "Novo login na sua conta"
    }); */


    await mailerSend.email.send(emailParams);
  } catch (err) {
    console.log("Erro ao enviar email:", err);
  }
}

module.exports = {sendLoginAlertEmail}