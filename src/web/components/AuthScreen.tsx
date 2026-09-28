import { useState, type FormEvent, useRef, useEffect } from 'react';
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  Coins,
  Eye,
  EyeOff,
  KeyRound,
  Lock,
  Mail,
  RefreshCw,
  Sparkles,
  User,
} from 'lucide-react';
import { apiPost, ApiRequestError } from '../api-client.js';
import type { Locale, Session } from '../types.js';
import { AuthOtpInput, type OtpVerificationState } from './AuthOtpInput.js';

interface AuthScreenProps {
  locale: Locale;
  onLocaleChange: (locale: Locale) => void;
  onAuthenticated: (session: Session) => void;
  initialNotice?: string;
  noticeKind?: 'status' | 'error';
}

type AuthMode = 'login' | 'register' | 'verify' | 'register-details' | 'forgot' | 'reset' | 'reset-password';

export function AuthScreen({
  locale,
  onLocaleChange,
  onAuthenticated,
  initialNotice = '',
  noticeKind = 'status',
}: AuthScreenProps) {
  const [mode, setMode] = useState<AuthMode>('login');
  const [email, setEmail] = useState(() => {
    try {
      return localStorage.getItem('campus_remember_email') || '';
    } catch {
      return '';
    }
  });
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [otp, setOtp] = useState('');
  const [otpVerificationState, setOtpVerificationState] = useState<OtpVerificationState>('typing');
  const [rememberMe, setRememberMe] = useState(() => Boolean(localStorage.getItem('campus_remember_email')));
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(initialNotice);
  const [messageType, setMessageType] = useState<'status' | 'error'>(noticeKind);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [resendCooldown, setResendCooldown] = useState(0);

  const isVi = locale === 'vi';

  // Countdown timer for resend OTP
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setInterval(() => {
      setResendCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

  useEffect(() => {
    if (otpVerificationState !== 'accepted') return;
    const nextMode: AuthMode | null = mode === 'verify'
      ? 'register-details'
      : mode === 'reset'
        ? 'reset-password'
        : null;
    if (!nextMode) return;

    const prefersReducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
    const timer = window.setTimeout(() => {
      setMode(nextMode);
      setOtpVerificationState('typing');
      setFieldErrors({});
      setMessageType('status');
      setMessage(mode === 'verify'
        ? (isVi ? 'Email đã xác minh. Hãy hoàn tất thông tin tài khoản.' : 'Email verified. Complete your account details.')
        : (isVi ? 'Mã hợp lệ. Hãy đặt mật khẩu mới.' : 'Code verified. Set your new password.'));
    }, prefersReducedMotion ? 0 : 760);
    return () => window.clearTimeout(timer);
  }, [isVi, mode, otpVerificationState]);

  function switchMode(newMode: AuthMode) {
    setMode(newMode);
    setMessage('');
    setFieldErrors({});
    setPassword('');
    setConfirmPassword('');
    setOtp('');
    setOtpVerificationState('typing');
    setShowPassword(false);
    setShowConfirmPassword(false);
  }

  function handleOtpChange(value: string) {
    setOtp(value);
    setOtpVerificationState('typing');
    setFieldErrors((current) => {
      if (!current.otp) return current;
      const remaining: Record<string, string> = {};
      for (const [key, value] of Object.entries(current)) {
        if (key !== 'otp') remaining[key] = value;
      }
      return remaining;
    });
    if (messageType === 'error') setMessage('');
  }

  function validate(): boolean {
    const errors: Record<string, string> = {};

    if (mode === 'login' || mode === 'register' || mode === 'forgot') {
      if (!email.trim()) {
        errors.email = isVi ? 'Vui lòng nhập địa chỉ email.' : 'Email is required.';
      } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
        errors.email = isVi ? 'Email chưa đúng định dạng.' : 'Invalid email format.';
      }
    }

    if (mode === 'verify' || mode === 'reset') {
      if (!otp.trim()) {
        errors.otp = isVi ? 'Vui lòng nhập mã OTP.' : 'Verification code is required.';
      } else if (!/^\d{6}$/.test(otp.trim())) {
        errors.otp = isVi ? 'Mã xác minh phải gồm đúng 6 chữ số.' : 'Must be a 6-digit code.';
      }
    }

    if (mode === 'login' && !password) {
      errors.password = isVi ? 'Vui lòng nhập mật khẩu.' : 'Password is required.';
    }

    if (mode === 'register-details' || mode === 'reset-password') {
      if (!password) {
        errors.password = isVi ? 'Vui lòng nhập mật khẩu.' : 'Password is required.';
      } else if (password.length < 8 || password.length > 128) {
        errors.password = isVi ? 'Mật khẩu cần từ 8 đến 128 ký tự.' : 'Password must be 8 to 128 characters.';
      }
    }

    if (mode === 'register-details' || mode === 'reset-password') {
      if (password !== confirmPassword) {
        errors.confirmPassword = isVi ? 'Mật khẩu nhập lại không khớp.' : 'Passwords do not match.';
      }
    }

    if (mode === 'register-details') {
      if (fullName.trim().length < 2 || fullName.trim().length > 120) {
        errors.fullName = isVi ? 'Họ và tên cần từ 2 đến 120 ký tự.' : 'Full name must be 2 to 120 characters.';
      }
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!validate() || loading) return;

    setLoading(true);
    setMessage('');

    try {
      if (mode === 'login') {
        const session = await apiPost<Session>('/auth/login', {
          email: email.trim(),
          password,
        });

        if (rememberMe) {
          localStorage.setItem('campus_remember_email', email.trim());
        } else {
          localStorage.removeItem('campus_remember_email');
        }

        onAuthenticated(session);
        return;
      }

      if (mode === 'register') {
        const res = await apiPost<{ message: string }>('/auth/register', { email: email.trim() });
        setOtp('');
        setOtpVerificationState('typing');
        setMode('verify');
        setMessageType('status');
        setMessage(res?.message || (isVi ? 'Mã xác minh đã được gửi đến email của bạn.' : 'Verification code sent to your email.'));
        setResendCooldown(60);
        return;
      }

      if (mode === 'verify' || mode === 'reset') {
        const purpose = mode === 'verify' ? 'registration' : 'password_reset';
        setOtpVerificationState('checking');
        await apiPost<{ message: string }>('/auth/verify-otp', {
          email: email.trim(),
          purpose,
          otp: otp.trim(),
        });
        setOtpVerificationState('accepted');
        setMessageType('status');
        setMessage(isVi ? 'Mã xác minh hợp lệ.' : 'Verification code accepted.');
        return;
      }

      if (mode === 'register-details') {
        const res = await apiPost<{ message: string }>('/auth/verify-registration', {
          email: email.trim(),
          fullName: fullName.trim(),
          otp: otp.trim(),
          password,
          locale,
        });
        switchMode('login');
        setMessageType('status');
        setMessage(res?.message || (isVi ? 'Đăng ký thành công! Hãy đăng nhập ngay.' : 'Registration successful! Please sign in.'));
        return;
      }

      if (mode === 'forgot') {
        const res = await apiPost<{ message: string }>('/auth/forgot-password', { email: email.trim() });
        setOtp('');
        setOtpVerificationState('typing');
        setMode('reset');
        setMessageType('status');
        setMessage(res?.message || (isVi ? 'Nếu email tồn tại, mã xác nhận sẽ được gửi.' : 'If email exists, verification code will be sent.'));
        setResendCooldown(60);
        return;
      }

      if (mode === 'reset-password') {
        const res = await apiPost<{ message: string }>('/auth/reset-password', {
          email: email.trim(),
          otp: otp.trim(),
          newPassword: password,
        });
        switchMode('login');
        setMessageType('status');
        setMessage(res?.message || (isVi ? 'Đã đổi mật khẩu thành công! Hãy đăng nhập lại.' : 'Password reset successful! Please sign in.'));
        return;
      }
    } catch (caught) {
      if ((mode === 'verify' || mode === 'reset') && otpVerificationState === 'checking') {
        setOtpVerificationState('typing');
      }
      setMessageType('error');
      if (caught instanceof ApiRequestError) {
        if (caught.apiError?.code === 'UNAUTHORIZED') {
          setMessage(isVi ? 'Email hoặc mật khẩu không chính xác.' : 'Incorrect email or password.');
        } else if (caught.apiError?.code === 'UNVERIFIED_EMAIL') {
          setMessage(isVi ? 'Email chưa được xác minh. Vui lòng hoàn tất xác minh trước.' : 'Email is not verified yet.');
        } else if (caught.apiError?.code === 'CONFLICT') {
          setMessage(isVi ? 'Email này đã được sử dụng bởi một tài khoản khác.' : 'This email is already registered.');
        } else if (caught.apiError?.code === 'OTP_INVALID') {
          if (mode === 'verify' || mode === 'reset') {
            setOtpVerificationState('rejected');
          } else if (mode === 'register-details' || mode === 'reset-password') {
            setMode(mode === 'register-details' ? 'verify' : 'reset');
            setOtp('');
            setOtpVerificationState('typing');
            setPassword('');
            setConfirmPassword('');
            setShowPassword(false);
            setShowConfirmPassword(false);
          }
          setMessage(isVi ? 'Mã xác minh không đúng hoặc đã hết hạn.' : 'Invalid or expired verification code.');
        } else if (caught.apiError?.code === 'RATE_LIMITED') {
          if (mode === 'verify' || mode === 'reset') setOtpVerificationState('typing');
          setMessage(isVi ? 'Bạn đã thử quá nhiều lần. Vui lòng chờ một lát rồi thử lại.' : 'Too many attempts. Please try again later.');
        } else {
          setMessage(caught.apiError?.message || (isVi ? 'Có lỗi xảy ra, vui lòng thử lại.' : 'An error occurred. Please try again.'));
        }
      } else {
        setMessage(isVi ? 'Không thể kết nối máy chủ. Vui lòng thử lại sau.' : 'Failed to connect to server. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleResendOtp() {
    if (resendCooldown > 0 || !email.trim()) return;
    setLoading(true);
    try {
      const purpose = mode === 'verify' ? 'registration' : 'password_reset';
      const res = await apiPost<{ message: string }>('/auth/resend-otp', { email: email.trim(), purpose });
      setOtp('');
      setOtpVerificationState('typing');
      setFieldErrors({});
      setMessageType('status');
      setMessage(res?.message || (isVi ? 'Đã gửi lại mã OTP thành công.' : 'Verification code resent.'));
      setResendCooldown(60);
    } catch (caught) {
      setMessageType('error');
      setMessage(isVi ? 'Chưa thể gửi lại mã, vui lòng đợi giây lát.' : 'Failed to resend code. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-page-container">
      {/* Dynamic decorative background glows */}
      <div className="auth-ambient-glow glow-1" />
      <div className="auth-ambient-glow glow-2" />

      {/* Top Header Bar */}
      <header className="auth-header-bar">
        <div className="auth-brand-logo">
          <div className="brand-mark">
            <Coins size={22} strokeWidth={2.4} />
          </div>
          <span className="brand-text">campus<span>coin</span></span>
        </div>
        <button
          type="button"
          className="locale-toggle"
          onClick={() => onLocaleChange(isVi ? 'en' : 'vi')}
          aria-label={isVi ? 'Đổi sang Tiếng Anh' : 'Switch to Vietnamese'}
        >
          {isVi ? 'EN' : 'VI'}
        </button>
      </header>

      {/* Center Auth Card */}
      <main className="auth-card-wrapper">
        <div className="auth-card">
          {/* Header of the Card */}
          <div className="auth-card-header">
            <div className="auth-icon-badge">
              {mode === 'login' && <Lock size={22} />}
              {mode === 'register' && <Sparkles size={22} />}
              {(mode === 'verify' || mode === 'register-details') && <Mail size={22} />}
              {mode === 'forgot' && <KeyRound size={22} />}
              {(mode === 'reset' || mode === 'reset-password') && <KeyRound size={22} />}
            </div>
            <h2>
              {mode === 'login' && (isVi ? 'Đăng nhập tài khoản' : 'Sign in to account')}
              {mode === 'register' && (isVi ? 'Đăng ký tài khoản' : 'Create an account')}
              {mode === 'verify' && (isVi ? 'Xác minh email' : 'Verify your email')}
              {mode === 'register-details' && (isVi ? 'Hoàn tất tài khoản' : 'Complete your account')}
              {mode === 'forgot' && (isVi ? 'Khôi phục mật khẩu' : 'Forgot password')}
              {mode === 'reset' && (isVi ? 'Xác minh mã' : 'Verify your code')}
              {mode === 'reset-password' && (isVi ? 'Đặt lại mật khẩu' : 'Reset your password')}
            </h2>
            <p className="auth-card-subtitle">
              {mode === 'login' && (isVi ? 'Quản lý thu chi và ngân sách sinh viên thông minh' : 'Smart student budget & expense management')}
              {mode === 'register' && (isVi ? 'Nhập email để nhận mã xác minh tạo tài khoản mới' : 'Enter your email to receive a verification code')}
              {mode === 'verify' && (isVi ? `Nhập mã 6 chữ số đã gửi tới ${email}` : `Enter the 6-digit code sent to ${email}`)}
              {mode === 'register-details' && (isVi ? 'Email đã xác minh. Hãy tạo tên tài khoản và mật khẩu.' : 'Email verified. Choose your account name and password.')}
              {mode === 'forgot' && (isVi ? 'Chúng tôi sẽ gửi mã đặt lại mật khẩu đến email của bạn' : 'We will send a reset code to your email')}
              {mode === 'reset' && (isVi ? `Nhập mã 6 chữ số đã gửi tới ${email}` : `Enter the 6-digit code sent to ${email}`)}
              {mode === 'reset-password' && (isVi ? 'Mã đã xác minh. Tạo mật khẩu mới cho tài khoản.' : 'Code verified. Create a new password for your account.')}
            </p>
          </div>

          {/* Feedback Notice */}
          {message && (
            <div className={`auth-alert-box ${messageType === 'error' ? 'alert-error' : 'alert-success'}`} role={messageType === 'error' ? 'alert' : 'status'}>
              {messageType === 'error' ? <AlertCircle size={18} /> : <CheckCircle2 size={18} />}
              <span>{message}</span>
            </div>
          )}

          {/* Form */}
          <form className="auth-form" onSubmit={handleSubmit} noValidate>
            {/* EMAIL INPUT (Login, Register, Forgot) */}
            {(mode === 'login' || mode === 'register' || mode === 'forgot') && (
              <div className="auth-input-group">
                <label htmlFor="auth-email">{isVi ? 'Địa chỉ Email' : 'Email Address'}</label>
                <div className={`auth-input-wrapper ${fieldErrors.email ? 'has-error' : ''}`}>
                  <Mail className="input-icon" size={18} />
                  <input
                    id="auth-email"
                    type="email"
                    placeholder="student@university.edu.vn"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    autoComplete="email"
                    required
                  />
                </div>
                {fieldErrors.email && <span className="auth-field-error">{fieldErrors.email}</span>}
              </div>
            )}

            {/* ACCOUNT NAME (after registration OTP has been verified) */}
            {mode === 'register-details' && (
              <div className="auth-input-group">
                <label htmlFor="auth-name">{isVi ? 'Họ và tên của bạn' : 'Your Full Name'}</label>
                <div className={`auth-input-wrapper ${fieldErrors.fullName ? 'has-error' : ''}`}>
                  <User className="input-icon" size={18} />
                  <input
                    id="auth-name"
                    type="text"
                    placeholder={isVi ? 'Nguyễn Văn A' : 'Alex Johnson'}
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    required
                  />
                </div>
                {fieldErrors.fullName && <span className="auth-field-error">{fieldErrors.fullName}</span>}
              </div>
            )}

            {/* OTP-only screens; account details are entered after server verification. */}
            {(mode === 'verify' || mode === 'reset') && (
              <div className="auth-input-group">
                <div className="auth-label-row">
                  <label htmlFor="auth-otp">{isVi ? 'Mã xác minh (OTP)' : 'Verification Code (OTP)'}</label>
                  <button
                    type="button"
                    className="auth-link-button small"
                    onClick={handleResendOtp}
                    disabled={resendCooldown > 0 || loading || otpVerificationState !== 'typing'}
                  >
                    {resendCooldown > 0
                      ? `${isVi ? 'Gửi lại sau' : 'Resend in'} ${resendCooldown}s`
                      : (isVi ? 'Gửi lại mã' : 'Resend code')}
                  </button>
                </div>
                <div className={`auth-input-wrapper auth-otp-input-wrapper ${fieldErrors.otp ? 'has-error' : ''}`}>
                  <AuthOtpInput
                    id="auth-otp"
                    value={otp}
                    onChange={handleOtpChange}
                    ariaLabel={isVi ? 'Mã xác minh gồm 6 chữ số' : 'Verification code, 6 digits'}
                    describedBy={fieldErrors.otp ? 'auth-otp-error' : undefined}
                    invalid={Boolean(fieldErrors.otp) || otpVerificationState === 'rejected'}
                    verificationState={otpVerificationState}
                    locale={locale}
                    onRejectedAnimationComplete={() => {
                      setOtp('');
                      setOtpVerificationState('typing');
                    }}
                  />
                </div>
                {fieldErrors.otp && <span id="auth-otp-error" className="auth-field-error" role="alert">{fieldErrors.otp}</span>}
              </div>
            )}

            {/* PASSWORD INPUT (login or after OTP verification) */}
            {(mode === 'login' || mode === 'register-details' || mode === 'reset-password') && (
              <div className="auth-input-group">
                <label htmlFor="auth-password">
                  {mode === 'reset-password' ? (isVi ? 'Mật khẩu mới' : 'New Password') : (isVi ? 'Mật khẩu' : 'Password')}
                </label>
                <div className={`auth-input-wrapper ${fieldErrors.password ? 'has-error' : ''}`}>
                  <Lock className="input-icon" size={18} />
                  <input
                    id="auth-password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                    required
                  />
                  <button
                    type="button"
                    className="input-eye-button"
                    onClick={() => setShowPassword(!showPassword)}
                    tabIndex={-1}
                    aria-label={showPassword ? (isVi ? 'Ẩn mật khẩu' : 'Hide password') : (isVi ? 'Hiện mật khẩu' : 'Show password')}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
                {fieldErrors.password && <span className="auth-field-error">{fieldErrors.password}</span>}
              </div>
            )}

            {/* PASSWORD CONFIRMATION (registration and password reset) */}
            {(mode === 'register-details' || mode === 'reset-password') && (
              <div className="auth-input-group">
                <label htmlFor="auth-confirm-password">{isVi ? 'Nhập lại mật khẩu' : 'Confirm Password'}</label>
                <div className={`auth-input-wrapper ${fieldErrors.confirmPassword ? 'has-error' : ''}`}>
                  <Lock className="input-icon" size={18} />
                  <input
                    id="auth-confirm-password"
                    type={showConfirmPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    autoComplete="new-password"
                    required
                  />
                  <button
                    type="button"
                    className="input-eye-button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    tabIndex={-1}
                    aria-label={showConfirmPassword ? (isVi ? 'Ẩn mật khẩu' : 'Hide password') : (isVi ? 'Hiện mật khẩu' : 'Show password')}
                  >
                    {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
                {fieldErrors.confirmPassword && <span className="auth-field-error">{fieldErrors.confirmPassword}</span>}
              </div>
            )}

            {/* REMEMBER ME & FORGOT PASSWORD ROW (Login mode only) */}
            {mode === 'login' && (
              <div className="auth-remember-row">
                <label className="auth-checkbox-label">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                  />
                  <span>{isVi ? 'Ghi nhớ email' : 'Remember email'}</span>
                </label>
                <button
                  type="button"
                  className="auth-link-button"
                  onClick={() => switchMode('forgot')}
                >
                  {isVi ? 'Quên mật khẩu?' : 'Forgot password?'}
                </button>
              </div>
            )}

            {/* PRIMARY SUBMIT BUTTON */}
            <button
              type="submit"
              className="auth-submit-button"
              disabled={loading || ((mode === 'verify' || mode === 'reset') && otpVerificationState !== 'typing')}
            >
              {loading ? (
                <>
                  <RefreshCw className="spin-icon" size={18} />
                  <span>{isVi ? 'Đang xử lý...' : 'Please wait...'}</span>
                </>
              ) : (
                <>
                  <span>
                    {mode === 'login' && (isVi ? 'Đăng nhập' : 'Sign in')}
                    {mode === 'register' && (isVi ? 'Gửi mã xác minh' : 'Send verification code')}
                    {mode === 'verify' && (isVi ? 'Xác minh mã' : 'Verify code')}
                    {mode === 'register-details' && (isVi ? 'Tạo tài khoản' : 'Create account')}
                    {mode === 'forgot' && (isVi ? 'Gửi mã khôi phục' : 'Send Reset Code')}
                    {mode === 'reset' && (isVi ? 'Xác minh mã' : 'Verify code')}
                    {mode === 'reset-password' && (isVi ? 'Lưu mật khẩu mới' : 'Save New Password')}
                  </span>
                  <ArrowRight size={18} />
                </>
              )}
            </button>
          </form>

          {/* GOOGLE SIGN IN SECTION (Shown in Login & Register modes) */}
          {(mode === 'login' || mode === 'register') && (
            <div className="auth-social-section">
              <div className="auth-divider">
                <span>{isVi ? 'hoặc' : 'or continue with'}</span>
              </div>

              <a
                className="auth-google-button"
                href="/api/v1/auth/google/start"
                title={isVi ? 'Đăng nhập bằng tài khoản Google' : 'Sign in with Google'}
              >
                <svg className="google-svg" viewBox="0 0 24 24" width="20" height="20">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </svg>
                <span>{isVi ? 'Đăng nhập bằng Gmail' : 'Sign in with Google'}</span>
              </a>
            </div>
          )}

          {/* FOOTER SWITCHER (Don't have an account? Sign up / Back to login) */}
          <div className="auth-card-footer">
            {mode === 'login' ? (
              <p>
                {isVi ? 'Chưa có tài khoản?' : "Don't have an account?"}{' '}
                <button
                  type="button"
                  className="auth-link-highlight"
                  onClick={() => switchMode('register')}
                >
                  {isVi ? 'Đăng ký ngay' : 'Sign up'}
                </button>
              </p>
            ) : (
              <>
                {(mode === 'verify' || mode === 'register-details' || mode === 'reset' || mode === 'reset-password') && (
                  <p>
                    <button
                      type="button"
                      className="auth-link-highlight"
                      onClick={() => switchMode(mode === 'verify' ? 'register' : mode === 'register-details' ? 'verify' : mode === 'reset' ? 'forgot' : 'reset')}
                    >
                      {mode === 'verify' && (isVi ? 'Đổi email đăng ký' : 'Change registration email')}
                      {mode === 'register-details' && (isVi ? 'Quay lại nhập mã' : 'Back to verification code')}
                      {mode === 'reset' && (isVi ? 'Đổi email khôi phục' : 'Change recovery email')}
                      {mode === 'reset-password' && (isVi ? 'Quay lại mã xác minh' : 'Back to verification code')}
                    </button>
                  </p>
                )}
                <p>
                  {mode === 'forgot' || mode === 'reset' || mode === 'reset-password'
                    ? (isVi ? 'Nhớ mật khẩu rồi?' : 'Remembered your password?')
                    : (isVi ? 'Đã có tài khoản?' : 'Already have an account?')}
                  {' '}
                  <button
                    type="button"
                    className="auth-link-highlight"
                    onClick={() => switchMode('login')}
                  >
                    {isVi ? 'Đăng nhập ngay' : 'Sign in'}
                  </button>
                </p>
              </>
            )}
          </div>
        </div>
      </main>

      <footer className="auth-page-footer">
        <p>© 2026 Campus Coin · {isVi ? 'Ứng dụng quản lý tài chính sinh viên' : 'Student Financial Management'}</p>
      </footer>
    </div>
  );
}
