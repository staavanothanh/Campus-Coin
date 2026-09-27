import type { ApiError, Locale } from '../types.js';

interface ErrorBannerProps {
  error: ApiError | string | null;
  locale: Locale;
}

const errorMessages: Record<string, { vi: string; en: string }> = {
  UNAUTHORIZED: { vi: 'Phiên đăng nhập đã hết hạn', en: 'Session expired' },
  CSRF_ERROR: { vi: 'Lỗi bảo mật, vui lòng tải lại', en: 'Security error, please reload' },
  CSRF_INVALID: { vi: 'Lỗi bảo mật, vui lòng tải lại', en: 'Security error, please reload' },
  ORIGIN_INVALID: { vi: 'Nguồn yêu cầu không hợp lệ', en: 'Request origin is not allowed' },
  ACCOUNT_DISABLED: { vi: 'Tài khoản đã bị vô hiệu hóa', en: 'Account is disabled' },
  FORBIDDEN: { vi: 'Không đủ quyền', en: 'Insufficient permissions' },
  NOT_FOUND: { vi: 'Không tìm thấy', en: 'Not found' },
  IDEMPOTENCY_CONFLICT: { vi: 'Giao dịch đã được xử lý', en: 'Transaction already processed' },
  VALIDATION_ERROR: { vi: 'Dữ liệu không hợp lệ', en: 'Invalid input' },
  RATE_LIMITED: { vi: 'Quá nhiều yêu cầu, thử lại sau', en: 'Too many requests, try again later' },
  INTERNAL_ERROR: { vi: 'Lỗi hệ thống', en: 'System error' },
  CONFLICT: { vi: 'Dữ liệu đã thay đổi, vui lòng thử lại', en: 'The data changed, please try again' },
  GOOGLE_UNAVAILABLE: { vi: 'Đăng nhập Google chưa được cấu hình', en: 'Google sign-in is not configured' },
  GOOGLE_ACCOUNT_LINK_REQUIRED: { vi: 'Tài khoản Google cần được kết nối trước', en: 'Connect this Google account before signing in' },
  GOOGLE_ACCOUNT_CONFLICT: { vi: 'Tài khoản Google đã được kết nối với người dùng khác', en: 'This Google account is linked to another user' },
  OTP_INVALID: { vi: 'Mã xác minh không đúng hoặc đã hết hạn', en: 'The verification code is invalid or expired' },
  UNVERIFIED_EMAIL: { vi: 'Email chưa được xác minh', en: 'Email has not been verified' },
  INSUFFICIENT_BALANCE: { vi: 'Số dư không đủ', en: 'Insufficient balance' },
  WALLET_NOT_INITIALIZED: { vi: 'Ví của bạn chưa được thiết lập số dư ban đầu. Vui lòng khởi tạo ví trước khi giao dịch.', en: 'Wallet has not been initialized yet. Please set your starting balance.' },
  INSUFFICIENT_WALLET_BALANCE: { vi: 'Số dư ví khả dụng không đủ để thanh toán khoản này', en: 'Insufficient wallet balance for this payment' },
  INSUFFICIENT_SAVINGS_BALANCE: { vi: 'Số dư tiết kiệm không đủ', en: 'Insufficient savings balance' },
  WALLET_ALREADY_INITIALIZED: { vi: 'Ví đã được khởi tạo trước đó', en: 'Wallet already initialized' },
};

function getErrorMessage(error: ApiError | string, locale: Locale): string {
  if (typeof error === 'string') return error;
  const mapped = errorMessages[error.code];
  if (mapped) return locale === 'vi' ? mapped.vi : mapped.en;
  return error.message;
}

/**
 * Error banner that displays API errors with user-friendly messages.
 * Maps error codes to en/vi localized text.
 * Shows field-level details when available.
 */
export function ErrorBanner({ error, locale }: ErrorBannerProps) {
  if (!error) return null;

  const message = getErrorMessage(error, locale);
  const details = typeof error !== 'string' ? error.details : undefined;

  return (
    <div className="error-banner" role="alert">
      <p>{message}</p>
      {details && details.length > 0 && (
        <ul className="error-details">
          {details.map((d, i) => (
            <li key={i}>{d.field ? `${d.field}: ` : ''}{d.message}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
