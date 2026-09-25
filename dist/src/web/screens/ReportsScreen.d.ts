import type { Locale } from '../types.js';
import type { Copy } from '../i18n.js';
interface ReportsScreenProps {
    csrfToken: string;
    t: Copy;
    locale: Locale;
}
export declare function ReportsScreen({ csrfToken, t, locale }: ReportsScreenProps): import("react").JSX.Element;
export {};
