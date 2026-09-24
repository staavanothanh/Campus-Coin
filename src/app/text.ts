export type Language = 'vi' | 'en';

export const text = {
  vi: {
    login: 'Đăng nhập', register: 'Xác minh email', verify: 'Tạo tài khoản',
    forgot: 'Quên mật khẩu', reset: 'Đặt mật khẩu mới',
    email: 'Email', name: 'Họ và tên', code: 'Mã xác minh',
    password: 'Mật khẩu', newPassword: 'Mật khẩu mới', confirm: 'Nhập lại mật khẩu',
    remember: 'Ghi nhớ email', show: 'Hiện mật khẩu', hide: 'Ẩn mật khẩu',
    showShort: 'Hiện', hideShort: 'Ẩn',
    sendCode: 'Gửi mã xác minh', create: 'Tạo tài khoản', change: 'Đổi mật khẩu',
    resend: 'Gửi lại mã', back: 'Quay lại đăng nhập',
    signUp: 'Chưa có tài khoản? Đăng ký', forgotLink: 'Quên mật khẩu?',
    registered: 'Mã xác minh đã được gửi đến email của bạn.',
    resent: 'Đã gửi lại mã xác minh.',
    created: 'Tạo tài khoản thành công. Hãy đăng nhập.',
    resetSent: 'Nếu email đã đăng ký, mã xác minh sẽ được gửi đến email.',
    changed: 'Đã đổi mật khẩu. Hãy đăng nhập lại.',
    mismatch: 'Mật khẩu nhập lại chưa khớp.',
    codeHint: 'Nhập 6 chữ số', passwordHint: 'Ít nhất 8 ký tự',
    wait: 'Đang xử lý...', hello: 'Xin chào!', logout: 'Đăng xuất',
    subtitle: 'Ghi thu chi và đặt ngân sách dành cho sinh viên',
    error: 'Không thể thực hiện yêu cầu. Vui lòng thử lại.'
  },
  en: {
    login: 'Sign in', register: 'Verify email', verify: 'Create account',
    forgot: 'Forgot password', reset: 'Set a new password',
    email: 'Email', name: 'Full name', code: 'Verification code',
    password: 'Password', newPassword: 'New password', confirm: 'Confirm password',
    remember: 'Remember email', show: 'Show password', hide: 'Hide password',
    showShort: 'Show', hideShort: 'Hide',
    sendCode: 'Send verification code', create: 'Create account', change: 'Change password',
    resend: 'Resend code', back: 'Back to sign in',
    signUp: 'New here? Create an account', forgotLink: 'Forgot password?',
    registered: 'A verification code has been sent to your email.',
    resent: 'A new verification code has been sent.',
    created: 'Account created. Please sign in.',
    resetSent: 'If this email is registered, a verification code will be sent.',
    changed: 'Password changed. Please sign in again.',
    mismatch: 'The passwords do not match.',
    codeHint: 'Enter 6 digits', passwordHint: 'At least 8 characters',
    wait: 'Please wait...', hello: 'Hello!', logout: 'Sign out',
    subtitle: 'Track spending and plan a student budget',
    error: 'The request could not be completed. Please try again.'
  }
};

export const errorText: Record<Language, Record<string, string>> = {
  vi: {
    UNAUTHORIZED: 'Email hoặc mật khẩu không đúng.',
    ACCOUNT_DISABLED: 'Tài khoản đã bị khóa.',
    UNVERIFIED_EMAIL: 'Bạn cần xác minh email trước.',
    CSRF_INVALID: 'Phiên đăng nhập không hợp lệ. Vui lòng đăng nhập lại.',
    CONFLICT: 'Email này đã được đăng ký.',
    OTP_INVALID: 'Mã xác minh không đúng hoặc đã hết hạn.',
    RATE_LIMITED: 'Vui lòng chờ một phút trước khi yêu cầu mã mới.',
    EMAIL_UNAVAILABLE: 'Chưa gửi được email. Vui lòng thử lại sau.',
    VALIDATION_ERROR: 'Thông tin nhập chưa hợp lệ.',
    INTERNAL_ERROR: 'Hệ thống đang bận. Vui lòng thử lại sau.'
  },
  en: {
    UNAUTHORIZED: 'Incorrect email or password.',
    ACCOUNT_DISABLED: 'This account has been disabled.',
    UNVERIFIED_EMAIL: 'Please verify your email before signing in.',
    CSRF_INVALID: 'Your session is invalid. Please sign in again.',
    CONFLICT: 'This email is already registered.',
    OTP_INVALID: 'The code is incorrect or has expired.',
    RATE_LIMITED: 'Please wait one minute before requesting another code.',
    EMAIL_UNAVAILABLE: 'Email could not be sent. Please try again later.',
    VALIDATION_ERROR: 'Please check the information entered.',
    INTERNAL_ERROR: 'The service is busy. Please try again later.'
  }
};
