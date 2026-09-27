import { type ReactNode, useEffect, useRef } from 'react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  ariaLabel: string;
  children: ReactNode;
  closeDisabled?: boolean;
}

/**
 * Accessible modal dialog with focus trap, Escape-to-close,
 * backdrop click-to-close, and focus restoration on unmount.
 */
export function Modal({ isOpen, onClose, ariaLabel, children, closeDisabled = false }: ModalProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  // Focus trap: Tab/Shift+Tab cycle within dialog, Escape to close
  useEffect(() => {
    if (!isOpen) return;
    const dialog = dialogRef.current;

    function getFocusableElements() {
      if (!dialog) return [];
      return Array.from(dialog.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
      )).filter(element =>
        !element.hasAttribute('disabled') &&
        !element.hasAttribute('hidden') &&
        element.getAttribute('aria-hidden') !== 'true' &&
        element.tabIndex >= 0,
      );
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        if (!closeDisabled) onClose();
        return;
      }
      if (event.key !== 'Tab' || !dialog) return;

      const focusable = getFocusableElements();
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (!first || !last) {
        event.preventDefault();
        dialog.focus();
        return;
      }

      if (!dialog.contains(document.activeElement)) {
        event.preventDefault();
        (event.shiftKey ? last : first).focus();
        return;
      }

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    function keepFocusInside(event: FocusEvent) {
      if (dialog && !dialog.contains(event.target as Node)) {
        const first = getFocusableElements()[0];
        (first ?? dialog).focus();
      }
    }

    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('focusin', keepFocusInside);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('focusin', keepFocusInside);
    };
  }, [isOpen, onClose, closeDisabled]);

  // Focus management: capture previous focus, move to dialog, restore on close/unmount
  useEffect(() => {
    if (!isOpen) return;
    previousFocusRef.current = document.activeElement as HTMLElement | null;

    const dialog = dialogRef.current;
    if (dialog) {
      const preferred = dialog.querySelector<HTMLElement>('[data-modal-autofocus]');
      const first = dialog.querySelector<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
      );
      const initialFocus = preferred && !preferred.hasAttribute('disabled') ? preferred : first;
      (initialFocus ?? dialog).focus();
    }

    const previousBodyOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = previousBodyOverflow;
      previousFocusRef.current?.focus();
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div
      className="modal-backdrop"
      onClick={(e) => { if (!closeDisabled && e.target === e.currentTarget) onClose(); }}
    >
      <div
        ref={dialogRef}
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-label={ariaLabel}
        tabIndex={-1}
      >
        {children}
      </div>
    </div>
  );
}
