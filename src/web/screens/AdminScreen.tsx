import { useState, useEffect } from 'react';
import { usePagination } from '../hooks/use-pagination.js';
import { formatDate } from '../format.js';
import type { Copy, AuditEvent, Issue, Locale, Session } from '../types.js';
import { apiRequest, errorMessage } from '../api.js';

export function AdminScreen({ session, t, locale }: { session: Session; t: Copy; locale: Locale }) {
  const [tab, setTab] = useState<'issues' | 'audit'>('issues');
  if (session.user.role !== 'admin') return <section className="feature-panel panel"><h2>{t.admin}</h2><p className="muted">{t.forbidden}</p></section>;
  return <div className="admin-page"><div className="admin-tabs" role="tablist" aria-label={t.admin}>
    <button role="tab" type="button" aria-selected={tab === 'issues'} onClick={() => setTab('issues')}>{locale === 'vi' ? 'Sự cố' : 'Issues'}</button>
    <button role="tab" type="button" aria-selected={tab === 'audit'} onClick={() => setTab('audit')}>{locale === 'vi' ? 'Nhật ký kiểm toán' : 'Audit log'}</button>
  </div>{tab === 'issues' ? <Issues csrfToken={session.csrfToken} locale={locale} t={t} /> : <Audit locale={locale} t={t} />}</div>;
}

function Issues({ csrfToken, locale, t }: { csrfToken: string; locale: Locale; t: Copy }) {
  const { data, loading, error, hasMore, loadMore, reload } = usePagination<Issue>('/admin/issues?limit=20');
  const [pending, setPending] = useState('');
  const [mutationError, setMutationError] = useState('');
  async function update(id: string, patch: { status?: Issue['status']; priority?: Issue['priority'] }) {
    setPending(id);
    setMutationError('');
    try {
      await apiRequest(`/admin/issues/${encodeURIComponent(id)}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': csrfToken }, body: JSON.stringify(patch) });
      await reload();
    } catch (caught) {
      setMutationError(errorMessage(caught, t));
    } finally {
      setPending('');
    }
  }
  return <section className="panel admin-list"><h2>{t.admin}</h2>{(error || mutationError) && <p role="alert" className="form-message">{mutationError || error?.message}</p>}
    <div className="table-responsive"><table className="modern-data-table"><thead><tr><th>{locale === 'vi' ? 'Sự cố' : 'Issue'}</th><th>{t.status}</th><th>{locale === 'vi' ? 'Ưu tiên' : 'Priority'}</th><th>{locale === 'vi' ? 'Ngày tạo' : 'Created'}</th></tr></thead><tbody>
      {data.map(issue => <tr key={issue.id}><td><strong>{issue.title}</strong><p className="muted">{issue.description}</p></td><td><select aria-label={`${t.status}: ${issue.title}`} value={issue.status} disabled={pending === issue.id} onChange={event => void update(issue.id, { status: event.target.value as Issue['status'] })}><option value="open">Open</option><option value="in_triage">In triage</option><option value="resolved">Resolved</option><option value="closed">Closed</option></select></td><td><select aria-label={`${locale === 'vi' ? 'Ưu tiên' : 'Priority'}: ${issue.title}`} value={issue.priority} disabled={pending === issue.id} onChange={event => void update(issue.id, { priority: event.target.value as Issue['priority'] })}><option value="P0">P0</option><option value="P1">P1</option><option value="P2">P2</option></select></td><td>{formatDate(issue.createdAt, locale)}</td></tr>)}
      {!loading && data.length === 0 && <tr><td colSpan={4} className="empty-state">{t.noData}</td></tr>}
    </tbody></table></div>{loading && <p role="status" className="table-loading-bar">{t.loading}</p>}{hasMore && !loading && <button className="secondary-button" type="button" onClick={() => void loadMore()}>{t.loadMore}</button>}
  </section>;
}

function Audit({ locale, t }: { locale: Locale; t: Copy }) {
  const { data, loading, error, hasMore, loadMore } = usePagination<AuditEvent>('/admin/audit-logs?limit=50');
  return <section className="panel admin-list"><h2>{locale === 'vi' ? 'Nhật ký kiểm toán' : 'Audit log'}</h2>{error && <p role="alert" className="form-message">{error.message}</p>}
    <div className="table-responsive"><table className="modern-data-table"><thead><tr><th>{locale === 'vi' ? 'Hoạt động' : 'Action'}</th><th>{locale === 'vi' ? 'Kết quả' : 'Outcome'}</th><th>{locale === 'vi' ? 'Thời gian' : 'Time'}</th></tr></thead><tbody>{data.map(entry => <tr key={String(entry.id)}><td>{entry.action}</td><td>{entry.outcome}</td><td>{formatDate(entry.createdAt, locale)}</td></tr>)}{!loading && data.length === 0 && <tr><td colSpan={3} className="empty-state">{t.noData}</td></tr>}</tbody></table></div>
    {loading && <p role="status" className="table-loading-bar">{t.loading}</p>}{hasMore && !loading && <button className="secondary-button" type="button" onClick={() => void loadMore()}>{t.loadMore}</button>}
  </section>;
}
