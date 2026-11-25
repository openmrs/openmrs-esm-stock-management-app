import { parseDate } from '@openmrs/esm-framework';
import dayjs from 'dayjs';

/**
 * Stock batch expiration is a calendar date, not a moment in time.
 * The REST API supplies ISO-formatted strings, while Carbon DatePicker uses
 * a Date at local midnight. Never interpret the date-only value in the
 * user's time zone when reading, or serialize a UTC instant when writing.
 */
export function parseStockExpiryDate(value: string | Date): Date {
  if (value instanceof Date) return value;

  const match = /^(\d{4}-\d{2}-\d{2})(?:T|$)/.exec(value);
  return parseDate(match ? match[1] : value);
}

/** Format a selected local calendar day as date-only YYYY-MM-DD for the REST API. */
export function stockExpiryDateForApi(value: Date): string {
  return dayjs(value).format('YYYY-MM-DD');
}
