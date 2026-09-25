import { jsx as _jsx } from "react/jsx-runtime";
import { useEffect, useRef } from 'react';
/**
 * Accessible modal dialog with focus trap, Escape-to-close,
 * backdrop click-to-close, and focus restoration on unmount.
 */
export function Modal({ isOpen, onClose, ariaLabel, children }) {
    const dialogRef = useRef(null);
    const previousFocusRef = useRef(null);
    // Focus trap: Tab/Shift+Tab cycle within dialog, Escape to close
    useEffect(() => {
        if (!isOpen)
            return;
        const dialog = dialogRef.current;
        function handleKeyDown(event) {
            if (event.key === 'Escape') {
                onClose();
                return;
            }
            if (event.key !== 'Tab' || !dialog)
                return;
            const focusable = dialog.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
            const first = focusable[0];
            const last = focusable[focusable.length - 1];
            if (!first || !last)
                return;
            if (event.shiftKey && document.activeElement === first) {
                event.preventDefault();
                last.focus();
            }
            else if (!event.shiftKey && document.activeElement === last) {
                event.preventDefault();
                first.focus();
            }
        }
        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, onClose]);
    // Focus management: capture previous focus, move to dialog, restore on close/unmount
    useEffect(() => {
        if (!isOpen)
            return;
        previousFocusRef.current = document.activeElement;
        const dialog = dialogRef.current;
        if (dialog) {
            const first = dialog.querySelector('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
            first?.focus();
        }
        return () => {
            previousFocusRef.current?.focus();
        };
    }, [isOpen]);
    if (!isOpen)
        return null;
    return (_jsx("div", { className: "modal-backdrop", onClick: (e) => { if (e.target === e.currentTarget)
            onClose(); }, children: _jsx("div", { ref: dialogRef, className: "modal", role: "dialog", "aria-modal": "true", "aria-label": ariaLabel, children: children }) }));
}
//# sourceMappingURL=Modal.js.map