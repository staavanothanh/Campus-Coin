import type { ApiError, Locale } from '../types.js';
interface ErrorBannerProps {
    error: ApiError | string | null;
    locale: Locale;
}
/**
 * Error banner that displays API errors with user-friendly messages.
 * Maps error codes to en/vi localized text.
 * Shows field-level details when available.
 */
export declare function ErrorBanner({ error, locale }: ErrorBannerProps): import("react").JSX.Element | null;
export {};
