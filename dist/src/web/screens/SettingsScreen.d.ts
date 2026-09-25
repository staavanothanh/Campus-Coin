import type { Session, Locale, Theme } from '../types.js';
import type { Copy } from '../i18n.js';
interface SettingsScreenProps {
    session: Session;
    theme: Theme;
    onThemeChange: (theme: Theme) => void;
    onSessionUpdate: (session: Session) => void;
    t: Copy;
    locale: Locale;
}
export declare function SettingsScreen({ session, theme, onThemeChange, onSessionUpdate, t, locale }: SettingsScreenProps): import("react").JSX.Element;
export {};
