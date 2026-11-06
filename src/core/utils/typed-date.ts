import type React from 'react';

const TYPED_DATE_PATTERN = /^(\d{2})\/(\d{2})\/(\d{4})$/;

export interface TypedDateLimits {
  minDate?: Date;
  maxDate?: Date;
}

const startOfDay = (date: Date) => new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();

/**
 * Parses a date typed as DD/MM/YYYY.
 *
 * @returns `null` while the text isn't a complete date yet, an invalid `Date` if it's a date that
 * doesn't exist or is outside the limits, and otherwise the date.
 */
export const parseTypedDate = (text: string, { minDate, maxDate }: TypedDateLimits = {}): Date | null => {
  const match = TYPED_DATE_PATTERN.exec(text.trim());
  if (!match) {
    return null;
  }

  const [day, month, year] = match.slice(1).map(Number);
  const date = new Date(year, month - 1, day);
  const exists = date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day;
  const withinLimits =
    (!minDate || startOfDay(date) >= startOfDay(minDate)) && (!maxDate || startOfDay(date) <= startOfDay(maxDate));

  return exists && withinLimits ? date : new Date(NaN);
};

export const isInvalidDate = (date: unknown) => date instanceof Date && isNaN(date.getTime());

/**
 * Creates an input `onChange` that reports a date as soon as it has been typed in full. Without this the
 * date picker only commits a typed date when it loses focus, so closing the calendar with Escape drops it.
 */
export const commitTypedDate =
  (onDateChange: (date: Date) => void, limits?: TypedDateLimits) => (event: React.ChangeEvent<HTMLInputElement>) => {
    const date = parseTypedDate(event.target.value, limits);
    if (date) {
      onDateChange(date);
    }
  };
