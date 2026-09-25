import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { formatMonth } from '../format.js';
import { ChevronLeft, ChevronRight } from 'lucide-react';
export function MonthPicker({ month, onChange, locale }) {
    const parts = month.split('-');
    const year = parseInt(parts[0] || '0', 10);
    const m = parseInt(parts[1] || '1', 10);
    const prevMonth = () => {
        let newM = m - 1;
        let newY = year;
        if (newM < 1) {
            newM = 12;
            newY -= 1;
        }
        onChange(`${newY}-${newM.toString().padStart(2, '0')}`);
    };
    const nextMonth = () => {
        let newM = m + 1;
        let newY = year;
        if (newM > 12) {
            newM = 1;
            newY += 1;
        }
        onChange(`${newY}-${newM.toString().padStart(2, '0')}`);
    };
    const handleChange = (e) => {
        if (e.target.value) {
            onChange(e.target.value);
        }
    };
    return (_jsxs("div", { className: "month-picker", children: [_jsx("button", { type: "button", className: "icon-button", onClick: prevMonth, "aria-label": locale === 'vi' ? 'Tháng trước' : 'Previous month', children: _jsx(ChevronLeft, { size: 18 }) }), _jsxs("div", { className: "month-picker-value", children: [_jsx("label", { className: "visually-hidden", htmlFor: "month-input", children: locale === 'vi' ? 'Chọn tháng' : 'Select month' }), _jsx("input", { id: "month-input", type: "month", value: month, onChange: handleChange, className: "month-input-hidden", "aria-hidden": "true" }), _jsx("strong", { children: formatMonth(month, locale) })] }), _jsx("button", { type: "button", className: "icon-button", onClick: nextMonth, "aria-label": locale === 'vi' ? 'Tháng sau' : 'Next month', children: _jsx(ChevronRight, { size: 18 }) })] }));
}
//# sourceMappingURL=MonthPicker.js.map