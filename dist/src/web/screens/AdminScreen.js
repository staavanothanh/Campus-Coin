import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useState } from 'react';
import { usePagination } from '../hooks/use-pagination.js';
import { apiPatch, ApiRequestError } from '../api-client.js';
import { formatDate } from '../format.js';
import { ErrorBanner } from '../components/ErrorBanner.js';
export function AdminScreen({ session, csrfToken, t, locale }) {
    if (session.user.role === 'user') {
        return (_jsxs("section", { className: "feature-panel panel", children: [_jsx("h2", { children: t.admin }), _jsx("p", { className: "muted", children: t.adminOnly }), _jsx("div", { className: "empty-state", children: t.noData })] }));
    }
    const [tab, setTab] = useState('issues');
    return (_jsx("div", { className: "dashboard-grid", children: _jsxs("section", { className: "panel", style: { gridColumn: '1 / -1' }, children: [_jsxs("div", { className: "panel-heading", children: [_jsxs("div", { children: [_jsx("h2", { children: t.admin }), _jsx("p", { className: "muted", children: t.adminOnly })] }), _jsxs("div", { className: "action-row", children: [_jsx("button", { className: tab === 'issues' ? 'primary-button' : 'secondary-button', onClick: () => setTab('issues'), children: locale === 'vi' ? 'Hỗ trợ' : 'Issues' }), _jsx("button", { className: tab === 'audit' ? 'primary-button' : 'secondary-button', onClick: () => setTab('audit'), children: locale === 'vi' ? 'Nhật ký' : 'Audit Logs' })] })] }), tab === 'issues' ? (_jsx(IssuesTab, { csrfToken: csrfToken, locale: locale, t: t })) : (_jsx(AuditTab, { locale: locale, t: t }))] }) }));
}
function IssuesTab({ csrfToken, locale, t }) {
    const { data: issues, loading, error, hasMore, loadMore, reload } = usePagination('/admin/issues?limit=20');
    const [updating, setUpdating] = useState(null);
    const [updateError, setUpdateError] = useState(null);
    const updateIssue = async (id, updates) => {
        setUpdating(id);
        setUpdateError(null);
        try {
            await apiPatch(`/admin/issues/${id}`, updates, { 'X-CSRF-Token': csrfToken });
            await reload();
        }
        catch (err) {
            setUpdateError(err instanceof Error ? err : new Error('Failed to update issue'));
        }
        finally {
            setUpdating(null);
        }
    };
    return (_jsxs(_Fragment, { children: [_jsx(ErrorBanner, { error: error instanceof ApiRequestError ? error.apiError : error?.message ?? null, locale: locale }), _jsx(ErrorBanner, { error: updateError instanceof ApiRequestError ? updateError.apiError : updateError?.message ?? null, locale: locale }), _jsx("div", { className: "table-responsive", children: _jsxs("table", { className: "data-table", children: [_jsx("thead", { children: _jsxs("tr", { children: [_jsx("th", { scope: "col", children: "ID" }), _jsx("th", { scope: "col", children: "Ti\u00EAu \u0111\u1EC1" }), _jsx("th", { scope: "col", children: "Tr\u1EA1ng th\u00E1i" }), _jsx("th", { scope: "col", children: "\u0110\u1ED9 \u01B0u ti\u00EAn" }), _jsx("th", { scope: "col", children: "Ng\u00E0y t\u1EA1o" })] }) }), _jsxs("tbody", { children: [issues.map((issue) => (_jsxs("tr", { children: [_jsx("td", { children: _jsx("small", { className: "muted", children: issue.id.slice(0, 8) }) }), _jsx("td", { children: issue.title }), _jsx("td", { children: _jsxs("select", { value: issue.status, onChange: (e) => void updateIssue(issue.id, { status: e.target.value }), disabled: updating === issue.id, children: [_jsx("option", { value: "open", children: "Open" }), _jsx("option", { value: "in_triage", children: "In Triage" }), _jsx("option", { value: "resolved", children: "Resolved" }), _jsx("option", { value: "closed", children: "Closed" })] }) }), _jsx("td", { children: _jsxs("select", { value: issue.priority, onChange: (e) => void updateIssue(issue.id, { priority: e.target.value }), disabled: updating === issue.id, children: [_jsx("option", { value: "P0", children: "P0" }), _jsx("option", { value: "P1", children: "P1" }), _jsx("option", { value: "P2", children: "P2" })] }) }), _jsx("td", { children: formatDate(issue.createdAt, locale) })] }, issue.id))), !loading && issues.length === 0 && (_jsx("tr", { children: _jsx("td", { colSpan: 5, className: "empty-state", children: t.noData }) }))] })] }) }), loading && _jsx("div", { className: "status-panel", role: "status", children: t.loading }), hasMore && !loading && (_jsx("div", { className: "action-row", style: { marginTop: 'var(--space-4)' }, children: _jsx("button", { className: "secondary-button", onClick: () => void loadMore(), children: t.more }) }))] }));
}
function AuditTab({ locale, t }) {
    const { data: logs, loading, error, hasMore, loadMore } = usePagination('/admin/audit-logs?limit=50');
    return (_jsxs(_Fragment, { children: [_jsx(ErrorBanner, { error: error?.message ?? null, locale: locale }), _jsx("div", { className: "table-responsive", children: _jsxs("table", { className: "data-table", children: [_jsx("thead", { children: _jsxs("tr", { children: [_jsx("th", { scope: "col", children: "Th\u1EDDi gian" }), _jsx("th", { scope: "col", children: "H\u00E0nh \u0111\u1ED9ng" }), _jsx("th", { scope: "col", children: "K\u1EBFt qu\u1EA3" })] }) }), _jsxs("tbody", { children: [logs.map((log) => (_jsxs("tr", { children: [_jsx("td", { style: { whiteSpace: 'nowrap' }, children: formatDate(log.createdAt, locale) }), _jsx("td", { children: _jsx("strong", { children: log.action }) }), _jsx("td", { children: log.outcome })] }, log.id))), !loading && logs.length === 0 && (_jsx("tr", { children: _jsx("td", { colSpan: 3, className: "empty-state", children: t.noData }) }))] })] }) }), loading && _jsx("div", { className: "status-panel", role: "status", children: t.loading }), hasMore && !loading && (_jsx("div", { className: "action-row", style: { marginTop: 'var(--space-4)' }, children: _jsx("button", { className: "secondary-button", onClick: () => void loadMore(), children: t.more }) }))] }));
}
//# sourceMappingURL=AdminScreen.js.map