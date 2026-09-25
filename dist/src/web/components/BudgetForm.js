import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import { apiPut, ApiRequestError } from '../api-client.js';
import { parseAmountVnd } from '../format.js';
import { Modal } from './Modal.js';
import { ErrorBanner } from './ErrorBanner.js';
export function BudgetForm({ categoryId, month, initialLimitVnd, csrfToken, t, locale, onClose, onSuccess, }) {
    const [limit, setLimit] = useState(initialLimitVnd ? initialLimitVnd.toString() : '');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const title = locale === 'vi' ? 'Thiết lập ngân sách' : 'Set Budget';
    async function submit(event) {
        event.preventDefault();
        if (loading)
            return;
        setError(null);
        const limitVnd = parseAmountVnd(limit);
        if (limitVnd === null) {
            setError(t.amountInvalid);
            return;
        }
        setLoading(true);
        const requestBody = {
            month,
            limitVnd,
        };
        try {
            await apiPut(`/budgets/${categoryId}`, requestBody, {
                'X-CSRF-Token': csrfToken,
            });
            onSuccess();
            onClose();
        }
        catch (err) {
            if (err instanceof ApiRequestError) {
                setError(err);
            }
            else {
                setError(t.serverError);
            }
        }
        finally {
            setLoading(false);
        }
    }
    return (_jsx(Modal, { isOpen: true, onClose: onClose, ariaLabel: title, children: _jsxs("form", { onSubmit: submit, children: [_jsxs("div", { className: "panel-heading", children: [_jsx("h2", { children: title }), _jsx("button", { type: "button", className: "icon-button", onClick: onClose, "aria-label": t.close, children: _jsxs("svg", { xmlns: "http://www.w3.org/2000/svg", width: "18", height: "18", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", children: [_jsx("path", { d: "M18 6 6 18" }), _jsx("path", { d: "m6 6 12 12" })] }) })] }), _jsx(ErrorBanner, { error: error instanceof ApiRequestError ? error.apiError : error, locale: locale }), _jsxs("p", { style: { marginBottom: 'var(--space-4)' }, children: [_jsxs("strong", { children: [locale === 'vi' ? 'Danh mục' : 'Category', ":"] }), " ", categoryId] }), _jsxs("label", { children: [locale === 'vi' ? 'Giới hạn ngân sách (VND)' : 'Budget limit (VND)', _jsx("input", { required: true, inputMode: "numeric", value: limit, onChange: (e) => setLimit(e.target.value), disabled: loading, placeholder: "0" })] }), _jsx("button", { className: "primary-button", type: "submit", disabled: loading || !limit, children: loading ? t.loading : t.submit })] }) }));
}
//# sourceMappingURL=BudgetForm.js.map