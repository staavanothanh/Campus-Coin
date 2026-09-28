import { useEffect, useRef, useState, type FormEvent } from 'react';
import { apiPatch, ApiRequestError } from '../../api-client.js';
import type { AdminUser, Locale } from '../../types.js';
import type { Copy } from '../../i18n.js';
import { Modal } from '../../components/Modal.js';
import { adminCopy } from './copy.js';
import { isAmbiguousMutation } from './model.js';

interface Props {
  user: AdminUser;
  csrfToken: string;
  locale: Locale;
  t: Copy;
  onClose: () => void;
  onChanged: () => void;
}

/** Confirm modal for admin account status change; reason is mandatory and audited. */
export function AccountStatusModal({ user, csrfToken, locale, t, onClose, onChanged }: Props) {
  const c = adminCopy[locale];
  const disabling = user.status === 'active';
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const busyRef = useRef(false);
  const mounted = useRef(true);
  const pending = useRef<{ key: string; reason: string } | null>(null);
  const [isRetry, setIsRetry] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (busyRef.current) return;
    const trimmed = reason.trim();
    if (trimmed.length < 3 || trimmed.length > 500) { setError(c.reasonInvalid); return; }
    const payload = pending.current ?? { key: crypto.randomUUID(), reason: trimmed };
    pending.current = payload;
    busyRef.current = true; setBusy(true); setError(null);
    try {
      await apiPatch<AdminUser>(`/admin/users/${encodeURIComponent(user.id)}`, { status: disabling ? 'disabled' : 'active', reason: payload.reason }, {
        'X-CSRF-Token': csrfToken, 'Idempotency-Key': payload.key,
      });
      pending.current = null;
      if (!mounted.current) return;
      setDone(true); setIsRetry(false); onChanged();
    } catch (caught) {
      const statusCode = caught instanceof ApiRequestError ? caught.status : undefined;
      const ambiguous = isAmbiguousMutation(statusCode);
      if (!ambiguous) pending.current = null;
      if (mounted.current) {
        setIsRetry(ambiguous);
        setError(caught instanceof ApiRequestError && caught.status === 403 && caught.apiError?.code === 'FORBIDDEN' ? c.selfChangeBlocked : t.unavailable);
      }
    } finally {
      busyRef.current = false;
      if (mounted.current) setBusy(false);
    }
  }

  return <Modal isOpen onClose={() => { if (!mounted.current || !busyRef.current) onClose(); }} ariaLabel={`${disabling ? c.disableTitle : c.enableTitle} #${user.id}`}>
    <div className="admin-detail">
      <div className="panel-heading"><h2>{disabling ? c.disableTitle : c.enableTitle} #{user.id}</h2><button type="button" className="secondary-button" disabled={busy} onClick={onClose}>{c.cancelAction}</button></div>
      <p className="admin-description">{user.displayName || c.unknownTarget} — {user.emailMasked} ({user.role})</p>
      <p className="muted">{disabling ? c.disablePrompt : c.enablePrompt}</p>
      <form onSubmit={event => void submit(event)}>
        <label htmlFor="account-reason">{c.reason}<textarea id="account-reason" value={reason} maxLength={500} disabled={busy || done || isRetry} aria-describedby="account-reason-hint" onChange={e => setReason(e.target.value)} /></label>
        <p id="account-reason-hint" className="muted">{c.reasonHint}</p>
        <div className="action-row">
          <button type="button" className="secondary-button" disabled={busy} onClick={onClose}>{c.cancelAction}</button>
          <button type="submit" className="primary-button" disabled={busy || done || !reason.trim()}>{isRetry ? t.retry : c.confirmAction}</button>
        </div>
      </form>
      {error && <p role="alert">{error}</p>}
      {done && <p role="status">{c.statusChanged}</p>}
    </div>
  </Modal>;
}