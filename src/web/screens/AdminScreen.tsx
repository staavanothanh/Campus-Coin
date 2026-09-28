import { useEffect, useState } from 'react';
import { usePagination } from '../hooks/use-pagination.js';
import { apiGet } from '../api-client.js';
import type { AdminMetrics, AdminUser, AuditEvent, Issue, IssuePriority, IssueStatus, Locale, Session } from '../types.js';
import type { Copy } from '../i18n.js';
import { formatDate } from '../format.js';
import { adminCopy } from '../features/admin/copy.js';
import { ISSUE_PRIORITIES, ISSUE_STATUSES, isIssuePriority, isIssueStatus, issueQueuePath } from '../features/admin/model.js';
import { IssueDetail } from '../features/admin/IssueDetail.js';
import { AccountStatusModal } from '../features/admin/AccountStatusModal.js';
import '../features/admin/admin.css';

interface AdminScreenProps { session: Session; csrfToken: string; t: Copy; locale: Locale }

export function AdminScreen(props: AdminScreenProps) {
  if (props.session.user.role !== 'admin') {
    return <section className="panel feature-panel"><h2>{props.t.admin}</h2><p role="alert">{adminCopy[props.locale].denied}</p></section>;
  }
  return <AdminWorkspace key={props.session.user.id} {...props} />;
}

function AdminWorkspace({ csrfToken, t, locale, session }: AdminScreenProps) {
  const c = adminCopy[locale];
  const [tab, setTab] = useState<'issues' | 'accounts' | 'metrics' | 'audit'>('issues');
  const [status, setStatus] = useState<IssueStatus | ''>('');
  const [priority, setPriority] = useState<IssuePriority | ''>('');
  return <div className="admin-workspace">
    <section className="panel admin-header">
      <h2>{c.title}</h2><p className="muted">{c.subtitle}</p>
      <p className="admin-boundary">{c.boundary}</p>
      <div className="action-row" role="group" aria-label={t.admin}>
        <button type="button" aria-pressed={tab === 'issues'} className={tab === 'issues' ? 'primary-button' : 'secondary-button'} onClick={() => setTab('issues')}>{c.issues}</button>
        <button type="button" aria-pressed={tab === 'accounts'} className={tab === 'accounts' ? 'primary-button' : 'secondary-button'} onClick={() => setTab('accounts')}>{c.accounts}</button>
        <button type="button" aria-pressed={tab === 'metrics'} className={tab === 'metrics' ? 'primary-button' : 'secondary-button'} onClick={() => setTab('metrics')}>{c.metrics}</button>
        <button type="button" aria-pressed={tab === 'audit'} className={tab === 'audit' ? 'primary-button' : 'secondary-button'} onClick={() => setTab('audit')}>{c.audit}</button>
      </div>
    </section>
    {tab === 'issues' ? <>
      <section className="panel admin-filters">
        <label htmlFor="admin-status">{c.status}<select id="admin-status" value={status} onChange={e => { if (e.target.value === '' || isIssueStatus(e.target.value)) setStatus(e.target.value); }}>
          <option value="">{c.all}</option>{ISSUE_STATUSES.map(value => <option key={value} value={value}>{c[value]}</option>)}
        </select></label>
        <label htmlFor="admin-priority">{c.priority}<select id="admin-priority" value={priority} onChange={e => { if (e.target.value === '' || isIssuePriority(e.target.value)) setPriority(e.target.value); }}>
          <option value="">{c.all}</option>{ISSUE_PRIORITIES.map(value => <option key={value}>{value}</option>)}
        </select></label>
      </section>
      <IssueQueue key={`${status}:${priority}`} path={issueQueuePath(status, priority)} csrfToken={csrfToken} locale={locale} t={t} />
    </> : tab === 'accounts' ? <AccountsTab session={session} csrfToken={csrfToken} locale={locale} t={t} /> : tab === 'metrics' ? <MetricsTab locale={locale} t={t} /> : <AuditQueue locale={locale} t={t} />}
  </div>;
}

function Metric({ label, value }: { label: string; value: string | number }) {
  return <div className="admin-metric"><span>{label}</span><strong>{value}</strong></div>;
}

function MetricsTab({ locale, t }: { locale: Locale; t: Copy }) {
  const c = adminCopy[locale];
  const [metrics, setMetrics] = useState<AdminMetrics | null>(null);
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading');
  const [refresh, setRefresh] = useState(0);
  useEffect(() => {
    let active = true;
    setState('loading');
    apiGet<AdminMetrics>('/admin/metrics').then(data => {
      if (!active) return;
      setMetrics(data);
      setState('ready');
    }).catch(() => { if (active) setState('error'); });
    return () => { active = false; };
  }, [refresh]);
  return <section className="panel">
    <div className="panel-heading"><h3>{c.metrics}</h3><button type="button" className="secondary-button" disabled={state === 'loading'} onClick={() => setRefresh(value => value + 1)}>{c.refresh}</button></div>
    <p className="muted">{c.metricsNote}</p>
    {state === 'loading' && <p role="status">{t.loading}</p>}
    {state === 'error' && <div role="alert"><p>{t.unavailable}</p><button type="button" className="secondary-button" onClick={() => setRefresh(value => value + 1)}>{t.retry}</button></div>}
    {state === 'ready' && metrics && <>
      <h4>{c.metricsUsers}</h4>
      <div className="admin-metrics">
        <Metric label={c.totalUsers} value={metrics.users.totalUsers} />
        <Metric label={c.verifiedUsers} value={metrics.users.verifiedUsers} />
        <Metric label={c.activeUsers} value={metrics.users.activeUsers} />
        <Metric label={c.disabledUsers} value={metrics.users.disabledUsers} />
      </div>
      <h4>{c.metricsIssues}</h4>
      <div className="admin-metrics">
        <Metric label={c.totalIssues} value={metrics.issues.total} />
        <Metric label={c.openTotal} value={metrics.issues.byStatus.open} />
        <Metric label={c.inTriageTotal} value={metrics.issues.byStatus.in_triage} />
        <Metric label={c.resolvedTotal} value={metrics.issues.byStatus.resolved} />
        <Metric label={c.closedTotal} value={metrics.issues.byStatus.closed} />
        <Metric label={c.p0Total} value={metrics.issues.byPriority.P0} />
        <Metric label={c.p1Total} value={metrics.issues.byPriority.P1} />
        <Metric label={c.p2Total} value={metrics.issues.byPriority.P2} />
      </div>
      <h4>{c.metricsAudit}</h4>
      <div className="admin-metrics">
        <Metric label={c.auditSuccess} value={metrics.audit.success} />
        <Metric label={c.auditFailure} value={metrics.audit.failure} />
      </div>
    </>}
  </section>;
}

function AccountsTab({ session, csrfToken, locale, t }: { session: Session; csrfToken: string; locale: Locale; t: Copy }) {
  const c = adminCopy[locale];
  const { data, loading, error, hasMore, reload, loadMore } = usePagination<AdminUser>('/admin/users?limit=20');
  const [target, setTarget] = useState<AdminUser | null>(null);
  useEffect(() => { void reload(); }, [reload]);
  const currentUserId = session.user.id;
  return <>
    <section className="panel">
      <div className="panel-heading"><h3>{c.accounts}</h3><button type="button" className="secondary-button" disabled={loading} onClick={() => void reload()}>{c.refresh}</button></div>
      <p className="muted">{c.accountNote}</p>
      {error && <div role="alert"><p>{t.unavailable}</p><button type="button" className="secondary-button" disabled={loading} onClick={() => void reload()}>{t.retry}</button></div>}
      <div className="table-responsive"><table className="data-table">
        <caption className="muted">{c.accounts}</caption>
        <thead><tr><th scope="col">ID</th><th scope="col">{c.email}</th><th scope="col">{c.titleColumn}</th><th scope="col">{c.role}</th><th scope="col">{c.localeLabel}</th><th scope="col">{c.statusColumn}</th><th scope="col">{c.created}</th><th scope="col">{c.actionColumn}</th></tr></thead>
        <tbody>{data.map(user => {
          const isSelf = String(user.id) === currentUserId;
          const blocked = isSelf && user.status === 'active';
          return <tr key={user.id}>
            <td>#{String(user.id)}</td><td>{user.emailMasked}</td><td className="admin-report-title">{user.displayName || '—'}</td><td>{user.role}</td><td>{user.locale === 'vi' ? 'Tiếng Việt' : 'English'}</td>
            <td><span className={`admin-status admin-status-${user.status}`}>{user.status === 'active' ? c.activeStatus : c.disabledStatus}</span></td>
            <td>{formatDate(user.createdAt, locale)}</td>
            <td>{blocked ? <span className="muted">{c.selfBlocked}</span> : <button type="button" className="secondary-button" aria-label={`${user.status === 'active' ? c.disableAccount : c.enableAccount} #${user.id}`} onClick={() => setTarget(user)}>{user.status === 'active' ? c.disableAccount : c.enableAccount}</button>}</td>
          </tr>;
        })}</tbody>
      </table></div>
      {loading && <p role="status">{t.loading}</p>}
      {!loading && !error && data.length === 0 && <p className="empty-state">{c.emptyAccounts}</p>}
      {hasMore && !error && <button type="button" className="secondary-button" disabled={loading} onClick={() => void loadMore()}>{t.more}</button>}
    </section>
    {target !== null && <AccountStatusModal user={target} csrfToken={csrfToken} locale={locale} t={t} onClose={() => setTarget(null)} onChanged={() => void reload()} />}
  </>;
}

function IssueQueue({ path, csrfToken, locale, t }: { path: string; csrfToken: string; locale: Locale; t: Copy }) {
  const c = adminCopy[locale];
  const { data, loading, error, hasMore, reload, loadMore } = usePagination<Issue>(path);
  const [selected, setSelected] = useState<string | null>(null);
  useEffect(() => { void reload(); }, [reload]);
  return <>
    {!error && <section className="panel">
      <div className="admin-metrics" aria-busy={loading}>
        {[{ label: c.loaded, count: data.length }, { label: c.urgent, count: data.filter(issue => issue.priority === 'P0').length }, { label: c.triage, count: data.filter(issue => issue.status === 'in_triage').length }].map(metric => <div key={metric.label}><span>{metric.label}</span><strong>{loading && data.length === 0 ? t.loading : metric.count}</strong></div>)}
      </div><p className="muted">{c.partial}</p>
    </section>}
    <section className="panel">
      <div className="panel-heading"><h3>{c.issues}</h3><button type="button" className="secondary-button" disabled={loading} onClick={() => void reload()}>{c.refresh}</button></div>
      {error && <div role="alert"><p>{t.unavailable}</p><button type="button" className="secondary-button" disabled={loading} onClick={() => void reload()}>{t.retry}</button></div>}
      <div className="table-responsive"><table className="data-table">
        <caption className="muted">{c.issues}</caption>
        <thead><tr><th scope="col">ID</th><th scope="col">{c.titleColumn}</th><th scope="col">{c.status}</th><th scope="col">{c.priority}</th><th scope="col">{c.created}</th><th scope="col">{c.detail}</th></tr></thead>
        <tbody>{data.map(issue => <tr key={issue.id}>
          <td>#{String(issue.id)}</td><td className="admin-report-title">{issue.title}</td><td>{c[issue.status]}</td><td><span className={`admin-priority admin-priority-${issue.priority}`}>{issue.priority}</span></td><td>{formatDate(issue.createdAt, locale)}</td>
          <td><button type="button" className="secondary-button" aria-label={`${c.detail} #${issue.id}`} onClick={() => setSelected(issue.id)}>{c.detail}</button></td>
        </tr>)}</tbody>
      </table></div>
      {loading && <p role="status">{t.loading}</p>}
      {!loading && !error && data.length === 0 && <p className="empty-state">{c.empty}</p>}
      {hasMore && !error && <button type="button" className="secondary-button" disabled={loading} onClick={() => void loadMore()}>{t.more}</button>}
    </section>
    {selected !== null && <IssueDetail key={selected} issueId={selected} csrfToken={csrfToken} locale={locale} t={t} onClose={() => setSelected(null)} onUpdated={() => void reload()} />}
  </>;
}

function AuditQueue({ locale, t }: { locale: Locale; t: Copy }) {
  const c = adminCopy[locale];
  const { data, loading, error, hasMore, reload, loadMore } = usePagination<AuditEvent>('/admin/audit-logs?limit=50');
  useEffect(() => { void reload(); }, [reload]);
  return <section className="panel">
    <div className="panel-heading"><h3>{c.audit}</h3><button type="button" className="secondary-button" disabled={loading} onClick={() => void reload()}>{c.refresh}</button></div>
    <p className="muted">{c.readOnly}</p>
    {error && <div role="alert"><p>{t.unavailable}</p><button type="button" className="secondary-button" disabled={loading} onClick={() => void reload()}>{t.retry}</button></div>}
    <div className="table-responsive"><table className="data-table"><caption>{c.audit}</caption>
      <thead><tr><th scope="col">{c.created}</th><th scope="col">{c.action}</th><th scope="col">{c.outcome}</th></tr></thead>
      <tbody>{data.map(event => <tr key={event.id}><td>{formatDate(event.createdAt, locale)}</td><td>{event.action}</td><td>{event.outcome === 'success' ? c.success : event.outcome === 'failure' ? c.failure : event.outcome}</td></tr>)}</tbody>
    </table></div>
    {loading && <p role="status">{t.loading}</p>}
    {!loading && !error && data.length === 0 && <p className="empty-state">{c.emptyAudit}</p>}
    {hasMore && !error && <button type="button" className="secondary-button" disabled={loading} onClick={() => void loadMore()}>{t.more}</button>}
  </section>;
}
