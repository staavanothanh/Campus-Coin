import { useEffect, useRef, type RefObject } from 'react';

export function useDialogFocus(dialogRef: RefObject<HTMLElement | null>, onClose: () => void, initialFocusRef?: RefObject<HTMLElement | null>, restoreFocusRef?: RefObject<HTMLElement | null>, canClose: () => boolean = () => true, isOpen = true): void {
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  const canCloseRef = useRef(canClose);
  canCloseRef.current = canClose;

  useEffect(() => {
    if (!isOpen) return;
    const dialogRefCurrent = dialogRef.current;
    if (!dialogRefCurrent) return;
    const dialog = dialogRefCurrent;
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const focusable = () => Array.from(dialog.querySelectorAll<HTMLElement>(
      'button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
    ));
    const first = focusable()[0];
    (initialFocusRef?.current ?? first ?? dialog).focus();

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        if (!canCloseRef.current()) { event.preventDefault(); return; }
        closeRef.current();
        return;
      }
      if (event.key !== 'Tab') return;
      const items = focusable();
      const firstItem = items[0];
      const lastItem = items.at(-1);
      const activeElement = document.activeElement;
      if (!firstItem || !lastItem) {
        event.preventDefault();
        dialog.focus();
      } else if (activeElement === dialog) {
        event.preventDefault();
        (event.shiftKey ? lastItem : firstItem).focus();
      } else if (!dialog.contains(activeElement)) {
        event.preventDefault();
        firstItem.focus();
      } else if (event.shiftKey && activeElement === firstItem) {
        event.preventDefault();
        lastItem.focus();
      } else if (!event.shiftKey && activeElement === lastItem) {
        event.preventDefault();
        firstItem.focus();
      }
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      if (previousFocus?.isConnected) previousFocus.focus();
      else if (restoreFocusRef?.current?.isConnected) restoreFocusRef.current.focus();
    };
  }, [dialogRef, initialFocusRef, restoreFocusRef, isOpen]);
}
