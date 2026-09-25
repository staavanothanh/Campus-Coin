import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import { apiPost, ApiRequestError } from '../api-client.js';
import { parseAmountVnd } from '../format.js';
import { Modal } from './Modal.js';
import { CategorySelect } from './CategorySelect.js';
import { ErrorBanner } from './ErrorBanner.js';
import { BudgetWarningBanner } from './BudgetWarningBanner.js';
export function TransactionForm({ kind, csrfToken, t, locale, onClose, onSuccess, }) {
    const [amount, setAmount] = useState('');
    const [categoryId, setCategoryId] = useState('');
    const [description, setDescription] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [budgetWarning, setBudgetWarning] = useState(null);
    const [isSuccess, setIsSuccess] = useState(false);
    const title = kind === 'income' ? t.addIncome : t.addPayment;
    async function submit(event) {
        event.preventDefault();
        if (loading || isSuccess)
            return;
        setError(null);
        const amountVnd = parseAmountVnd(amount);
        if (amountVnd === null) {
            setError(t.amountInvalid);
            return;
        }
        if (!categoryId) {
            setError(t.validationFailed);
            return;
        }
        setLoading(true);
        const requestBody = {
            type: kind,
            amountVnd,
            categoryId,
            occurredAt: new Date().toISOString(),
            ...(description.trim() ? { description: description.trim() } : {}),
        };
        try {
            const response = await apiPost('/ledger/transactions', requestBody, {
                'X-CSRF-Token': csrfToken,
                'Idempotency-Key': crypto.randomUUID(),
            });
            setIsSuccess(true);
            if (response.budgetWarning?.isOverrun) {
                setBudgetWarning(response.budgetWarning);
            }
            else {
                // If no warning, just close and refresh immediately
                onSuccess();
                onClose();
            }
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
    function handleCloseSuccess() {
        onSuccess();
        onClose();
    }
    return (_jsx(Modal, { isOpen: true, onClose: onClose, ariaLabel: title, children: isSuccess && budgetWarning ? (_jsxs("div", { className: "transaction-success-view", children: [_jsx("div", { className: "panel-heading", children: _jsx("h2", { children: t.transactionSaved }) }), _jsx(BudgetWarningBanner, { warning: budgetWarning, locale: locale }), _jsx("button", { className: "primary-button", onClick: handleCloseSuccess, children: t.close })] })) : (_jsxs("form", { onSubmit: submit, children: [_jsxs("div", { className: "panel-heading", children: [_jsx("h2", { children: title }), _jsx("button", { type: "button", className: "icon-button", onClick: onClose, "aria-label": t.close, children: _jsxs("svg", { xmlns: "http://www.w3.org/2000/svg", width: "18", height: "18", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", children: [_jsx("path", { d: "M18 6 6 18" }), _jsx("path", { d: "m6 6 12 12" })] }) })] }), _jsx(ErrorBanner, { error: error instanceof ApiRequestError ? error.apiError : error, locale: locale }), _jsxs("label", { children: [t.amount, _jsx("input", { required: true, inputMode: "numeric", value: amount, onChange: (e) => setAmount(e.target.value), disabled: loading, placeholder: "0" })] }), _jsx(CategorySelect, { appliesTo: kind, value: categoryId, onChange: setCategoryId, locale: locale, label: t.category, placeholder: t.selectCategory, disabled: loading }), _jsxs("label", { children: [t.description, _jsx("input", { value: description, onChange: (e) => setDescription(e.target.value), disabled: loading, maxLength: 255 })] }), _jsx("button", { className: "primary-button", type: "submit", disabled: loading || !amount || !categoryId, children: loading ? t.loading : t.submit })] })) }));
}
//# sourceMappingURL=TransactionForm.js.map