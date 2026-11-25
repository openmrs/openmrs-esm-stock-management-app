import React from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { type FetchResponse, openmrsFetch } from '@openmrs/esm-framework';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FormProvider, useForm } from 'react-hook-form';
import { SWRConfig } from 'swr';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { openingStockOperationTypeMock } from '@mocks';
import { formatForDatePicker } from '../../../constants';
import { OperationType, type StockOperationType } from '../../../core/api/types/stockOperation/StockOperationType';
import { parseStockExpiryDate } from '../../expiry-date.utils';
import { getStockOperationFormSchema, type StockOperationItemDtoSchema } from '../../validation-schema';
import StockOperationSubmissionFormStep from './stock-operation-submission-form-step.component';

const mockOpenmrsFetch = vi.mocked(openmrsFetch);

function getTimeZoneDateTimeParts(epochMs: number, timeZone: string) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(new Date(epochMs));

  const values = Object.fromEntries(parts.map((part) => [part.type, Number(part.value)]));
  return {
    year: values.year,
    month: values.month,
    day: values.day,
    hour: values.hour,
    minute: values.minute,
    second: values.second,
  };
}

function getStartOfDayInstantInTimeZone(year: number, month: number, day: number, timeZone: string): number {
  const targetUtc = Date.UTC(year, month - 1, day, 0, 0, 0, 0);
  let guess = targetUtc;
  for (let i = 0; i < 2; i++) {
    const p = getTimeZoneDateTimeParts(guess, timeZone);
    const observedUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second, 0);
    guess -= observedUtc - targetUtc;
  }
  return guess;
}

function formatOffset(offsetMinutes: number): string {
  const sign = offsetMinutes >= 0 ? '+' : '-';
  const abs = Math.abs(offsetMinutes);
  const hours = String(Math.floor(abs / 60)).padStart(2, '0');
  const mins = String(abs % 60).padStart(2, '0');
  return `${sign}${hours}${mins}`;
}

/**
 * Mirrors OpenMRS webservices.rest ConversionUtil.parseDate -> Hibernate/JDBC SQL DATE
 * column storage -> ConversionUtil SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSSZ") output.
 */
function simulateOpenmrsDateColumnRoundTrip(wireValue: string, backendTimeZone: string) {
  let parsedInstantMs: number;
  const dateOnlyMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(wireValue);
  if (dateOnlyMatch) {
    const [, year, month, day] = dateOnlyMatch;
    parsedInstantMs = getStartOfDayInstantInTimeZone(Number(year), Number(month), Number(day), backendTimeZone);
  } else {
    parsedInstantMs = Date.parse(wireValue);
  }

  const stored = getTimeZoneDateTimeParts(parsedInstantMs, backendTimeZone);
  const storedDate = `${String(stored.year).padStart(4, '0')}-${String(stored.month).padStart(2, '0')}-${String(
    stored.day,
  ).padStart(2, '0')}`;

  const responseInstantMs = getStartOfDayInstantInTimeZone(stored.year, stored.month, stored.day, backendTimeZone);
  const responseWallClockUtc = Date.UTC(stored.year, stored.month - 1, stored.day, 0, 0, 0, 0);
  const offsetMinutes = Math.round((responseWallClockUtc - responseInstantMs) / 60000);
  const responseString = `${storedDate}T00:00:00.000${formatOffset(offsetMinutes)}`;

  return { storedDate, responseString };
}

const SubmissionHarness: React.FC<{ expiration: Date }> = ({ expiration }) => {
  const schema = getStockOperationFormSchema(OperationType.OPENING_STOCK_OPERATION_TYPE);
  const form = useForm<StockOperationItemDtoSchema>({
    defaultValues: {
      operationDate: new Date(2026, 10, 25),
      sourceUuid: 'source-party-uuid',
      responsiblePersonUuid: 'responsible-person-uuid',
      operationTypeUuid: openingStockOperationTypeMock.uuid,
      stockOperationItems: [
        {
          uuid: 'new-item-1',
          stockItemUuid: 'stock-item-uuid',
          stockItemPackagingUOMUuid: 'uom-uuid',
          batchNo: 'BATCH-001',
          expiration,
          quantity: 10,
          hasExpiration: true,
        },
      ],
    },
    resolver: zodResolver(schema),
  });

  return (
    <SWRConfig value={{ provider: () => new Map() }}>
      <FormProvider {...form}>
        <StockOperationSubmissionFormStep
          stockOperationType={openingStockOperationTypeMock as unknown as StockOperationType}
        />
      </FormProvider>
    </SWRConfig>
  );
};

const browserTimeZones = ['UTC', 'Asia/Karachi', 'America/New_York', 'America/Los_Angeles', 'Pacific/Auckland'];

describe.each(browserTimeZones)(
  'StockOperationSubmissionFormStep expiry date persistence round trip in %s',
  (browserTimeZone) => {
    const originalTimeZone = process.env.TZ;

    beforeEach(() => {
      process.env.TZ = browserTimeZone;
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
    ])(
      'sends date-only YYYY-MM-DD on save and preserves %i-%i-%i across backend timezones',
      async (year, month, day) => {
        const user = userEvent.setup();
        let capturedWireJson = '';

        mockOpenmrsFetch.mockImplementation(async (_url, init) => {
          capturedWireJson = JSON.stringify(init?.body);
          return { data: { uuid: 'saved-operation-uuid' } } as FetchResponse;
        });

        const selectedDate = new Date(year, month - 1, day);
        render(<SubmissionHarness expiration={selectedDate} />);

        await user.click(screen.getByRole('button', { name: /save/i }));

        await waitFor(() => {
          expect(mockOpenmrsFetch).toHaveBeenCalledTimes(1);
        });

        const wirePayload = JSON.parse(capturedWireJson);
        const expectedDate = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        const expectedPickerDisplay = `${String(day).padStart(2, '0')}/${String(month).padStart(2, '0')}/${year}`;
        const wireExpiration = wirePayload.stockOperationItems[0].expiration;

        expect(wireExpiration).toBe(expectedDate);

        for (const backendTimeZone of [
          'America/New_York',
          'America/Los_Angeles',
          'UTC',
          'Asia/Karachi',
          'Pacific/Auckland',
        ]) {
          const { storedDate, responseString } = simulateOpenmrsDateColumnRoundTrip(wireExpiration, backendTimeZone);
          expect(storedDate).toBe(expectedDate);

          const restored = parseStockExpiryDate(responseString);
          expect([restored.getFullYear(), restored.getMonth() + 1, restored.getDate()]).toEqual([year, month, day]);
          expect(formatForDatePicker(restored)).toBe(expectedPickerDisplay);
        }
      },
    );
  },
);
