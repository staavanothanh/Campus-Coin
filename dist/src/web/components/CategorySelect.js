import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from 'react';
import { apiGet } from '../api-client.js';
/**
 * Category picker that fetches active categories from GET /categories.
 * Filters by appliesTo (income/payment) and displays en/vi name per locale.
 * Shows loading/error state in the placeholder option.
 */
export function CategorySelect({ appliesTo, value, onChange, locale, label, placeholder, disabled, }) {
    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(true);
    const [hasError, setHasError] = useState(false);
    useEffect(() => {
        let cancelled = false;
        setLoading(true);
        setHasError(false);
        apiGet(`/categories?appliesTo=${appliesTo}`)
            .then((data) => {
            if (!cancelled) {
                setCategories(data);
                setLoading(false);
            }
        })
            .catch(() => {
            if (!cancelled) {
                setHasError(true);
                setLoading(false);
            }
        });
        return () => { cancelled = true; };
    }, [appliesTo]);
    const activeCategories = categories.filter((c) => c.status === 'active');
    const placeholderText = loading
        ? '\u2026'
        : hasError
            ? '\u26A0 ' + placeholder
            : placeholder;
    return (_jsxs("label", { children: [label, _jsxs("select", { required: true, value: value, onChange: (e) => onChange(e.target.value), disabled: disabled || loading, "aria-busy": loading, children: [_jsx("option", { value: "", disabled: true, children: placeholderText }), activeCategories.map((cat) => (_jsx("option", { value: cat.id, children: locale === 'vi' ? (cat.name.vi || cat.name.en) : cat.name.en }, cat.id)))] })] }));
}
//# sourceMappingURL=CategorySelect.js.map