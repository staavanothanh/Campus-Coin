import { useEffect, useRef, useState, type FormEvent } from 'react';
import {
  User,
  Mail,
  Palette,
  Globe,
  Sun,
  Moon,
  ShieldCheck,
  Check,
  Save,
  RotateCcw,
  Sparkles,
  Wallet,
  Lock,
  CheckCircle2,
  Copy as CopyIcon,
  Eye,
  EyeOff,
} from 'lucide-react';
import { apiPatch, apiPost, ApiRequestError } from '../api-client.js';
import type { ApiError, Session, Locale, Theme } from '../types.js';
import type { Copy } from '../i18n.js';
import { ErrorBanner } from '../components/ErrorBanner.js';
import { CategoryManagementPanel } from '../components/CategoryManagementPanel.js';

const PASSWORD_OTP_RESEND_SECONDS = 60;

interface SettingsScreenProps {
  session: Session;
  theme: Theme;
  onThemeChange: (theme: Theme) => void;
  onSessionUpdate: (session: Session) => void;
  onPasswordReset: () => void;
  t: Copy;
  locale: Locale;
}

export function SettingsScreen({
  session,
  theme,
  onThemeChange,
  onSessionUpdate,
  onPasswordReset,
  t,
  locale
}: SettingsScreenProps) {
  const user = session?.user;
  const initialName = user?.displayName || '';
  const initialLocale: Locale = user?.locale === 'en' ? 'en' : 'vi';

  const [displayName, setDisplayName] = useState(initialName);
  const [prefLocale, setPrefLocale] = useState<Locale>(initialLocale);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<ApiRequestError | string | null>(null);
  const [successMsg, setSuccessMsg] = useState('');
  const [copiedId, setCopiedId] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [passwordStepActive, setPasswordStepActive] = useState(false);
  const [passwordBusy, setPasswordBusy] = useState<'request' | 'resend' | 'reset' | null>(null);
  const [passwordError, setPasswordError] = useState<ApiError | string | null>(null);
  const [passwordStatus, setPasswordStatus] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordSubmitted, setPasswordSubmitted] = useState(false);
  const [resendCooldownSeconds, setResendCooldownSeconds] = useState(0);
  const passwordRequestInProgress = useRef(false);

  const isVi = locale === 'vi';
  const hasChanges =
    displayName.trim() !== initialName.trim() ||
    prefLocale !== initialLocale;

  useEffect(() => {
    setPrefLocale(initialLocale);
  }, [initialLocale]);

  useEffect(() => {
    if (passwordStepActive) document.getElementById('settings-password-otp')?.focus();
  }, [passwordStepActive]);

  useEffect(() => {
    if (resendCooldownSeconds <= 0) return;
    const timer = window.setTimeout(() => {
      setResendCooldownSeconds(current => Math.max(0, current - 1));
    }, 1000);
    return () => window.clearTimeout(timer);
  }, [resendCooldownSeconds]);

  const userIdStr = String(user?.id ?? '');
  const idDisplay = userIdStr
    ? userIdStr.length > 8
      ? `${userIdStr.substring(0, 8)}…`
      : userIdStr
    : '---';

  const avatarLetters = (initialName.trim() || 'U')
    .substring(0, 2)
    .toUpperCase();

  function handleReset() {
    setDisplayName(initialName);
    setPrefLocale(initialLocale);
    setError(null);
    setSuccessMsg('');
  }

  async function handleCopyUserId() {
    if (!userIdStr) return;
    setError(null);
    setSuccessMsg('');
    try {
      await navigator.clipboard.writeText(userIdStr);
      setSuccessMsg(isVi ? 'Đã sao chép mã định danh.' : 'User ID copied.');
      setCopiedId(true);
      window.setTimeout(() => {
        setCopiedId(false);
        setSuccessMsg('');
      }, 2000);
    } catch {
      setCopiedId(false);
      setError(isVi ? 'Không thể sao chép mã định danh trên trình duyệt này.' : 'This browser could not copy the user ID.');
    }
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (loading || !displayName.trim()) return;

    setError(null);
    setSuccessMsg('');
    setLoading(true);

    try {
      const updatedUser = await apiPatch<Session['user']>(
        '/users/me/preferences',
        {
          displayName: displayName.trim(),
          locale: prefLocale
        },
        { 'X-CSRF-Token': session.csrfToken }
      );

      onSessionUpdate({
        ...session,
        user: updatedUser
      });

      setSuccessMsg(
        prefLocale === 'vi'
          ? 'Đã lưu thay đổi cài đặt thành công!'
          : 'Settings saved successfully!'
      );
    } catch (err) {
      if (err instanceof ApiRequestError) {
        setError(err);
      } else {
        setError(t.serverError);
      }
    } finally {
      setLoading(false);
    }
  }

  async function connectGoogle() {
    if (googleLoading || session.googleLinked) return;
    setGoogleLoading(true);
    setError(null);
    try {
      const result = await apiPost<{ url: string }>(
        '/auth/google/link',
        {},
        { 'X-CSRF-Token': session.csrfToken },
      );
      window.location.assign(result.url);
    } catch (err) {
      setError(err instanceof ApiRequestError ? err : t.serverError);
      setGoogleLoading(false);
    }
  }

  function passwordValidationMessage(field: 'otp' | 'newPassword' | 'confirmPassword') {
    if (field === 'otp' && !/^\d{6}$/.test(otp)) {
      return isVi ? 'Nhập mã xác minh gồm 6 chữ số.' : 'Enter the 6-digit verification code.';
    }
    if (field === 'newPassword' && (newPassword.length < 8 || newPassword.length > 128)) {
      return isVi ? 'Mật khẩu phải có từ 8 đến 128 ký tự.' : 'Password must be 8 to 128 characters.';
    }
    if (field === 'confirmPassword') {
      if (!confirmPassword) return isVi ? 'Nhập lại mật khẩu mới.' : 'Confirm your new password.';
      if (newPassword !== confirmPassword) return isVi ? 'Hai mật khẩu chưa khớp.' : 'Passwords do not match.';
    }
    return '';
  }

  function passwordFieldError(field: 'otp' | 'newPassword' | 'confirmPassword') {
    return passwordSubmitted ? passwordValidationMessage(field) : '';
  }

  function showPasswordRequestError(error: unknown) {
    if (error instanceof ApiRequestError) {
      if (error.isRateLimited && error.retryAfter) {
        setResendCooldownSeconds(error.retryAfter);
        setPasswordError(isVi
          ? `Vui lòng đợi ${error.retryAfter} giây rồi thử lại.`
          : `Please wait ${error.retryAfter} seconds before trying again.`);
      } else {
        setPasswordError(error.apiError ?? t.serverError);
      }
      return;
    }
    setPasswordError(t.serverError);
  }

  function genericOtpStatus() {
    return isVi
      ? 'Nếu email đủ điều kiện, mã xác minh sẽ được gửi. Hãy kiểm tra cả thư mục spam.'
      : 'If this email is eligible, a verification code will be sent. Check your spam folder too.';
  }

  async function requestPasswordOtp() {
    if (passwordRequestInProgress.current || !user?.email) return;
    passwordRequestInProgress.current = true;
    setPasswordBusy('request');
    setPasswordError(null);
    setPasswordStatus('');
    try {
      await apiPost('/auth/forgot-password', { email: user.email });
      setPasswordStepActive(true);
      setResendCooldownSeconds(PASSWORD_OTP_RESEND_SECONDS);
      setPasswordStatus(genericOtpStatus());
    } catch (caught) {
      showPasswordRequestError(caught);
    } finally {
      passwordRequestInProgress.current = false;
      setPasswordBusy(null);
    }
  }

  async function resendPasswordOtp() {
    if (passwordRequestInProgress.current || resendCooldownSeconds > 0 || !user?.email) return;
    passwordRequestInProgress.current = true;
    setPasswordBusy('resend');
    setPasswordError(null);
    setPasswordStatus('');
    try {
      await apiPost('/auth/resend-otp', { email: user.email, purpose: 'password_reset' });
      setResendCooldownSeconds(PASSWORD_OTP_RESEND_SECONDS);
      setPasswordStatus(genericOtpStatus());
    } catch (caught) {
      showPasswordRequestError(caught);
    } finally {
      passwordRequestInProgress.current = false;
      setPasswordBusy(null);
    }
  }

  async function submitPasswordReset(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (passwordRequestInProgress.current || !user?.email) return;
    setPasswordSubmitted(true);
    setPasswordError(null);
    setPasswordStatus('');
    setShowNewPassword(false);
    setShowConfirmPassword(false);

    const firstInvalidField = (['otp', 'newPassword', 'confirmPassword'] as const)
      .find(field => passwordValidationMessage(field));
    if (firstInvalidField) {
      document.getElementById(`settings-password-${firstInvalidField}`)?.focus();
      return;
    }

    passwordRequestInProgress.current = true;
    setPasswordBusy('reset');
    let resetSucceeded = false;
    try {
      await apiPost('/auth/reset-password', {
        email: user.email,
        otp,
        newPassword,
      });
      resetSucceeded = true;
    } catch (caught) {
      showPasswordRequestError(caught);
    } finally {
      passwordRequestInProgress.current = false;
      setPasswordBusy(null);
    }

    if (resetSucceeded) onPasswordReset();
  }

  const roleLabel =
    user?.role === 'admin'
      ? isVi ? 'Quản trị viên' : 'Administrator'
      : isVi ? 'Tài khoản cá nhân' : 'Personal Account';

  return (
    <div className="settings-page">
      {/* Profile Overview Header Card */}
      <div className="settings-profile-card">
        <div className="settings-profile-left">
          <div className="settings-avatar-wrapper">
            <div className="settings-avatar">
              {avatarLetters}
            </div>
            <span className="settings-avatar-status" title={isVi ? 'Trực tuyến' : 'Online'} />
          </div>
          <div className="settings-profile-info">
            <div className="settings-profile-name-row">
              <h2>{initialName || (isVi ? 'Người dùng' : 'User')}</h2>
              <span className="role-pill">{roleLabel}</span>
            </div>
            <p className="settings-profile-email">
              <Mail size={14} />
              <span>{user?.email || 'user@campus.edu'}</span>
              {session.googleLinked && <span className="verified-chip">
                <Check size={11} strokeWidth={3} />
                {isVi ? 'Đã kết nối Google' : 'Google connected'}
              </span>}
            </p>
          </div>
        </div>

        <div className="settings-profile-stats">
          <div className="settings-stat-item">
            <span className="stat-label">{isVi ? 'Mã định danh' : 'User ID'}</span>
            <button
              type="button"
              className="id-pill"
              onClick={handleCopyUserId}
              aria-label={isVi ? 'Sao chép mã định danh' : 'Copy user ID'}
              title={isVi ? 'Nhấp để sao chép' : 'Click to copy'}
            >
              <code>{idDisplay}</code>
              {copiedId ? <Check size={12} color="#36856e" /> : <CopyIcon size={12} />}
            </button>
          </div>
          <div className="settings-stat-item">
            <span className="stat-label">{isVi ? 'Ví tài khoản' : 'Wallet'}</span>
            <span className="wallet-chip">
              <Wallet size={12} />
              {session?.walletInitialized
                ? isVi ? 'Đã kích hoạt' : 'Active'
                : isVi ? 'Chưa tạo ví' : 'Inactive'}
            </span>
          </div>
        </div>
      </div>

      {/* Main Settings Form */}
      <form onSubmit={submit} className="settings-content-grid">
        <ErrorBanner
          error={error instanceof ApiRequestError ? error.apiError : error}
          locale={locale}
        />

        {successMsg && (
          <div className="settings-success-alert" role="status">
            <CheckCircle2 size={18} />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Section 1: Personal Info */}
        <section className="settings-section-card">
          <div className="settings-section-header">
            <div className="settings-section-icon mint">
              <User size={18} />
            </div>
            <div>
              <h3>{isVi ? 'Thông tin cá nhân' : 'Personal Information'}</h3>
              <p className="settings-section-desc">
                {isVi
                  ? 'Quản lý tên hiển thị và thông tin liên kết tài khoản của bạn'
                  : 'Manage your display name and linked account details'}
              </p>
            </div>
          </div>

          <div className="settings-fields-group">
            <div className="settings-field">
              <div className="field-header">
                <label htmlFor="settings-displayName">
                  {isVi ? 'Tên hiển thị' : 'Display Name'}
                </label>
                <span className="char-count">{displayName.length}/50</span>
              </div>
              <div className="input-with-icon">
                <User size={16} className="input-icon" />
                <input
                  id="settings-displayName"
                  type="text"
                  required
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  disabled={loading}
                  maxLength={50}
                  placeholder={isVi ? 'Nhập họ và tên...' : 'Enter your name...'}
                />
              </div>
              <p className="field-hint">
                {isVi
                  ? 'Tên này sẽ xuất hiện trên lời chào trang tổng quan và lịch sử giao dịch.'
                  : 'This name appears on the dashboard greeting and transaction logs.'}
              </p>
            </div>

            <div className="settings-field">
              <div className="field-header">
                <label htmlFor="settings-email">{isVi ? 'Email tài khoản' : 'Account email'}</label>
                <span className="readonly-badge">
                  <Lock size={11} />
                  {isVi ? 'Cố định' : 'Read-only'}
                </span>
              </div>
              <div className="input-with-icon readonly">
                <Mail size={16} className="input-icon" />
                <input
                  id="settings-email"
                  type="email"
                  value={user?.email || ''}
                  disabled
                  readOnly
                />
              </div>
              <p className="field-hint">
                {isVi
                  ? 'Email dùng cho đăng nhập email/password và không thể sửa tại đây.'
                  : 'This email is used for email/password sign-in and cannot be changed here.'}
              </p>
              <div className="settings-google-link-row">
                {session.googleLinked ? (
                  <span className="field-hint">
                    {isVi ? 'Bạn có thể dùng Google để đăng nhập.' : 'You can use Google to sign in.'}
                  </span>
                ) : (
                  <button
                    type="button"
                    className="secondary-button"
                    onClick={() => void connectGoogle()}
                    disabled={googleLoading}
                  >
                    <Sparkles size={15} />
                    {googleLoading
                      ? t.loading
                      : isVi ? 'Kết nối Google (tùy chọn)' : 'Connect Google (optional)'}
                  </button>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* Section 2: Appearance & Theme */}
        <section className="settings-section-card">
          <div className="settings-section-header">
            <div className="settings-section-icon amber">
              <Palette size={18} />
            </div>
            <div>
              <h3>{isVi ? 'Giao diện & Màu sắc' : 'Appearance & Theme'}</h3>
              <p className="settings-section-desc">
                {isVi
                  ? 'Tùy chọn phong cách hiển thị sáng hoặc tối phù hợp môi trường làm việc'
                  : 'Customize light or dark mode based on your viewing environment'}
              </p>
            </div>
          </div>

          <div className="theme-options-grid">
            <button
              type="button"
              className={`theme-option-card ${theme === 'light' ? 'is-selected' : ''}`}
              onClick={() => onThemeChange('light')}
              aria-pressed={theme === 'light'}
            >
              <div className="theme-preview light-preview">
                <div className="preview-topbar" />
                <div className="preview-body">
                  <div className="preview-sidebar" />
                  <div className="preview-content">
                    <div className="preview-block bar" />
                    <div className="preview-block card" />
                  </div>
                </div>
              </div>
              <div className="theme-meta">
                <div className="theme-title-row">
                  <Sun size={16} className="theme-icon light" />
                  <strong>{isVi ? 'Chế độ Sáng' : 'Light Mode'}</strong>
                </div>
                <p className="theme-desc">
                  {isVi
                    ? 'Gam màu ấm dịu tự nhiên, rõ nét vào ban ngày'
                    : 'Warm organic tones, optimal for bright lighting'}
                </p>
              </div>
              {theme === 'light' && (
                <div className="option-check">
                  <Check size={14} strokeWidth={3} />
                </div>
              )}
            </button>

            <button
              type="button"
              className={`theme-option-card ${theme === 'dark' ? 'is-selected' : ''}`}
              onClick={() => onThemeChange('dark')}
              aria-pressed={theme === 'dark'}
            >
              <div className="theme-preview dark-preview">
                <div className="preview-topbar" />
                <div className="preview-body">
                  <div className="preview-sidebar" />
                  <div className="preview-content">
                    <div className="preview-block bar" />
                    <div className="preview-block card" />
                  </div>
                </div>
              </div>
              <div className="theme-meta">
                <div className="theme-title-row">
                  <Moon size={16} className="theme-icon dark" />
                  <strong>{isVi ? 'Chế độ Tối' : 'Dark Mode'}</strong>
                </div>
                <p className="theme-desc">
                  {isVi
                    ? 'Màu rừng thẫm sang trọng, êm dịu cho mắt'
                    : 'Deep forest emerald, easy on the eyes at night'}
                </p>
              </div>
              {theme === 'dark' && (
                <div className="option-check">
                  <Check size={14} strokeWidth={3} />
                </div>
              )}
            </button>
          </div>
        </section>

        {/* Section 3: Language & Localization */}
        <section className="settings-section-card">
          <div className="settings-section-header">
            <div className="settings-section-icon coral">
              <Globe size={18} />
            </div>
            <div>
              <h3>{isVi ? 'Ngôn ngữ hiển thị' : 'Display Language'}</h3>
              <p className="settings-section-desc">
                {isVi
                  ? 'Chọn ngôn ngữ hệ thống và định dạng tiền tệ'
                  : 'Choose system language and currency formatting'}
              </p>
            </div>
          </div>

          <div className="language-options-grid">
            <button
              type="button"
              className={`lang-option-card ${prefLocale === 'vi' ? 'is-selected' : ''}`}
              onClick={() => setPrefLocale('vi')}
              disabled={loading}
              aria-pressed={prefLocale === 'vi'}
            >
              <span className="lang-flag">🇻🇳</span>
              <div className="lang-info">
                <strong>Tiếng Việt</strong>
                <small>Định dạng tiền tệ VNĐ (₫) & ngày tháng chuẩn</small>
              </div>
              {prefLocale === 'vi' && (
                <div className="option-check">
                  <Check size={14} strokeWidth={3} />
                </div>
              )}
            </button>

            <button
              type="button"
              className={`lang-option-card ${prefLocale === 'en' ? 'is-selected' : ''}`}
              onClick={() => setPrefLocale('en')}
              disabled={loading}
              aria-pressed={prefLocale === 'en'}
            >
              <span className="lang-flag">🇬🇧</span>
              <div className="lang-info">
                <strong>English</strong>
                <small>Standard English interface & formatting</small>
              </div>
              {prefLocale === 'en' && (
                <div className="option-check">
                  <Check size={14} strokeWidth={3} />
                </div>
              )}
            </button>
          </div>
        </section>

        {/* Security & Environment Information */}
        <section className="settings-section-card">
          <div className="settings-section-header">
            <div className="settings-section-icon green">
              <ShieldCheck size={18} />
            </div>
            <div>
              <h3>{isVi ? 'Bảo mật & Trạng thái phiên' : 'Security & Session Info'}</h3>
              <p className="settings-section-desc">
                {isVi
                  ? 'Chi tiết an toàn kết nối và cơ chế bảo vệ tài khoản'
                  : 'Details on session security and account protection'}
              </p>
            </div>
          </div>

          <div className="security-badges-grid">
            <div className="security-badge-item">
              <div className="sec-icon"><Sparkles size={16} /></div>
              <div>
                <strong>{session.googleLinked ? (isVi ? 'Google đã kết nối' : 'Google connected') : (isVi ? 'Đăng nhập email' : 'Email sign-in')}</strong>
                <p>{session.googleLinked ? (isVi ? 'Đăng nhập Google tùy chọn' : 'Optional Google sign-in') : (isVi ? 'Mật khẩu và OTP' : 'Password and OTP')}</p>
              </div>
            </div>

            <div className="security-badge-item">
              <div className="sec-icon"><ShieldCheck size={16} /></div>
              <div>
                <strong>{isVi ? 'Bảo vệ CSRF' : 'CSRF Protection'}</strong>
                <p>{isVi ? 'Token phiên đang kích hoạt' : 'Double submit token active'}</p>
              </div>
            </div>

            <div className="security-badge-item">
              <div className="sec-icon"><Lock size={16} /></div>
              <div>
                <strong>{isVi ? 'Phiên đăng nhập' : 'Session Security'}</strong>
                <p>{isVi ? 'Cookie phiên có cờ HttpOnly' : 'HttpOnly session cookie'}</p>
              </div>
            </div>

            <div className="security-badge-item">
              <div className="sec-icon"><Wallet size={16} /></div>
              <div>
                <strong>{isVi ? 'Ví cá nhân' : 'Account Wallet'}</strong>
                <p>{session?.walletInitialized ? (isVi ? 'Sẵn sàng giao dịch' : 'Ready') : (isVi ? 'Chưa khởi tạo' : 'Pending')}</p>
              </div>
            </div>
          </div>
        </section>

        {/* Action Bar */}
        <div className={`settings-action-bar ${hasChanges ? 'has-changes' : 'is-saved'}`}>
          <div className="action-bar-status">
            {hasChanges ? (
              <span className="unsaved-badge">
                ● {isVi ? 'Có thay đổi chưa lưu' : 'Unsaved changes'}
              </span>
            ) : (
              <span className="saved-badge">
                ✓ {isVi ? 'Tất cả cài đặt đã được lưu' : 'All settings up to date'}
              </span>
            )}
          </div>

          <div className="action-bar-buttons">
            {hasChanges && (
              <button
                type="button"
                className="secondary-button"
                onClick={handleReset}
                disabled={loading}
              >
                <RotateCcw size={15} />
                <span>{isVi ? 'Đặt lại' : 'Reset'}</span>
              </button>
            )}

            <button
              type="submit"
              className="primary-button"
              disabled={loading || !hasChanges || !displayName.trim()}
            >
              <Save size={16} />
              <span>
                {loading
                  ? t.loading
                  : isVi
                  ? 'Lưu thay đổi'
                  : 'Save changes'}
              </span>
            </button>
          </div>
        </div>
      </form>

      <CategoryManagementPanel locale={locale} csrfToken={session.csrfToken} />

      <section className="settings-section-card settings-password-card" aria-labelledby="settings-password-title">
        <div className="settings-section-header">
          <div className="settings-section-icon green">
            <Lock size={18} />
          </div>
          <div>
            <h3 id="settings-password-title">{isVi ? 'Mật khẩu đăng nhập email' : 'Email sign-in password'}</h3>
            <p className="settings-section-desc">
              {isVi
                ? 'Tạo hoặc đổi mật khẩu bằng mã xác minh gửi đến email tài khoản.'
                : 'Create or change your password with a verification code sent to your account email.'}
            </p>
          </div>
        </div>

        {!passwordStepActive ? (
          <div className="settings-password-start">
            <p className="field-hint">
              {isVi ? `Email xác minh: ${user?.email || '—'}` : `Verification email: ${user?.email || '—'}`}
            </p>
            <button
              type="button"
              className="primary-button"
              onClick={() => void requestPasswordOtp()}
              disabled={passwordBusy !== null || !user?.email}
            >
              <Mail size={15} />
              {passwordBusy === 'request'
                ? (isVi ? 'Đang gửi yêu cầu…' : 'Requesting code…')
                : (isVi ? 'Gửi mã xác minh' : 'Send verification code')}
            </button>
          </div>
        ) : (
          <form className="settings-password-form" aria-labelledby="settings-password-title" onSubmit={submitPasswordReset}>
            <p className="field-hint">
              {isVi ? `Nhập mã gửi đến ${user?.email || 'email tài khoản'}.` : `Enter the code sent to ${user?.email || 'your account email'}.`}
            </p>

            <ErrorBanner error={passwordError} locale={locale} />
            {passwordStatus && <p className="settings-password-status" role="status" aria-live="polite">{passwordStatus}</p>}

            <div className="settings-fields-group settings-password-fields">
              <div className="settings-field">
                <label htmlFor="settings-password-otp">{isVi ? 'Mã xác minh' : 'Verification code'}</label>
                <input
                  id="settings-password-otp"
                  className="settings-password-input"
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  value={otp}
                  onChange={event => setOtp(event.target.value.replace(/\D/g, '').slice(0, 6))}
                  maxLength={6}
                  aria-required="true"
                  aria-invalid={Boolean(passwordFieldError('otp'))}
                  aria-describedby={passwordFieldError('otp') ? 'settings-password-otp-error' : undefined}
                  disabled={passwordBusy !== null}
                />
                {passwordFieldError('otp') && <span id="settings-password-otp-error" className="field-error" role="alert">{passwordFieldError('otp')}</span>}
              </div>

              <div className="settings-field">
                <label htmlFor="settings-password-newPassword">{isVi ? 'Mật khẩu mới' : 'New password'}</label>
                <div className="settings-password-input-row">
                  <input
                    id="settings-password-newPassword"
                    type={showNewPassword ? 'text' : 'password'}
                    autoComplete="new-password"
                    value={newPassword}
                    onChange={event => setNewPassword(event.target.value)}
                    maxLength={128}
                    aria-required="true"
                    aria-invalid={Boolean(passwordFieldError('newPassword'))}
                    aria-describedby={passwordFieldError('newPassword') ? 'settings-password-newPassword-error' : undefined}
                    disabled={passwordBusy !== null}
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(value => !value)}
                    aria-label={showNewPassword ? (isVi ? 'Ẩn mật khẩu mới' : 'Hide new password') : (isVi ? 'Hiện mật khẩu mới' : 'Show new password')}
                    aria-pressed={showNewPassword}
                    disabled={passwordBusy !== null}
                  >
                    {showNewPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                <span className="field-hint">{isVi ? 'Mật khẩu cần có từ 8 đến 128 ký tự.' : 'Use 8 to 128 characters.'}</span>
                {passwordFieldError('newPassword') && <span id="settings-password-newPassword-error" className="field-error" role="alert">{passwordFieldError('newPassword')}</span>}
              </div>

              <div className="settings-field">
                <label htmlFor="settings-password-confirmPassword">{isVi ? 'Nhập lại mật khẩu mới' : 'Confirm new password'}</label>
                <div className="settings-password-input-row">
                  <input
                    id="settings-password-confirmPassword"
                    type={showConfirmPassword ? 'text' : 'password'}
                    autoComplete="new-password"
                    value={confirmPassword}
                    onChange={event => setConfirmPassword(event.target.value)}
                    maxLength={128}
                    aria-required="true"
                    aria-invalid={Boolean(passwordFieldError('confirmPassword'))}
                    aria-describedby={passwordFieldError('confirmPassword') ? 'settings-password-confirmPassword-error' : undefined}
                    disabled={passwordBusy !== null}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(value => !value)}
                    aria-label={showConfirmPassword ? (isVi ? 'Ẩn mật khẩu xác nhận' : 'Hide confirmation password') : (isVi ? 'Hiện mật khẩu xác nhận' : 'Show confirmation password')}
                    aria-pressed={showConfirmPassword}
                    disabled={passwordBusy !== null}
                  >
                    {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                {passwordFieldError('confirmPassword') && <span id="settings-password-confirmPassword-error" className="field-error" role="alert">{passwordFieldError('confirmPassword')}</span>}
              </div>
            </div>

            <div className="settings-password-actions">
              <button
                type="button"
                className="secondary-button"
                onClick={() => void resendPasswordOtp()}
                disabled={passwordBusy !== null || resendCooldownSeconds > 0}
              >
                {passwordBusy === 'resend'
                  ? (isVi ? 'Đang gửi lại…' : 'Resending…')
                  : resendCooldownSeconds > 0
                    ? (isVi ? `Gửi lại mã sau ${resendCooldownSeconds} giây` : `Resend code in ${resendCooldownSeconds}s`)
                    : (isVi ? 'Gửi lại mã' : 'Resend code')}
              </button>
              <button type="submit" className="primary-button" disabled={passwordBusy !== null}>
                <Lock size={15} />
                {passwordBusy === 'reset'
                  ? (isVi ? 'Đang đổi mật khẩu…' : 'Changing password…')
                  : (isVi ? 'Lưu mật khẩu mới' : 'Save new password')}
              </button>
            </div>
          </form>
        )}
      </section>
    </div>
  );
}
