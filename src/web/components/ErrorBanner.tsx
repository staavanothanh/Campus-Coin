import type { ApiError, Locale } from '../types.js';

interface ErrorBannerProps {
  error: ApiError | string | null;
  locale: Locale;
}

const errorMessages: Record<string, { vi: string; en: string }> = {
  UNAUTHORIZED: { vi: 'Phiên đăng nhập đã hết hạn', en: 'Session expired' },
  CSRF_ERROR: { vi: 'Lỗi bảo mật, vui lòng tải lại', en: 'Security error, please reload' },
  ACCOUNT_DISABLED: { vi: 'Tài khoản đã bị vô hiệu hóa', en: 'Account is disabled' },
  FORBIDDEN: { vi: 'Không đủ quyền', en: 'Insufficient permissions' },
  NOT_FOUND: { vi: 'Không tìm thấy', en: 'Not found' },
  IDEMPOTENCY_CONFLICT: { vi: 'Giao dịch đã được xử lý', en: 'Transaction already processed' },
  VALIDATION_ERROR: { vi: 'Dữ liệu không hợp lệ', en: 'Invalid input' },
  RATE_LIMITED: { vi: 'Quá nhiều yêu cầu, thử lại sau', en: 'Too many requests, try again later' },
  INTERNAL_ERROR: { vi: 'Lỗi hệ thống', en: 'System error' },
  INSUFFICIENT_BALANCE: { vi: 'Số dư không đủ', en: 'Insufficient balance' },
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
