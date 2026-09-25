import type { Locale } from '../types.js';
import type { Copy } from '../i18n.js';
interface SavingsScreenProps {
    csrfToken: string;
    t: Copy;
    locale: Locale;
}
export declare function SavingsScreen({ csrfToken, t, locale }: SavingsScreenProps): import("react").JSX.Element;
export {};
