import type { Locale, Session } from '../types.js';
import type { Copy } from '../i18n.js';
interface AdminScreenProps {
    session: Session;
    csrfToken: string;
    t: Copy;
    locale: Locale;
}
export declare function AdminScreen({ session, csrfToken, t, locale }: AdminScreenProps): import("react").JSX.Element;
export {};
