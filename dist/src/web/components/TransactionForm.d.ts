import type { TransactionType, Locale } from '../types.js';
import type { Copy } from '../i18n.js';
interface TransactionFormProps {
    kind: TransactionType;
    csrfToken: string;
    t: Copy;
    locale: Locale;
    onClose: () => void;
    onSuccess: () => void;
}
export declare function TransactionForm({ kind, csrfToken, t, locale, onClose, onSuccess, }: TransactionFormProps): import("react").JSX.Element;
export {};
