import { type ChangeEvent } from 'react';
import { formatMonth } from '../format.js';
import type { Locale } from '../types.js';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface MonthPickerProps {
  month: string; // YYYY-MM
  onChange: (month: string) => void;
  locale: Locale;
}

export function MonthPicker({ month, onChange, locale }: MonthPickerProps) {
  const parts = month.split('-');
  const year = parseInt(parts[0] || '0', 10);
  const m = parseInt(parts[1] || '1', 10);

  const prevMonth = () => {
    let newM = m - 1;
    let newY = year;
    if (newM < 1) {
      newM = 12;
      newY -= 1;
    }
    onChange(`${newY}-${newM.toString().padStart(2, '0')}`);
  };

  const nextMonth = () => {
    let newM = m + 1;
    let newY = year;
    if (newM > 12) {
      newM = 1;
      newY += 1;
    }
    onChange(`${newY}-${newM.toString().padStart(2, '0')}`);
  };

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.value) {
      onChange(e.target.value);
    }
  };

  return (
    <div className="month-picker">
      <button 
        type="button" 
        className="icon-button" 
        onClick={prevMonth}
        aria-label={locale === 'vi' ? 'Tháng trước' : 'Previous month'}
      >
        <ChevronLeft size={18} />
      </button>
      
      <div className="month-picker-value">
        <label className="visually-hidden" htmlFor="month-input">
          {locale === 'vi' ? 'Chọn tháng' : 'Select month'}
        </label>
        <input 
          id="month-input"
          type="month" 
          value={month} 
          onChange={handleChange} 
          className="month-input-hidden"
          aria-hidden="true"
        />
        <strong>{formatMonth(month, locale)}</strong>
      </div>

      <button 
        type="button" 
        className="icon-button" 
        onClick={nextMonth}
        aria-label={locale === 'vi' ? 'Tháng sau' : 'Next month'}
      >
        <ChevronRight size={18} />
      </button>
    </div>
  );
}
