import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import { apiPatch, ApiRequestError } from '../api-client.js';
import { ErrorBanner } from '../components/ErrorBanner.js';
export function SettingsScreen({ session, theme, onThemeChange, onSessionUpdate, t, locale }) {
    const [displayName, setDisplayName] = useState(session.user.displayName);
    const [prefLocale, setPrefLocale] = useState(session.user.locale);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [successMsg, setSuccessMsg] = useState('');
    async function submit(event) {
        event.preventDefault();
        if (loading)
            return;
        setError(null);
        setSuccessMsg('');
        setLoading(true);
        try {
            const updatedUser = await apiPatch('/users/me/preferences', {
                displayName: displayName.trim(),
                locale: prefLocale,
            }, { 'X-CSRF-Token': session.csrfToken });
            onSessionUpdate({
                ...session,
                user: updatedUser
            });
            setSuccessMsg(prefLocale === 'vi' ? 'Đã lưu thay đổi' : 'Changes saved successfully');
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
    return (_jsxs("section", { className: "feature-panel panel", children: [_jsx("div", { className: "panel-heading", children: _jsxs("div", { children: [_jsx("h2", { children: t.settingsTitle }), _jsx("p", { className: "muted", children: t.personalAccount })] }) }), _jsxs("form", { onSubmit: submit, className: "settings-form", style: { maxWidth: '400px', marginTop: 'var(--space-4)' }, children: [_jsx(ErrorBanner, { error: error instanceof ApiRequestError ? error.apiError : error, locale: locale }), successMsg && (_jsx("div", { className: "budget-warning-banner", style: { background: 'var(--mint-500)', color: 'white', marginBottom: 'var(--space-4)' }, role: "status", children: _jsx("p", { children: successMsg }) })), _jsxs("label", { children: ["T\u00EAn hi\u1EC3n th\u1ECB", _jsx("input", { required: true, type: "text", value: displayName, onChange: (e) => setDisplayName(e.target.value), disabled: loading, maxLength: 50 })] }), _jsxs("label", { children: [t.language, _jsxs("select", { value: prefLocale, onChange: (e) => setPrefLocale(e.target.value), disabled: loading, children: [_jsx("option", { value: "vi", children: "Ti\u1EBFng Vi\u1EC7t" }), _jsx("option", { value: "en", children: "English" })] })] }), _jsxs("label", { children: [t.appearance, _jsxs("select", { value: theme, onChange: (e) => onThemeChange(e.target.value), disabled: loading, children: [_jsx("option", { value: "light", children: locale === 'vi' ? 'Sáng' : 'Light' }), _jsx("option", { value: "dark", children: locale === 'vi' ? 'Tối' : 'Dark' })] }), _jsx("small", { className: "muted", children: locale === 'vi' ? 'Chỉ áp dụng trên thiết bị này' : 'Applies to this device only' })] }), _jsx("div", { style: { marginTop: 'var(--space-6)' }, children: _jsx("button", { className: "primary-button", type: "submit", disabled: loading || !displayName.trim(), children: loading ? t.loading : (locale === 'vi' ? 'Lưu thay đổi' : 'Save changes') }) })] })] }));
}
//# sourceMappingURL=SettingsScreen.js.map