import { useState } from 'react';
import { usePagination } from '../hooks/use-pagination.js';
import { apiPatch, ApiRequestError } from '../api-client.js';
import type { Issue, AuditEvent, Locale, IssueStatus, IssuePriority, Session } from '../types.js';
import type { Copy } from '../i18n.js';
import { formatDate } from '../format.js';
import { ErrorBanner } from '../components/ErrorBanner.js';

interface AdminScreenProps {
  session: Session;
  csrfToken: string;
  t: Copy;
  locale: Locale;
}

export function AdminScreen({ session, csrfToken, t, locale }: AdminScreenProps) {
  if (session.user.role === 'user') {
    return (
      <section className="feature-panel panel">
        <h2>{t.admin}</h2>
        <p className="muted">{t.adminOnly}</p>
        <div className="empty-state">{t.noData}</div>
      </section>
    );
  }

  const [tab, setTab] = useState<'issues' | 'audit'>('issues');

  return (
    <div className="dashboard-grid">
      <section className="panel" style={{ gridColumn: '1 / -1' }}>
        <div className="panel-heading">
          <div>
            <h2>{t.admin}</h2>
            <p className="muted">{t.adminOnly}</p>
          </div>
          <div className="action-row">
            <button 
              className={tab === 'issues' ? 'primary-button' : 'secondary-button'} 
              onClick={() => setTab('issues')}
            >
              {locale === 'vi' ? 'Hỗ trợ' : 'Issues'}
            </button>
            <button 
              className={tab === 'audit' ? 'primary-button' : 'secondary-button'} 
              onClick={() => setTab('audit')}
            >
              {locale === 'vi' ? 'Nhật ký' : 'Audit Logs'}
            </button>
          </div>
        </div>

        {tab === 'issues' ? (
          <IssuesTab csrfToken={csrfToken} locale={locale} t={t} />
        ) : (
          <AuditTab locale={locale} t={t} />
        )}
      </section>
    </div>
  );
}

function IssuesTab({ csrfToken, locale, t }: { csrfToken: string, locale: Locale, t: Copy }) {
  const { data: issues, loading, error, hasMore, loadMore, reload } = usePagination<Issue>('/admin/issues?limit=20');
  
  const [updating, setUpdating] = useState<string | null>(null);
  const [updateError, setUpdateError] = useState<Error | null>(null);

  const updateIssue = async (id: string, updates: { status?: IssueStatus, priority?: IssuePriority }) => {
    setUpdating(id);
    setUpdateError(null);
    try {
      await apiPatch(`/admin/issues/${id}`, updates, { 'X-CSRF-Token': csrfToken });
      await reload();
    } catch (err) {
      setUpdateError(err instanceof Error ? err : new Error('Failed to update issue'));
    } finally {
      setUpdating(null);
    }
  };

  return (
    <>
      <ErrorBanner error={error instanceof ApiRequestError ? error.apiError : error?.message ?? null} locale={locale} />
      <ErrorBanner error={updateError instanceof ApiRequestError ? updateError.apiError : updateError?.message ?? null} locale={locale} />

      <div className="table-responsive">
        <table className="data-table">
          <thead>
            <tr>
              <th scope="col">ID</th>
              <th scope="col">Tiêu đề</th>
              <th scope="col">Trạng thái</th>
              <th scope="col">Độ ưu tiên</th>
              <th scope="col">Ngày tạo</th>
            </tr>
          </thead>
          <tbody>
            {issues.map((issue) => (
              <tr key={issue.id}>
                <td><small className="muted">{issue.id.slice(0, 8)}</small></td>
                <td>{issue.title}</td>
                <td>
                  <select 
                    value={issue.status} 
                    onChange={(e) => void updateIssue(issue.id, { status: e.target.value as IssueStatus })}
                    disabled={updating === issue.id}
                  >
                    <option value="open">Open</option>
                    <option value="in_triage">In Triage</option>
                    <option value="resolved">Resolved</option>
                    <option value="closed">Closed</option>
                  </select>
                </td>
                <td>
                  <select 
                    value={issue.priority} 
                    onChange={(e) => void updateIssue(issue.id, { priority: e.target.value as IssuePriority })}
                    disabled={updating === issue.id}
                  >
                    <option value="P0">P0</option>
                    <option value="P1">P1</option>
                    <option value="P2">P2</option>
                  </select>
                </td>
                <td>{formatDate(issue.createdAt, locale)}</td>
              </tr>
            ))}
            
            {!loading && issues.length === 0 && (
              <tr>
                <td colSpan={5} className="empty-state">
                  {t.noData}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {loading && <div className="status-panel" role="status">{t.loading}</div>}

      {hasMore && !loading && (
        <div className="action-row" style={{ marginTop: 'var(--space-4)' }}>
          <button className="secondary-button" onClick={() => void loadMore()}>
            {t.more}
          </button>
        </div>
      )}
    </>
  );
}

function AuditTab({ locale, t }: { locale: Locale, t: Copy }) {
  const { data: logs, loading, error, hasMore, loadMore } = usePagination<AuditEvent>('/admin/audit-logs?limit=50');

  return (
    <>
      <ErrorBanner error={error?.message ?? null} locale={locale} />

      <div className="table-responsive">
        <table className="data-table">
          <thead>
            <tr>
              <th scope="col">Thời gian</th>
              <th scope="col">Hành động</th>
              <th scope="col">Kết quả</th>
            </tr>
          </thead>
          <tbody>
            {logs.map((log) => (
              <tr key={log.id}>
                <td style={{ whiteSpace: 'nowrap' }}>{formatDate(log.createdAt, locale)}</td>
                <td><strong>{log.action}</strong></td>
                <td>{log.outcome}</td>
              </tr>
            ))}
            
            {!loading && logs.length === 0 && (
              <tr>
                <td colSpan={3} className="empty-state">
                  {t.noData}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {loading && <div className="status-panel" role="status">{t.loading}</div>}

      {hasMore && !loading && (
        <div className="action-row" style={{ marginTop: 'var(--space-4)' }}>
          <button className="secondary-button" onClick={() => void loadMore()}>
            {t.more}
          </button>
        </div>
      )}
    </>
  );
}
