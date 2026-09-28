import { useEffect, useRef, useState, type FormEvent } from 'react';
import { apiGet, apiPatch, apiPost, ApiRequestError } from '../../api-client.js';
import type { Issue, IssuePriority, IssueStatus, Locale } from '../../types.js';
import type { Copy } from '../../i18n.js';
import { Modal } from '../../components/Modal.js';
import { adminCopy } from './copy.js';
import { ISSUE_PRIORITIES, ISSUE_STATUSES, isAmbiguousMutation, isIssuePriority, isIssueStatus } from './model.js';

interface Props {
  issueId: string; csrfToken: string; locale: Locale; t: Copy;
  onClose: () => void; onUpdated: () => void;
}

export function IssueDetail({ issueId, csrfToken, locale, t, onClose, onUpdated }: Props) {
  const c = adminCopy[locale];
  const [issue, setIssue] = useState<Issue | null>(null);
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading');
  const [refresh, setRefresh] = useState(0);
  const [status, setStatus] = useState<IssueStatus>('open');
  const [priority, setPriority] = useState<IssuePriority>('P2');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const busyRef = useRef(false);
  const mounted = useRef(false);
  const pendingNote = useRef<{ key: string; note: string } | null>(null);
  const [isNoteRetry, setIsNoteRetry] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<'saved' | 'noteSaved' | null>(null);

  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);
  useEffect(() => {
    let active = true;
    setState('loading');
    apiGet<Issue>(`/admin/issues/${encodeURIComponent(issueId)}`).then(result => {
      if (!active) return;
      setIssue(result); setStatus(result.status); setPriority(result.priority); setState('ready');
    }).catch(() => { if (active) setState('error'); });
    return () => { active = false; };
  }, [issueId, refresh]);

  async function saveTriage(event: FormEvent) {
    event.preventDefault();
    if (busyRef.current) return;
    busyRef.current = true; setBusy(true); setError(null); setMessage(null);
    try {
      const updated = await apiPatch<Issue>(`/admin/issues/${encodeURIComponent(issueId)}`, { status, priority }, {
        'X-CSRF-Token': csrfToken, 'Idempotency-Key': crypto.randomUUID(),
      });
      if (!mounted.current) return;
      setIssue(updated); setMessage('saved'); onUpdated();
    } catch {
      if (mounted.current) setError(t.unavailable);
    } finally {
      busyRef.current = false;
      if (mounted.current) setBusy(false);
    }
  }

  async function addNote(event: FormEvent) {
    event.preventDefault();
    if (busyRef.current) return;
    if (!note.trim() || note.length > 4000) { setError(c.noteInvalid); return; }
    const payload = pendingNote.current ?? { key: crypto.randomUUID(), note: note.trim() };
    pendingNote.current = payload;
    busyRef.current = true; setBusy(true); setError(null); setMessage(null);
    try {
      await apiPost(`/admin/issues/${encodeURIComponent(issueId)}/notes`, { note: payload.note }, {
        'X-CSRF-Token': csrfToken, 'Idempotency-Key': payload.key,
      });
      pendingNote.current = null;
      if (!mounted.current) return;
      setIsNoteRetry(false); setNote(''); setMessage('noteSaved'); onUpdated();
    } catch (caught) {
      const statusCode = caught instanceof ApiRequestError ? caught.status : undefined;
      const ambiguous = isAmbiguousMutation(statusCode);
      if (!ambiguous) pendingNote.current = null;
      if (mounted.current) { setIsNoteRetry(ambiguous); setError(t.unavailable); }
    } finally {
      busyRef.current = false;
      if (mounted.current) setBusy(false);
    }
  }

  return <Modal isOpen onClose={() => { if (!busyRef.current) onClose(); }} ariaLabel={`${c.detail} #${issueId}`}>
    <div className="admin-detail">
      <div className="panel-heading"><h2>{c.detail} #{issueId}</h2><button type="button" className="secondary-button" disabled={busy} onClick={onClose}>{t.close}</button></div>
      {state === 'loading' && <p role="status">{t.loading}</p>}
      {state === 'error' && <div role="alert"><p>{t.unavailable}</p><button type="button" className="secondary-button" onClick={() => setRefresh(value => value + 1)}>{t.retry}</button></div>}
      {state === 'ready' && issue && <>
        <h3>{issue.title}</h3><p className="admin-description">{issue.description}</p>
        {priority === 'P0' && <p className="admin-boundary" role="status">{c.incident}</p>}
        <p className="muted">{c.assignment}</p>
        <form onSubmit={event => void saveTriage(event)}>
          <div className="admin-filters">
            <label htmlFor="issue-status">{c.status}<select id="issue-status" disabled={busy} value={status} onChange={e => { if (isIssueStatus(e.target.value)) setStatus(e.target.value); }}>{ISSUE_STATUSES.map(value => <option key={value} value={value}>{c[value]}</option>)}</select></label>
            <label htmlFor="issue-priority">{c.priority}<select id="issue-priority" disabled={busy} value={priority} onChange={e => { if (isIssuePriority(e.target.value)) setPriority(e.target.value); }}>{ISSUE_PRIORITIES.map(value => <option key={value}>{value}</option>)}</select></label>
          </div>
          <button type="submit" className="primary-button" disabled={busy || (status === issue.status && priority === issue.priority)}>{busy ? t.loading : c.save}</button>
        </form>
        <form onSubmit={event => void addNote(event)}>
          <label htmlFor="issue-note">{c.note}<textarea id="issue-note" value={note} maxLength={4000} disabled={busy || isNoteRetry} aria-describedby="issue-note-hint" onChange={e => setNote(e.target.value)} /></label>
          <p id="issue-note-hint" className="muted">{isNoteRetry ? c.noteRetry : c.noteHint}</p>
          <button type="submit" className="secondary-button" disabled={busy || !note.trim()}>{busy ? t.loading : isNoteRetry ? t.retry : c.addNote}</button>
        </form>
      </>}
      {error && <p role="alert">{error}</p>}
      {message && <p role="status">{c[message]}</p>}
    </div>
  </Modal>;
}
