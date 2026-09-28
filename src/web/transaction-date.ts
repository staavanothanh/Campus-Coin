const HCMC_TIME_ZONE = 'Asia/Ho_Chi_Minh';
const HCMC_UTC_OFFSET = '+07:00';
const DATE_ONLY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

const hcmcDateParts = new Intl.DateTimeFormat('en-US', {
  timeZone: HCMC_TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

export function todayInHcmc(now: Date = new Date()): string {
  const parts = hcmcDateParts.formatToParts(now);
  const year = parts.find((part) => part.type === 'year')?.value;
  const month = parts.find((part) => part.type === 'month')?.value;
  const day = parts.find((part) => part.type === 'day')?.value;
  if (!year || !month || !day) throw new Error('Could not read the HCMC calendar date');
  return `${year}-${month}-${day}`;
}

export function hcmcDateToIsoInstant(dateOnly: string): string | null {
  if (!DATE_ONLY_PATTERN.test(dateOnly)) return null;

  const checkDate = new Date(`${dateOnly}T00:00:00.000Z`);
  if (Number.isNaN(checkDate.getTime()) || checkDate.toISOString().slice(0, 10) !== dateOnly) {
    return null;
  }

  return new Date(`${dateOnly}T00:00:00${HCMC_UTC_OFFSET}`).toISOString();
}
