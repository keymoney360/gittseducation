const nodemailer = require("nodemailer");
async function sendResetEmail(to, url) {
  if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
    console.warn("SMTP is not configured. Password reset email not sent.");
    return;
  }
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST, port: Number(process.env.SMTP_PORT || 587),
    secure: Number(process.env.SMTP_PORT) === 465,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
  });
  await transporter.sendMail({
    from: process.env.MAIL_FROM, to, subject: "Reset your GITTS-Education password",
    text: `Use this link within 30 minutes to reset your password: ${url}`
  });
}
module.exports = { sendResetEmail };
