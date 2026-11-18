/**
 * Stock batch expiration is a calendar date, not a moment in time.
 * The REST API supplies ISO-formatted strings, while Carbon DatePicker uses
 * a Date at local midnight. Never interpret the date-only value in the
 * user's time zone when reading, or serialize local midnight when writing.
 */
export function parseStockExpiryDate(value: string | Date): Date {
  if (value instanceof Date) return value;

  const match = /^(\d{4})-(\d{2})-(\d{2})(?:T|$)/.exec(value);
  if (match) {
    const [, year, month, day] = match;
    return new Date(Number(year), Number(month) - 1, Number(day));
  }
  return new Date(value);
}

/** Serialize a selected local calendar day as UTC midnight for the REST API. */
export function stockExpiryDateForApi(value: Date): Date {
  return new Date(Date.UTC(value.getFullYear(), value.getMonth(), value.getDate()));
}
