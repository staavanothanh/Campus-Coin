import type { BudgetWarning, Locale } from '../types.js';
interface BudgetWarningBannerProps {
    warning: BudgetWarning;
    locale: Locale;
}
/**
 * Budget overrun warning banner.
 * Shown after a transaction is created when the budget category has been exceeded.
 * Budget overrun is warning-only — it does not block the payment.
 */
export declare function BudgetWarningBanner({ warning, locale }: BudgetWarningBannerProps): import("react").JSX.Element | null;
export {};
