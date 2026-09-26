import { useState, type FormEvent } from 'react';
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
  Copy as CopyIcon
} from 'lucide-react';
import { apiPatch, ApiRequestError } from '../api-client.js';
import type { Session, Locale, Theme } from '../types.js';
import type { Copy } from '../i18n.js';
import { ErrorBanner } from '../components/ErrorBanner.js';

interface SettingsScreenProps {
  session: Session;
  theme: Theme;
  onThemeChange: (theme: Theme) => void;
  onSessionUpdate: (session: Session) => void;
  t: Copy;
  locale: Locale;
}

export function SettingsScreen({
  session,
  theme,
  onThemeChange,
  onSessionUpdate,
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

  const isVi = locale === 'vi';
  const hasChanges =
    displayName.trim() !== initialName.trim() ||
    prefLocale !== initialLocale;

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

  function handleCopyUserId() {
    if (!userIdStr) return;
    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(userIdStr).catch(() => {});
    }
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2000);
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
              <span className="verified-chip">
                <Check size={11} strokeWidth={3} />
                Google SSO
              </span>
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
                <label>{isVi ? 'Email tài khoản Google' : 'Google Account Email'}</label>
                <span className="readonly-badge">
                  <Lock size={11} />
                  {isVi ? 'Cố định' : 'Read-only'}
                </span>
              </div>
              <div className="input-with-icon readonly">
                <Mail size={16} className="input-icon" />
                <input
                  type="email"
                  value={user?.email || ''}
                  disabled
                  readOnly
                />
              </div>
              <p className="field-hint">
                {isVi
                  ? 'Email được liên kết qua Google Single Sign-On và được bảo vệ tự động.'
                  : 'Email is linked securely through Google Single Sign-On and cannot be changed.'}
              </p>
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

        {/* Section 4: Security & Environment Information */}
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
                <strong>{isVi ? 'Xác thực Google' : 'Google Authentication'}</strong>
                <p>{isVi ? 'OAuth 2.0 bảo mật cao' : 'OAuth 2.0 verified'}</p>
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
                <p>{isVi ? 'Cookie HttpOnly an toàn' : 'Encrypted HttpOnly cookie'}</p>
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
        <div className="settings-action-bar">
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
    </div>
  );
}
