import type { Locale } from '../types.js';
import type { Copy } from '../i18n.js';
interface BudgetFormProps {
    categoryId: string;
    month: string;
    initialLimitVnd: number | null;
    csrfToken: string;
    t: Copy;
    locale: Locale;
    onClose: () => void;
    onSuccess: () => void;
}
export declare function BudgetForm({ categoryId, month, initialLimitVnd, csrfToken, t, locale, onClose, onSuccess, }: BudgetFormProps): import("react").JSX.Element;
export {};
