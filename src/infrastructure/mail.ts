import nodemailer from 'nodemailer';

const DEFAULT_TIMEOUT_MS = 10_000;
const MAX_SEND_ATTEMPTS = 2;

export type OtpSender = (email: string, code: string, purpose: 'registration' | 'password_reset') => Promise<void>;

function smtpConfiguration() {
  const required = ['SMTP_HOST', 'SMTP_USER', 'SMTP_PASS', 'EMAIL_FROM'];
  for (const name of required) {
    if (!process.env[name]) throw new Error(`${name} chưa được cấu hình`);
  }

  const port = Number(process.env.SMTP_PORT || 587);
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('SMTP_PORT không hợp lệ');
  const timeoutMs = Number(process.env.SMTP_TIMEOUT_MS || DEFAULT_TIMEOUT_MS);
  if (!Number.isInteger(timeoutMs) || timeoutMs < 1000 || timeoutMs > 30_000) {
    throw new Error('SMTP_TIMEOUT_MS không hợp lệ');
  }
  if (process.env.SMTP_SECURE !== undefined && !['true', 'false'].includes(process.env.SMTP_SECURE)) {
    throw new Error('SMTP_SECURE không hợp lệ');
  }

  const secure = process.env.SMTP_SECURE === 'true';
  return {
    host: process.env.SMTP_HOST!,
    port,
    secure,
    requireTLS: !secure,
    connectionTimeout: timeoutMs,
    greetingTimeout: timeoutMs,
    socketTimeout: timeoutMs,
    auth: { user: process.env.SMTP_USER!, pass: process.env.SMTP_PASS! },
  };
}

export function assertSmtpConfigured() {
  smtpConfiguration();
}

export async function sendOtp(email: string, code: string, purpose: 'registration' | 'password_reset') {
  const mailer = nodemailer.createTransport(smtpConfiguration());
  const subject = purpose === 'registration'
    ? 'Campus Coin - Xác minh email / Verify email'
    : 'Campus Coin - Đặt lại mật khẩu / Reset password';
  const message = {
    from: process.env.EMAIL_FROM!,
    to: email,
    subject,
    text: `Mã xác minh của bạn là ${code}. Mã có hiệu lực trong 5 phút.\nYour verification code is ${code}. It expires in 5 minutes.`,
  };

  try {
    for (let attempt = 0; attempt < MAX_SEND_ATTEMPTS; attempt += 1) {
      try {
        await mailer.sendMail(message);
        return;
      } catch {
        if (attempt === MAX_SEND_ATTEMPTS - 1) throw new Error('SMTP delivery failed');
      }
    }
  } finally {
    mailer.close();
  }
}
