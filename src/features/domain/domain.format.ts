import type { Language } from '../../app/text';

export function formatVnd(value: number, language: Language) {
  return new Intl.NumberFormat(language === 'vi' ? 'vi-VN' : 'en-US', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(value);
}

export function hcmMonthKey(date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Ho_Chi_Minh',
    year: 'numeric',
    month: '2-digit',
  }).formatToParts(date);
  const year = parts.find(part => part.type === 'year')?.value;
  const month = parts.find(part => part.type === 'month')?.value;
  if (!year || !month) throw new Error('Could not read the Ho Chi Minh City month');
  return `${year}-${month}`;
}

export function hcmDateTimeLocal(date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Ho_Chi_Minh',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date);
  const value = (type: string) => parts.find(part => part.type === type)?.value;
  const year = value('year');
  const month = value('month');
  const day = value('day');
  const hour = value('hour');
  const minute = value('minute');
  if (!year || !month || !day || !hour || !minute) {
    throw new Error('Could not read the Ho Chi Minh City time');
  }
  return `${year}-${month}-${day}T${hour}:${minute}`;
}

export function hcmDateTimeToIso(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)) {
    throw new Error('Enter a valid date and time');
  }
  const date = new Date(`${value}:00+07:00`);
  if (!Number.isFinite(date.getTime())) throw new Error('Enter a valid date and time');
  const isoValue = date.toISOString();
  if (hcmDateTimeLocal(new Date(isoValue)) !== value) throw new Error('Enter a valid date and time');
  return isoValue;
}
