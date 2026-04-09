const nodemailer = require("nodemailer");

const smtpHost = process.env.SMTP_HOST || "smtp.hostinger.com";
const smtpPort = Number(process.env.SMTP_PORT || 587);
const smtpSecure = String(process.env.SMTP_SECURE || "false").toLowerCase() === "true";
const smtpUser = process.env.SMTP_USER || "cadastro@firex1play.com.br";
const smtpPass = process.env.SMTP_PASS || "";
const smtpFrom = process.env.SMTP_FROM || `Fire X1 Play <${smtpUser}>`;

const transporter = nodemailer.createTransport({
  host: smtpHost,
  port: smtpPort,
  secure: smtpSecure,
  auth: {
    user: smtpUser,
    pass: smtpPass
  },
  tls: {
    rejectUnauthorized: false
  }
});

const sendMail = async ({ to, subject, html, text }) => {
  if (!smtpPass) {
    throw new Error("SMTP_PASS não configurado no ambiente.");
  }

  return transporter.sendMail({
    from: smtpFrom,
    to,
    subject,
    text,
    html
  });
};

const sendRegistrationConfirmationEmail = async ({ to, name, code, expiresInMinutes }) => {
  const safeName = String(name || "usuário");

  await sendMail({
    to,
    subject: "Fire X1 Play - Confirmação de cadastro",
    text: `Olá, ${safeName}. Seu código de confirmação é ${code}. Ele expira em ${expiresInMinutes} minutos.`,
    html: `
      <div style="font-family: Arial, sans-serif; color: #222; line-height: 1.5;">
        <h2 style="margin: 0 0 12px; color: #ff6a00;">Confirmação de cadastro</h2>
        <p>Olá, <strong>${safeName}</strong>.</p>
        <p>Seu código de confirmação é:</p>
        <p style="font-size: 28px; letter-spacing: 6px; font-weight: 700; color: #111;">${code}</p>
        <p>Este código expira em <strong>${expiresInMinutes} minutos</strong>.</p>
      </div>
    `
  });
};

const sendPasswordRecoveryEmail = async ({ to, code, expiresInMinutes }) => {
  await sendMail({
    to,
    subject: "Fire X1 Play - Recuperação de senha",
    text: `Seu código para redefinir a senha é ${code}. Ele expira em ${expiresInMinutes} minutos.`,
    html: `
      <div style="font-family: Arial, sans-serif; color: #222; line-height: 1.5;">
        <h2 style="margin: 0 0 12px; color: #ff6a00;">Recuperação de senha</h2>
        <p>Recebemos uma solicitação para redefinir sua senha.</p>
        <p>Seu código é:</p>
        <p style="font-size: 28px; letter-spacing: 6px; font-weight: 700; color: #111;">${code}</p>
        <p>Este código expira em <strong>${expiresInMinutes} minutos</strong>.</p>
      </div>
    `
  });
};

const sendBetNotificationEmail = async ({ to, title, message }) => {
  await sendMail({
    to,
    subject: `Fire X1 Play - ${title}`,
    text: message,
    html: `
      <div style="font-family: Arial, sans-serif; color: #222; line-height: 1.5;">
        <h2 style="margin: 0 0 12px; color: #ff6a00;">${title}</h2>
        <p>${message}</p>
      </div>
    `
  });
};

const sendTwoFactorVerificationEmail = async ({ to, code, expiresInMinutes }) => {
  await sendMail({
    to,
    subject: "Fire X1 Play - Verificação em 2 etapas",
    text: `Seu código para ativar a verificação em 2 etapas é ${code}. Ele expira em ${expiresInMinutes} minutos.`,
    html: `
      <div style="font-family: Arial, sans-serif; color: #222; line-height: 1.5;">
        <h2 style="margin: 0 0 12px; color: #ff6a00;">Verificação em 2 etapas</h2>
        <p>Use o código abaixo para ativar a proteção adicional da sua conta.</p>
        <p style="font-size: 28px; letter-spacing: 6px; font-weight: 700; color: #111;">${code}</p>
        <p>Este código expira em <strong>${expiresInMinutes} minutos</strong>.</p>
      </div>
    `
  });
};

module.exports = {
  sendRegistrationConfirmationEmail,
  sendPasswordRecoveryEmail,
  sendBetNotificationEmail,
  sendTwoFactorVerificationEmail
};