export const PROFILE_GENDERS = ["female", "male", "non_binary", "prefer_not_to_say"] as const;
export type ProfileGender = (typeof PROFILE_GENDERS)[number];

/** A database DATE is represented on the API as an ISO calendar date, without a time zone. */
export function isIsoCalendarDate(value: unknown): value is string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const timestamp = Date.parse(`${value}T00:00:00.000Z`);
  return Number.isFinite(timestamp) && new Date(timestamp).toISOString().slice(0, 10) === value;
}

export function isProfileGender(value: unknown): value is ProfileGender {
  return typeof value === "string" && PROFILE_GENDERS.includes(value as ProfileGender);
}

export function currentVietnamDate(now: Date = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Ho_Chi_Minh",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const part = (type: Intl.DateTimeFormatPartTypes) => parts.find(item => item.type === type)?.value;
  const year = part("year");
  const month = part("month");
  const day = part("day");
  if (!year || !month || !day) throw new Error("Could not determine Vietnam calendar date");
  return `${year}-${month}-${day}`;
}

export function isBirthDateAllowed(value: unknown, now: Date = new Date()): value is string {
  return isIsoCalendarDate(value) && value >= "1000-01-01" && value <= currentVietnamDate(now);
}
