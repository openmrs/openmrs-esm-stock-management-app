import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { parseStockExpiryDate, stockExpiryDateForApi } from './expiry-date.utils';

const timeZones = ['UTC', 'Asia/Karachi', 'America/New_York', 'America/Los_Angeles', 'Pacific/Auckland'];

describe.each(timeZones)('stock batch expiry calendar dates in %s', (timeZone) => {
  const originalTimeZone = process.env.TZ;

  beforeEach(() => {
    process.env.TZ = timeZone;
  });

  afterEach(() => {
    if (originalTimeZone === undefined) {
      delete process.env.TZ;
    } else {
      process.env.TZ = originalTimeZone;
    }
  });

  it.each([
    [2027, 12, 31],
    [2028, 2, 29],
    [2028, 3, 1],
    [2027, 1, 1],
  ])('preserves %i-%i-%i as date-only YYYY-MM-DD through the API boundary', (year, month, day) => {
    const selected = new Date(year, month - 1, day);
    const outgoing = stockExpiryDateForApi(selected);
    const expected = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    expect(outgoing).toBe(expected);
    const redisplayed = parseStockExpiryDate(outgoing);
    expect([redisplayed.getFullYear(), redisplayed.getMonth() + 1, redisplayed.getDate()]).toEqual([year, month, day]);
  });

  it.each([
    '2027-12-31T00:00:00.000-0500',
    '2027-12-31T00:00:00.000+0000',
    '2027-12-31T00:00:00.000+0500',
    '2027-12-31T00:00:00.000+1300',
  ])('uses the calendar portion of OpenMRS date-only response %s', (responseValue) => {
    const restored = parseStockExpiryDate(responseValue);
    expect([restored.getFullYear(), restored.getMonth() + 1, restored.getDate()]).toEqual([2027, 12, 31]);
  });

  it('does not mutate a selected Date', () => {
    const selected = new Date(2027, 11, 31);
    const before = selected.getTime();
    stockExpiryDateForApi(selected);
    expect(selected.getTime()).toBe(before);
  });
});
