import type { TransactionType, Locale } from '../types.js';
interface CategorySelectProps {
    appliesTo: TransactionType;
    value: string;
    onChange: (categoryId: string) => void;
    locale: Locale;
    label: string;
    placeholder: string;
    disabled?: boolean;
}
/**
 * Category picker that fetches active categories from GET /categories.
 * Filters by appliesTo (income/payment) and displays en/vi name per locale.
 * Shows loading/error state in the placeholder option.
 */
export declare function CategorySelect({ appliesTo, value, onChange, locale, label, placeholder, disabled, }: CategorySelectProps): import("react").JSX.Element;
export {};
