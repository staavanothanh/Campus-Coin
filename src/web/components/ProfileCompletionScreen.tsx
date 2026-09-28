import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Coins, LogOut, Save } from 'lucide-react';
import { apiGet, apiPatch, apiPost, ApiRequestError } from '../api-client.js';
import type { Locale, Session } from '../types.js';

interface ProfileCompletionScreenProps {
  session: Session;
  locale: Locale;
  onComplete: (session: Session) => void;
  onSignOut: () => void;
}

type ProfileField = 'name' | 'password' | 'confirmPassword';

export function ProfileCompletionScreen({ session, locale, onComplete, onSignOut }: ProfileCompletionScreenProps) {
  const isVi = locale === 'vi';
  const titleRef = useRef<HTMLHeadingElement>(null);
  const fieldRefs = useRef<Partial<Record<ProfileField, HTMLInputElement | null>>>({});
  const [displayName, setDisplayName] = useState(session.user.displayName || '');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [invalidField, setInvalidField] = useState<ProfileField | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    titleRef.current?.focus();
  }, []);

  useEffect(() => {
    if (invalidField) fieldRefs.current[invalidField]?.focus();
  }, [invalidField]);

  function clearFieldError(field: ProfileField) {
    if (invalidField === field || (invalidField === 'confirmPassword' && field === 'password')) {
      setInvalidField(null);
      setError('');
    } else if (invalidField === null) {
      setError('');
    }
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setInvalidField(null);
    if (displayName.trim().length < 2 || displayName.trim().length > 120) {
      setError(isVi ? 'Tên tài khoản cần từ 2 đến 120 ký tự.' : 'Account name must be 2 to 120 characters.');
      setInvalidField('name');
      return;
    }
    if (!session.user.hasLocalPassword && (password.length < 8 || password.length > 128)) {
      setError(isVi ? 'Mật khẩu cần từ 8 đến 128 ký tự.' : 'Password must be 8 to 128 characters.');
      setInvalidField('password');
      return;
    }
    if (!session.user.hasLocalPassword && password !== confirmPassword) {
      setError(isVi ? 'Hai mật khẩu chưa khớp.' : 'The passwords do not match.');
      setInvalidField('confirmPassword');
      return;
    }

    setBusy(true);
    try {
      await apiPatch('/users/me/preferences', { displayName: displayName.trim() }, {
        'X-CSRF-Token': session.csrfToken,
      });
      if (!session.user.hasLocalPassword) {
        await apiPost('/auth/set-password', { newPassword: password }, {
          'X-CSRF-Token': session.csrfToken,
        });
      }
      onComplete(await apiGet<Session>('/auth/session'));
    } catch (caught) {
      const apiError = caught instanceof ApiRequestError ? caught.apiError : null;
      setError(apiError?.message ?? (isVi
        ? 'Chưa thể hoàn tất hồ sơ. Vui lòng kiểm tra kết nối rồi thử lại.'
        : 'Profile setup could not be completed. Check your connection and try again.'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="profile-completion-page" lang={locale}>
      <section className="profile-completion-card" aria-labelledby="profile-completion-title">
        <div className="profile-completion-mark"><Coins size={22} /></div>
        <p className="eyebrow">Campus Coin</p>
          <h1 ref={titleRef} id="profile-completion-title" tabIndex={-1}>{isVi ? 'Hoàn thiện tài khoản' : 'Complete your account'}</h1>
        <p className="muted">
          {isVi
            ? 'Đặt tên hiển thị và mật khẩu để lần sau bạn có thể đăng nhập bằng email.'
            : 'Choose a display name and password so you can sign in with email next time.'}
        </p>
        <p className="profile-completion-email">{session.user.email}</p>
        <form onSubmit={submit} noValidate>
          {error && <p id="profile-completion-error" className="profile-completion-error" role="alert">{error}</p>}
          <label htmlFor="profile-completion-name">{isVi ? 'Tên tài khoản' : 'Account name'}</label>
          <input
            ref={element => { fieldRefs.current.name = element; }}
            id="profile-completion-name"
            type="text"
            autoComplete="nickname"
            maxLength={120}
            value={displayName}
            onChange={event => {
              setDisplayName(event.target.value);
              clearFieldError('name');
            }}
            aria-invalid={invalidField === 'name'}
            aria-describedby={invalidField === 'name' ? 'profile-completion-error' : undefined}
            disabled={busy}
            required
          />
          {!session.user.hasLocalPassword && <>
            <label htmlFor="profile-completion-password">{isVi ? 'Tạo mật khẩu' : 'Create password'}</label>
            <input
              ref={element => { fieldRefs.current.password = element; }}
              id="profile-completion-password"
              type="password"
              autoComplete="new-password"
              minLength={8}
              maxLength={128}
              value={password}
              onChange={event => {
                setPassword(event.target.value);
                clearFieldError('password');
              }}
              aria-invalid={invalidField === 'password'}
              aria-describedby={invalidField === 'password' ? 'profile-completion-error' : undefined}
              disabled={busy}
              required
            />
            <label htmlFor="profile-completion-confirm">{isVi ? 'Nhập lại mật khẩu' : 'Confirm password'}</label>
            <input
              ref={element => { fieldRefs.current.confirmPassword = element; }}
              id="profile-completion-confirm"
              type="password"
              autoComplete="new-password"
              minLength={8}
              maxLength={128}
              value={confirmPassword}
              onChange={event => {
                setConfirmPassword(event.target.value);
                clearFieldError('confirmPassword');
              }}
              aria-invalid={invalidField === 'confirmPassword'}
              aria-describedby={invalidField === 'confirmPassword' ? 'profile-completion-error' : undefined}
              disabled={busy}
              required
            />
          </>}
          <div className="profile-completion-actions">
            <button type="button" className="secondary-button" onClick={onSignOut} disabled={busy}>
              <LogOut size={16} />{isVi ? 'Đăng xuất' : 'Sign out'}
            </button>
            <button type="submit" className="primary-button" disabled={busy}>
              <Save size={16} />{busy ? (isVi ? 'Đang lưu…' : 'Saving…') : (isVi ? 'Lưu và tiếp tục' : 'Save and continue')}
            </button>
          </div>
        </form>
      </section>
    </main>
  );
}
