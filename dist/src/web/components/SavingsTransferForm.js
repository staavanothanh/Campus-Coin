import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import { apiPost, ApiRequestError } from '../api-client.js';
import { parseAmountVnd } from '../format.js';
import { Modal } from './Modal.js';
import { ErrorBanner } from './ErrorBanner.js';
export function SavingsTransferForm({ direction, csrfToken, t, locale, onClose, onSuccess, }) {
    const [amount, setAmount] = useState('');
    const [note, setNote] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const title = direction === 'deposit'
        ? (locale === 'vi' ? 'Gửi tiền vào tiết kiệm' : 'Deposit to savings')
        : (locale === 'vi' ? 'Rút tiền từ tiết kiệm' : 'Withdraw from savings');
    async function submit(event) {
        event.preventDefault();
        if (loading)
            return;
        setError(null);
        const amountVnd = parseAmountVnd(amount);
        if (amountVnd === null) {
            setError(t.amountInvalid);
            return;
        }
        setLoading(true);
        const requestBody = {
            direction,
            amountVnd,
            ...(note.trim() ? { note: note.trim() } : {}),
        };
        try {
            await apiPost('/savings/transfers', requestBody, {
                'X-CSRF-Token': csrfToken,
                'Idempotency-Key': crypto.randomUUID(),
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
    return (_jsx(Modal, { isOpen: true, onClose: onClose, ariaLabel: title, children: _jsxs("form", { onSubmit: submit, children: [_jsxs("div", { className: "panel-heading", children: [_jsx("h2", { children: title }), _jsx("button", { type: "button", className: "icon-button", onClick: onClose, "aria-label": t.close, children: _jsxs("svg", { xmlns: "http://www.w3.org/2000/svg", width: "18", height: "18", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", children: [_jsx("path", { d: "M18 6 6 18" }), _jsx("path", { d: "m6 6 12 12" })] }) })] }), _jsx(ErrorBanner, { error: error instanceof ApiRequestError ? error.apiError : error, locale: locale }), _jsxs("label", { children: [t.amount, _jsx("input", { required: true, inputMode: "numeric", value: amount, onChange: (e) => setAmount(e.target.value), disabled: loading, placeholder: "0" })] }), _jsxs("label", { children: ["Ghi ch\u00FA", _jsx("input", { value: note, onChange: (e) => setNote(e.target.value), disabled: loading, maxLength: 255 })] }), _jsx("button", { className: "primary-button", type: "submit", disabled: loading || !amount, children: loading ? t.loading : t.submit })] }) }));
}
//# sourceMappingURL=SavingsTransferForm.js.map