import { useState, useRef, useEffect } from 'react';
import { formatMonth, getCurrentMonth } from '../format.js';
import type { Locale } from '../types.js';
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  ChevronDown,
  RotateCcw
} from 'lucide-react';

interface MonthPickerProps {
  month: string; // YYYY-MM
  onChange: (month: string) => void;
  locale: Locale;
}

const MONTH_NAMES_VI = [
  'Tháng 1', 'Tháng 2', 'Tháng 3', 'Tháng 4',
  'Tháng 5', 'Tháng 6', 'Tháng 7', 'Tháng 8',
  'Tháng 9', 'Tháng 10', 'Tháng 11', 'Tháng 12'
];

const MONTH_NAMES_EN = [
  'Jan', 'Feb', 'Mar', 'Apr',
  'May', 'Jun', 'Jul', 'Aug',
  'Sep', 'Oct', 'Nov', 'Dec'
];

export function MonthPicker({ month, onChange, locale }: MonthPickerProps) {
  const isVi = locale === 'vi';
  const parts = month.split('-');
  const selectedYear = parseInt(parts[0] || getCurrentMonth().slice(0, 4), 10);
  const selectedMonth = parseInt(parts[1] || '1', 10);

  const [isOpen, setIsOpen] = useState(false);
  const [viewYear, setViewYear] = useState(selectedYear);
  const containerRef = useRef<HTMLDivElement>(null);

  const currentMonthStr = getCurrentMonth();
  const isCurrentMonth = month === currentMonthStr;

  // Sync viewYear when month prop changes or modal opens
  useEffect(() => {
    setViewYear(selectedYear);
  }, [selectedYear, isOpen]);

  // Handle clicking outside to close popover
  useEffect(() => {
    if (!isOpen) return;
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  // Handle Escape key
  useEffect(() => {
    if (!isOpen) return;
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  const prevMonth = () => {
    let newM = selectedMonth - 1;
    let newY = selectedYear;
    if (newM < 1) {
      newM = 12;
      newY -= 1;
    }
    onChange(`${newY}-${newM.toString().padStart(2, '0')}`);
  };

  const nextMonth = () => {
    let newM = selectedMonth + 1;
    let newY = selectedYear;
    if (newM > 12) {
      newM = 1;
      newY += 1;
    }
    onChange(`${newY}-${newM.toString().padStart(2, '0')}`);
  };

  const selectMonth = (mIndex: number) => {
    const formatted = `${viewYear}-${(mIndex + 1).toString().padStart(2, '0')}`;
    onChange(formatted);
    setIsOpen(false);
  };

  const goToCurrentMonth = () => {
    onChange(currentMonthStr);
    setIsOpen(false);
  };

  const monthLabels = isVi ? MONTH_NAMES_VI : MONTH_NAMES_EN;

  return (
    <div className="modern-month-picker" ref={containerRef}>
      {/* Step Left */}
      <button
        type="button"
        className="month-nav-btn"
        onClick={prevMonth}
        title={isVi ? 'Tháng trước' : 'Previous month'}
        aria-label={isVi ? 'Tháng trước' : 'Previous month'}
      >
        <ChevronLeft size={16} />
      </button>

      {/* Main trigger button */}
      <button
        type="button"
        className={`month-trigger-btn ${isOpen ? 'is-active' : ''}`}
        onClick={() => setIsOpen(!isOpen)}
        aria-haspopup="dialog"
        aria-expanded={isOpen}
      >
        <CalendarIcon size={16} className="calendar-icon" />
        <span className="month-display-text">{formatMonth(month, locale)}</span>
        <ChevronDown size={14} className={`chevron-indicator ${isOpen ? 'rotate' : ''}`} />
      </button>

      {/* Step Right */}
      <button
        type="button"
        className="month-nav-btn"
        onClick={nextMonth}
        title={isVi ? 'Tháng sau' : 'Next month'}
        aria-label={isVi ? 'Tháng sau' : 'Next month'}
      >
        <ChevronRight size={16} />
      </button>

      {/* Quick reset to today button if not current month */}
      {!isCurrentMonth && (
        <button
          type="button"
          className="month-today-quick-btn"
          onClick={goToCurrentMonth}
          title={isVi ? 'Về tháng hiện tại' : 'Jump to current month'}
        >
          <RotateCcw size={13} />
          <span>{isVi ? 'Tháng này' : 'Today'}</span>
        </button>
      )}

      {/* Floating interactive calendar popover */}
      {isOpen && (
        <div className="month-picker-popover animate-fade-in" role="dialog" aria-label={isVi ? 'Chọn tháng báo cáo' : 'Select report month'}>
          <div className="popover-year-header">
            <button
              type="button"
              className="year-nav-btn"
              onClick={() => setViewYear(y => y - 1)}
              aria-label={isVi ? 'Năm trước' : 'Previous year'}
            >
              <ChevronLeft size={16} />
            </button>
            <span className="popover-year-label">{viewYear}</span>
            <button
              type="button"
              className="year-nav-btn"
              onClick={() => setViewYear(y => y + 1)}
              aria-label={isVi ? 'Năm sau' : 'Next year'}
            >
              <ChevronRight size={16} />
            </button>
          </div>

          <div className="popover-months-grid">
            {monthLabels.map((label, idx) => {
              const monthNum = idx + 1;
              const isSelected = selectedYear === viewYear && selectedMonth === monthNum;
              const isNow = currentMonthStr === `${viewYear}-${monthNum.toString().padStart(2, '0')}`;

              return (
                <button
                  key={idx}
                  type="button"
                  className={`month-cell-btn ${isSelected ? 'is-selected' : ''} ${isNow ? 'is-now' : ''}`}
                  onClick={() => selectMonth(idx)}
                >
                  <span>{label}</span>
                  {isNow && !isSelected && <span className="now-dot" />}
                </button>
              );
            })}
          </div>

          <div className="popover-footer">
            <button
              type="button"
              className="popover-footer-btn"
              onClick={goToCurrentMonth}
            >
              {isVi ? 'Về tháng này' : 'This Month'}
            </button>
            <button
              type="button"
              className="popover-footer-btn secondary"
              onClick={() => setIsOpen(false)}
            >
              {isVi ? 'Đóng' : 'Close'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
