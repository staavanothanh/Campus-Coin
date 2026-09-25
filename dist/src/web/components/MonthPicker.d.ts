import type { Locale } from '../types.js';
interface MonthPickerProps {
    month: string;
    onChange: (month: string) => void;
    locale: Locale;
}
export declare function MonthPicker({ month, onChange, locale }: MonthPickerProps): import("react").JSX.Element;
export {};
