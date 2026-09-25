import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
const errorMessages = {
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
function getErrorMessage(error, locale) {
    if (typeof error === 'string')
        return error;
    const mapped = errorMessages[error.code];
    if (mapped)
        return locale === 'vi' ? mapped.vi : mapped.en;
    return error.message;
}
/**
 * Error banner that displays API errors with user-friendly messages.
 * Maps error codes to en/vi localized text.
 * Shows field-level details when available.
 */
export function ErrorBanner({ error, locale }) {
    if (!error)
        return null;
    const message = getErrorMessage(error, locale);
    const details = typeof error !== 'string' ? error.details : undefined;
    return (_jsxs("div", { className: "error-banner", role: "alert", children: [_jsx("p", { children: message }), details && details.length > 0 && (_jsx("ul", { className: "error-details", children: details.map((d, i) => (_jsxs("li", { children: [d.field ? `${d.field}: ` : '', d.message] }, i))) }))] }));
}
//# sourceMappingURL=ErrorBanner.js.map