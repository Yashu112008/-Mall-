// Sends the password-reset email. Never throws, so the API answer never reveals whether an email exists.
async function sendResetEmail(user, link) {
  try {
    if (!process.env.SMTP_HOST) {
      if (process.env.NODE_ENV !== 'production') console.log(`\n[DEV] Password reset link for ${user.email}:\n${link}\n`);
      return;
    }
    const nodemailer = require('nodemailer');
    const transport = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT || 587),
      secure: process.env.SMTP_PORT === '465',
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    });
    await transport.sendMail({
      from: process.env.MAIL_FROM || process.env.SMTP_USER,
      to: user.email,
      subject: 'Reset your Mall Manager password',
      text: `Hi ${user.name},\n\nUse this link within 30 minutes to set a new password:\n${link}\n\nIf you did not ask for this, ignore this email.`,
    });
  } catch (e) {
    console.error('Email send failed:', e.message);
  }
}
module.exports = { sendResetEmail };
