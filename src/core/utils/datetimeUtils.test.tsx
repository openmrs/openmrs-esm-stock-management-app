import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render } from '@testing-library/react';
import { DatePicker, DatePickerInput } from '@carbon/react';
import { type Session, useSession } from '@openmrs/esm-framework';
import { getDatePickerLocale } from './datetimeUtils';

function TestDatePicker() {
  const session = useSession();
  return (
    <DatePicker datePickerType="single" locale={getDatePickerLocale(session?.locale)}>
      <DatePickerInput id="test-date" labelText="Date" />
    </DatePicker>
  );
}

describe('getDatePickerLocale', () => {
  it.each([
    ['en', 'en'],
    ['pt_BR', 'pt'],
    ['en-GB', 'en'],
    ['fr_FR', 'fr'],
    ['es-419', 'es'],
    ['vi', 'vn'],
  ])('converts %s to base language code %s', (locale, expected) => {
    expect(getDatePickerLocale(locale)).toBe(expected);
  });

  it('returns undefined for missing locale', () => {
    expect(getDatePickerLocale(null)).toBeUndefined();
    expect(getDatePickerLocale(undefined)).toBeUndefined();
  });

  it('renders a date picker with Portuguese month when session locale is pt_BR', () => {
    vi.mocked(useSession).mockReturnValue({
      locale: 'pt_BR',
    } as Session);

    render(<TestDatePicker />);

    // eslint-disable-next-line testing-library/no-node-access
    const monthElement = document.querySelector('.cur-month');
    const expectedMonth = new Intl.DateTimeFormat('pt', { month: 'long' }).format(new Date());

    expect(monthElement?.textContent?.toLowerCase()).toBe(expectedMonth.toLowerCase());
  });
});
