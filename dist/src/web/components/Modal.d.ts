import { type ReactNode } from 'react';
interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
    ariaLabel: string;
    children: ReactNode;
}
/**
 * Accessible modal dialog with focus trap, Escape-to-close,
 * backdrop click-to-close, and focus restoration on unmount.
 */
export declare function Modal({ isOpen, onClose, ariaLabel, children }: ModalProps): import("react").JSX.Element | null;
export {};
