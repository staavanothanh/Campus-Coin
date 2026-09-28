export type Language = 'vi' | 'en';

export const text = {
  vi: {
    login: 'Đăng nhập', register: 'Xác minh email', verify: 'Tạo tài khoản', forgot: 'Quên mật khẩu', reset: 'Đặt mật khẩu mới',
    email: 'Email', name: 'Họ và tên', code: 'Mã xác minh', password: 'Mật khẩu', newPassword: 'Mật khẩu mới', confirm: 'Nhập lại mật khẩu',
    remember: 'Ghi nhớ email', show: 'Hiện mật khẩu', hide: 'Ẩn mật khẩu', showShort: 'Hiện', hideShort: 'Ẩn',
    emailRequired: 'Vui lòng nhập email.', emailInvalid: 'Email chưa đúng định dạng.', nameInvalid: 'Họ tên cần từ 2 đến 120 ký tự.', codeInvalid: 'Mã xác minh phải gồm đúng 6 chữ số.',
    passwordRequired: 'Vui lòng nhập mật khẩu.', confirmRequired: 'Vui lòng nhập lại mật khẩu.', passwordInvalid: 'Mật khẩu cần từ 8 đến 128 ký tự.',
    sendCode: 'Gửi mã xác minh', create: 'Tạo tài khoản', change: 'Đổi mật khẩu', resend: 'Gửi lại mã', back: 'Quay lại đăng nhập', signUp: 'Chưa có tài khoản? Đăng ký', forgotLink: 'Quên mật khẩu?',
    googleSignIn: 'Tiếp tục với Google', googleConnect: 'Kết nối Google', googleConnected: 'Đã kết nối Google.', registered: 'Mã xác minh đã được gửi đến email của bạn.', resent: 'Đã gửi lại mã xác minh.', created: 'Tạo tài khoản thành công. Hãy đăng nhập.', resetSent: 'Nếu email đã đăng ký, mã xác minh sẽ được gửi đến email.', changed: 'Đã đổi mật khẩu. Hãy đăng nhập lại.', mismatch: 'Mật khẩu nhập lại chưa khớp.',
    codeHint: 'Nhập 6 chữ số', passwordHint: 'Ít nhất 8 ký tự', wait: 'Đang xử lý...', hello: 'Xin chào!', logout: 'Đăng xuất', subtitle: 'Ghi thu chi và đặt ngân sách dành cho sinh viên', rateLimited: 'Bạn đã thử quá nhiều lần. Vui lòng chờ', seconds: 'giây rồi thử lại', resendWait: (seconds: number) => `Có thể gửi lại mã sau ${seconds} giây.`, error: 'Không thể thực hiện yêu cầu. Vui lòng thử lại.'
  },
  en: {
    login: 'Sign in', register: 'Verify email', verify: 'Create account', forgot: 'Forgot password', reset: 'Set a new password',
    email: 'Email', name: 'Full name', code: 'Verification code', password: 'Password', newPassword: 'New password', confirm: 'Confirm password',
    remember: 'Remember email', show: 'Show password', hide: 'Hide password', showShort: 'Show', hideShort: 'Hide',
    emailRequired: 'Enter your email.', emailInvalid: 'Enter a valid email address.', nameInvalid: 'Name must be between 2 and 120 characters.', codeInvalid: 'Enter the 6-digit verification code.',
    passwordRequired: 'Enter your password.', confirmRequired: 'Re-enter your password.', passwordInvalid: 'Password must be between 8 and 128 characters.',
    sendCode: 'Send verification code', create: 'Create account', change: 'Change password', resend: 'Resend code', back: 'Back to sign in', signUp: 'New here? Create an account', forgotLink: 'Forgot password?',
    googleSignIn: 'Continue with Google', googleConnect: 'Connect Google', googleConnected: 'Google is connected.', registered: 'A verification code has been sent to your email.', resent: 'A new verification code has been sent.', created: 'Account created. Please sign in.', resetSent: 'If this email is registered, a verification code will be sent.', changed: 'Password changed. Please sign in again.', mismatch: 'The passwords do not match.',
    codeHint: 'Enter 6 digits', passwordHint: 'At least 8 characters', wait: 'Please wait...', hello: 'Hello!', logout: 'Sign out', subtitle: 'Track spending and plan a student budget', rateLimited: 'Too many attempts. Please wait', seconds: 'seconds and try again', resendWait: (seconds: number) => `You can resend the code in ${seconds} seconds.`, error: 'The request could not be completed. Please try again.'
  }
};

export const errorText: Record<Language, Record<string, string>> = {
  vi: { UNAUTHORIZED: 'Email hoặc mật khẩu không đúng.', ACCOUNT_DISABLED: 'Tài khoản đã bị khóa.', ORIGIN_INVALID: 'Địa chỉ trang không khớp cấu hình máy chủ.', UNVERIFIED_EMAIL: 'Bạn cần xác minh email trước.', CSRF_INVALID: 'Phiên đăng nhập không hợp lệ. Vui lòng đăng nhập lại.', CONFLICT: 'Email này đã được đăng ký.', OTP_INVALID: 'Mã xác minh không đúng hoặc đã hết hạn.', RATE_LIMITED: 'Vui lòng chờ một phút trước khi yêu cầu mã mới.', EMAIL_UNAVAILABLE: 'Chưa gửi được email. Vui lòng thử lại sau.', GOOGLE_UNAVAILABLE: 'Đăng nhập Google chưa được cấu hình.', GOOGLE_ACCOUNT_LINK_REQUIRED: 'Hãy đăng nhập bằng phương thức hiện có rồi kết nối Google.', GOOGLE_ACCOUNT_CONFLICT: 'Tài khoản Google đã được kết nối với một tài khoản khác.', VALIDATION_ERROR: 'Thông tin nhập chưa hợp lệ.', INTERNAL_ERROR: 'Hệ thống đang bận. Vui lòng thử lại sau.' },
  en: { UNAUTHORIZED: 'Incorrect email or password.', ACCOUNT_DISABLED: 'This account has been disabled.', ORIGIN_INVALID: 'This page address does not match the server configuration.', UNVERIFIED_EMAIL: 'Please verify your email before signing in.', CSRF_INVALID: 'Your session is invalid. Please sign in again.', CONFLICT: 'This email is already registered.', OTP_INVALID: 'The code is incorrect or has expired.', RATE_LIMITED: 'Please wait one minute before requesting another code.', EMAIL_UNAVAILABLE: 'Email could not be sent. Please try again later.', GOOGLE_UNAVAILABLE: 'Google sign in is not configured.', GOOGLE_ACCOUNT_LINK_REQUIRED: 'Sign in with your existing method, then connect Google.', GOOGLE_ACCOUNT_CONFLICT: 'This Google account is connected to another account.', VALIDATION_ERROR: 'Please check the information entered.', INTERNAL_ERROR: 'The service is busy. Please try again later.' }
};
