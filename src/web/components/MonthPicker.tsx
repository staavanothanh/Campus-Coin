import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Calendar, ChevronDown, ChevronLeft, ChevronRight, RotateCcw } from 'lucide-react';
import { currentMonthKey, formatMonth } from '../format.js';
import type { Locale } from '../types.js';
import { copy } from '../i18n.js';

type MonthPickerProps = { month: string; onChange(month: string): void; locale: Locale };

const MONTH_LABELS: Record<Locale, string[]> = {
  vi: ['Tháng 1', 'Tháng 2', 'Tháng 3', 'Tháng 4', 'Tháng 5', 'Tháng 6', 'Tháng 7', 'Tháng 8', 'Tháng 9', 'Tháng 10', 'Tháng 11', 'Tháng 12'],
  en: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
};

export function MonthPicker({ month, onChange, locale }: MonthPickerProps) {
  const [selectedYearText, selectedMonthText] = month.split('-');
  const selectedYear = Number(selectedYearText) || Number(currentMonthKey().slice(0, 4));
  const selectedMonth = Number(selectedMonthText) || 1;
  const [open, setOpen] = useState(false);
  const [viewYear, setViewYear] = useState(selectedYear);
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const [popoverPosition, setPopoverPosition] = useState<{ top: number; left: number; width: number; maxHeight: number } | null>(null);
  const today = currentMonthKey();
  const isCurrentMonth = month === today;

  useEffect(() => { setViewYear(selectedYear); }, [selectedYear, open]);
  useEffect(() => {
    if (!open) return;
    const focusable = () => Array.from(popoverRef.current?.querySelectorAll<HTMLElement>('button:not([disabled])') ?? []);
    const firstMonth = popoverRef.current?.querySelector<HTMLElement>('.month-cell-btn.is-selected') ?? focusable()[0];
    firstMonth?.focus();
    const close = () => { setOpen(false); };
    const closeOnOutsideClick = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) { close(); return; }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { event.preventDefault(); close(); window.requestAnimationFrame(() => triggerRef.current?.focus()); return; }
      if (event.key !== 'Tab') return;
      const items = focusable();
      const first = items[0];
      const last = items.at(-1);
      if (!first || !last) return;
      if (!popoverRef.current?.contains(document.activeElement)) { event.preventDefault(); first.focus(); }
      else if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    document.addEventListener('click', closeOnOutsideClick);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('click', closeOnOutsideClick);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open]);

  useLayoutEffect(() => {
    if (!open) return;
    const updatePosition = () => {
      const trigger = triggerRef.current;
      const popover = popoverRef.current;
      if (!trigger || !popover) return;

      const triggerRect = trigger.getBoundingClientRect();
      const popoverRect = popover.getBoundingClientRect();
      const viewport = window.visualViewport;
      const viewportLeft = viewport?.offsetLeft ?? 0;
      const viewportTop = viewport?.offsetTop ?? 0;
      const viewportWidth = viewport?.width ?? document.documentElement.clientWidth ?? window.innerWidth;
      const viewportHeight = viewport?.height ?? document.documentElement.clientHeight ?? window.innerHeight;
      const edge = 8;
      const gap = 8;
      const belowSpace = viewportTop + viewportHeight - triggerRect.bottom - gap - edge;
      const aboveSpace = triggerRect.top - viewportTop - gap - edge;
      const placeBelow = belowSpace >= popover.scrollHeight || belowSpace >= aboveSpace;
      const availableHeight = Math.max(0, placeBelow ? belowSpace : aboveSpace);
      const preferredWidth = Number.parseFloat(getComputedStyle(popover).getPropertyValue('--month-picker-width')) || popoverRect.width;
      const width = Math.min(preferredWidth, Math.max(0, viewportWidth - edge * 2));
      const maxHeight = Math.min(viewportHeight - edge * 2, availableHeight);
      const popoverHeight = Math.min(popover.scrollHeight, maxHeight);
      const requestedTop = placeBelow ? triggerRect.bottom + gap : triggerRect.top - gap - popoverHeight;
      const top = Math.max(viewportTop + edge, Math.min(requestedTop, viewportTop + viewportHeight - edge - popoverHeight));
      const requestedLeft = triggerRect.right - width;
      const left = Math.max(viewportLeft + edge, Math.min(requestedLeft, viewportLeft + viewportWidth - edge - width));

      setPopoverPosition(previous => previous?.top === top && previous.left === left && previous.width === width && previous.maxHeight === maxHeight
        ? previous
        : { top, left, width, maxHeight });
    };

    updatePosition();
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);
    window.visualViewport?.addEventListener('resize', updatePosition);
    window.visualViewport?.addEventListener('scroll', updatePosition);
    return () => {
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
      window.visualViewport?.removeEventListener('resize', updatePosition);
      window.visualViewport?.removeEventListener('scroll', updatePosition);
    };
  }, [open]);

  function changeMonth(offset: number) {
    const next = new Date(Date.UTC(selectedYear, selectedMonth - 1 + offset, 1));
    onChange(`${next.getUTCFullYear()}-${String(next.getUTCMonth() + 1).padStart(2, '0')}`);
    setOpen(false);
  }

  function selectMonth(monthIndex: number) {
    onChange(`${viewYear}-${String(monthIndex + 1).padStart(2, '0')}`);
    setOpen(false);
    window.requestAnimationFrame(() => triggerRef.current?.focus());
  }

  return <div className="modern-month-picker" ref={containerRef}>
    <button type="button" className="month-nav-btn" onClick={() => changeMonth(-1)} aria-label={copy[locale].previousMonth}><ChevronLeft size={16} aria-hidden="true" /></button>
    <button ref={triggerRef} type="button" className={`month-trigger-btn ${open ? 'is-active' : ''}`} onClick={() => setOpen(previous => !previous)} aria-haspopup="dialog" aria-controls="report-month-dialog" aria-expanded={open}><Calendar size={16} className="calendar-icon" aria-hidden="true" /><span>{formatMonth(month, locale)}</span><ChevronDown size={14} className={`chevron-indicator ${open ? 'rotate' : ''}`} aria-hidden="true" /></button>
    <button type="button" className="month-nav-btn" onClick={() => changeMonth(1)} aria-label={copy[locale].nextMonth}><ChevronRight size={16} aria-hidden="true" /></button>
    {!isCurrentMonth && <button type="button" className="month-today-quick-btn" onClick={() => { onChange(today); setOpen(false); window.requestAnimationFrame(() => triggerRef.current?.focus()); }} aria-label={copy[locale].jumpToCurrentMonth}><RotateCcw size={13} /><span>{copy[locale].thisMonthAction}</span></button>}
    {open && <div ref={popoverRef} id="report-month-dialog" className="month-picker-popover" role="dialog" aria-label={copy[locale].selectReportMonth} style={{ top: popoverPosition?.top ?? 0, left: popoverPosition?.left ?? 0, width: popoverPosition?.width, maxHeight: popoverPosition?.maxHeight, visibility: popoverPosition ? 'visible' : 'hidden' }}>
      <div className="popover-year-header"><button type="button" className="year-nav-btn" onClick={() => setViewYear(year => year - 1)} aria-label={copy[locale].previousYear}><ChevronLeft size={16} aria-hidden="true" /></button><span className="popover-year-label">{viewYear}</span><button type="button" className="year-nav-btn" onClick={() => setViewYear(year => year + 1)} aria-label={copy[locale].nextYear}><ChevronRight size={16} aria-hidden="true" /></button></div>
      <div className="popover-months-grid">{MONTH_LABELS[locale].map((label, index) => { const monthNumber = index + 1; const value = `${viewYear}-${String(monthNumber).padStart(2, '0')}`; const isSelected = value === month; const isNow = value === today; return <button key={value} type="button" className={`month-cell-btn ${isSelected ? 'is-selected' : ''} ${isNow ? 'is-now' : ''}`} aria-pressed={isSelected} aria-current={isNow ? 'date' : undefined} onClick={() => selectMonth(index)}><span>{label}</span>{isNow && !isSelected && <span className="now-dot" aria-hidden="true" />}</button>; })}</div>
      <div className="popover-footer"><button type="button" className="popover-footer-btn" onClick={() => { onChange(today); setOpen(false); window.requestAnimationFrame(() => triggerRef.current?.focus()); }}>{copy[locale].thisMonthAction}</button><button type="button" className="popover-footer-btn secondary" onClick={() => { setOpen(false); window.requestAnimationFrame(() => triggerRef.current?.focus()); }}>{copy[locale].close}</button></div>
    </div>}
  </div>;
}
