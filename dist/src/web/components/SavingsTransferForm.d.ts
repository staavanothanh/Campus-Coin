import type { TransferDirection, Locale } from '../types.js';
import type { Copy } from '../i18n.js';
interface SavingsTransferFormProps {
    direction: TransferDirection;
    csrfToken: string;
    t: Copy;
    locale: Locale;
    onClose: () => void;
    onSuccess: () => void;
}
export declare function SavingsTransferForm({ direction, csrfToken, t, locale, onClose, onSuccess, }: SavingsTransferFormProps): import("react").JSX.Element;
export {};
