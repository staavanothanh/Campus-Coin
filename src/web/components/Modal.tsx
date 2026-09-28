import { type MouseEvent, type ReactNode, useRef, type RefObject } from 'react';
import { useDialogFocus } from '../use-dialog-focus.js';

export function Modal({ isOpen, onClose, ariaLabel, initialFocusRef, restoreFocusRef, canClose = () => true, children }: { isOpen: boolean; onClose(): void; ariaLabel: string; initialFocusRef?: RefObject<HTMLElement | null>; restoreFocusRef?: RefObject<HTMLElement | null> | undefined; canClose?: () => boolean; children: ReactNode }) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const startedOnBackdrop = useRef(false);
  useDialogFocus(dialogRef, onClose, initialFocusRef, restoreFocusRef, canClose, isOpen);
  const handleMouseDown = (event: MouseEvent<HTMLDivElement>) => { startedOnBackdrop.current = canClose() && event.target === event.currentTarget; };
  const handleClick = (event: MouseEvent<HTMLDivElement>) => { if (canClose() && startedOnBackdrop.current && event.target === event.currentTarget) onClose(); startedOnBackdrop.current = false; };
  if (!isOpen) return null;
  return <div className="modal-backdrop" onMouseDown={handleMouseDown} onClick={handleClick}>
    <div ref={dialogRef} className="modal" role="dialog" aria-modal="true" aria-label={ariaLabel} tabIndex={-1}>{children}</div>
  </div>;
}
