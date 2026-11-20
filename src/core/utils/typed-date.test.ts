import { describe, expect, it, vi } from 'vitest';
import { commitTypedDate, isInvalidDate, parseTypedDate } from './typed-date';

describe('parseTypedDate', () => {
  it('parses a complete date', () => {
    expect(parseTypedDate('31/10/2026')).toEqual(new Date(2026, 9, 31));
  });

  it.each(['', '3', '31/10', '31/10/20', '2026-10-31', '1/1/2026'])(
    'returns null for the incomplete date "%s"',
    (text) => {
      expect(parseTypedDate(text)).toBeNull();
    },
  );

  it.each(['31/02/2026', '32/01/2026', '01/13/2026', '00/01/2026'])('returns an invalid date for "%s"', (text) => {
    expect(isInvalidDate(parseTypedDate(text))).toBe(true);
  });

  it('applies the limits by day, whatever the time of the limit', () => {
    const limits = { minDate: new Date(2026, 0, 10, 23, 59), maxDate: new Date(2026, 0, 20, 0, 0) };

    expect(parseTypedDate('10/01/2026', limits)).toEqual(new Date(2026, 0, 10));
    expect(parseTypedDate('20/01/2026', limits)).toEqual(new Date(2026, 0, 20));
    expect(isInvalidDate(parseTypedDate('09/01/2026', limits))).toBe(true);
    expect(isInvalidDate(parseTypedDate('21/01/2026', limits))).toBe(true);
  });
});

describe('commitTypedDate', () => {
  const change = (value: string) => ({ target: { value } } as React.ChangeEvent<HTMLInputElement>);

  it('reports a date only once it has been typed in full', () => {
    const onDateChange = vi.fn();
    const handler = commitTypedDate(onDateChange);

    handler(change('31/10'));
    expect(onDateChange).not.toHaveBeenCalled();

    handler(change('31/10/2026'));
    expect(onDateChange).toHaveBeenCalledWith(new Date(2026, 9, 31));
  });

  it('reports an invalid date when the typed date is outside the limits', () => {
    const onDateChange = vi.fn();

    commitTypedDate(onDateChange, { maxDate: new Date(2026, 0, 1) })(change('02/01/2026'));

    expect(isInvalidDate(onDateChange.mock.calls[0][0])).toBe(true);
  });
});
