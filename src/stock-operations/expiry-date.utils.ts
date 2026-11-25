/**
 * Stock batch expiration is a calendar date, not a moment in time.
 * The REST API supplies ISO-formatted strings, while Carbon DatePicker uses
 * a Date at local midnight. Never interpret the date-only value in the
 * user's time zone when reading, or serialize a UTC instant when writing.
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

/** Format a selected local calendar day as date-only YYYY-MM-DD for the REST API. */
export function stockExpiryDateForApi(value: Date): string {
  const year = String(value.getFullYear()).padStart(4, '0');
  const month = String(value.getMonth() + 1).padStart(2, '0');
  const day = String(value.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}
