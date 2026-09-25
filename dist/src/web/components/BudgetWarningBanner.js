import { jsx as _jsx } from "react/jsx-runtime";
import { formatVnd } from '../format.js';
/**
 * Budget overrun warning banner.
 * Shown after a transaction is created when the budget category has been exceeded.
 * Budget overrun is warning-only — it does not block the payment.
 */
export function BudgetWarningBanner({ warning, locale }) {
    if (!warning.isOverrun)
        return null;
    const used = formatVnd(warning.usedVnd, locale);
    const limit = formatVnd(warning.limitVnd, locale);
    return (_jsx("div", { className: "budget-warning-banner", role: "status", children: _jsx("p", { children: locale === 'vi'
                ? `\u26A0 Ngân sách vượt mức: đã dùng ${used} / giới hạn ${limit}`
                : `\u26A0 Budget exceeded: used ${used} / limit ${limit}` }) }));
}
//# sourceMappingURL=BudgetWarningBanner.js.map