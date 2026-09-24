import nodemailer from 'nodemailer';

export async function sendOtp(email: string, code: string, purpose: 'registration' | 'password_reset') {
  const required = ['SMTP_HOST', 'SMTP_USER', 'SMTP_PASS', 'EMAIL_FROM'];
  for (const name of required) {
    if (!process.env[name]) throw new Error(`${name} chưa được cấu hình`);
  }

  const mailer = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: process.env.SMTP_SECURE === 'true',
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
  });

  const subject = purpose === 'registration'
    ? 'Campus Coin - Xác minh email / Verify email'
    : 'Campus Coin - Đặt lại mật khẩu / Reset password';
  await mailer.sendMail({
    from: process.env.EMAIL_FROM,
    to: email,
    subject,
    text: `Mã xác minh của bạn là ${code}. Mã có hiệu lực trong 5 phút.\nYour verification code is ${code}. It expires in 5 minutes.`
  });
}
