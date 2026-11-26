import React from 'react';
import type { i18n } from 'i18next';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { OpenmrsDatePicker, useConfig } from '@openmrs/esm-framework';
import { OpenmrsDatePicker as RealDatePicker } from '@openmrs/esm-styleguide';
import type * as ReactUtils from '@openmrs/esm-react-utils';
import StockOperations from './stock-operations-table.component';
import { useStockOperationPages } from './stock-operations-table.resource';

vi.mock('@openmrs/esm-react-utils', async (importOriginal) => ({
  ...(await importOriginal<typeof ReactUtils>()),
  useConfig: () => ({ preferredDateLocale: { en: 'en-GB' } }),
}));
vi.mock('@openmrs/esm-translations', () => import('@openmrs/esm-translations/mock'));
vi.mock('./stock-operations-filters.component', () => ({ default: () => null }));
vi.mock('./stock-operation-types-selector/stock-operation-types-selector.component', () => ({ default: () => null }));
vi.mock('./edit-stock-operation/edit-stock-operation-action-menu.component', () => ({ default: () => null }));
vi.mock('./add-stock-operation/stock-operations-expanded-row/stock-operation-expanded-row.component', () => ({
  default: () => null,
}));
vi.mock('./stock-operations-table.resource', () => ({ useStockOperationPages: vi.fn() }));

const mockUseStockOperationPages = vi.mocked(useStockOperationPages);
const lastQuery = () => mockUseStockOperationPages.mock.lastCall[0];
const segment = (part: string, label: string) => screen.getByRole('spinbutton', { name: `${part}, ${label}` });
const typeSegment = (part: string, label: string, value: string) => {
  for (const digit of value) {
    fireEvent(
      segment(part, label),
      new InputEvent('beforeinput', { inputType: 'insertText', data: digit, bubbles: true }),
    );
  }
};
const typeDate = (label: string, day: string) => {
  typeSegment('day', label, day);
  typeSegment('month', label, '11');
  typeSegment('year', label, '2026');
};
const clearSegment = (part: string, label: string, digits: number) => {
  for (let i = 0; i < digits; i++) {
    fireEvent.keyDown(segment(part, label), { key: 'Backspace' });
  }
};
const waitForFilter = async () => {
  // Flush the segment MutationObserver before advancing the debounce timer.
  await act(async () => {
    await Promise.resolve();
    await vi.advanceTimersByTimeAsync(500);
  });
};

describe('stock operations date filter with the real OpenmrsDatePicker', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    window.i18next = { language: 'en' } as i18n;
    window.getOpenmrsSpaBase = () => '/openmrs/spa/';
    vi.mocked(useConfig).mockReturnValue({
      stockSourceTypeUUID: 'stock-source-type-uuid',
      preferredDateLocale: { en: 'en-GB' },
    });
    vi.mocked(OpenmrsDatePicker).mockImplementation((props) => <RealDatePicker {...props} />);
    mockUseStockOperationPages.mockReturnValue({
      items: [],
      tableHeaders: [],
      currentPage: 1,
      pageSizes: [10],
      totalItems: 0,
      goTo: vi.fn(),
      currentPageSize: 10,
      setPageSize: vi.fn(),
      isLoading: false,
      error: undefined,
    });
  });

  afterEach(() => {
    vi.mocked(OpenmrsDatePicker).mockReset();
    vi.useRealTimers();
  });

  it.each(['Start date', 'End date'])(
    'keeps the applied range when double-backspace clears the %s day',
    async (label) => {
      render(<StockOperations />);
      typeDate('Start date', '01');
      typeDate('End date', '23');
      await waitForFilter();
      const appliedRange = { ...lastQuery() };
      // Start from a two-digit day whose intermediate value is also a valid range.
      if (label === 'Start date') {
        typeSegment('day', label, '23');
        await waitForFilter();
        appliedRange.operationDateMin = lastQuery().operationDateMin;
      }
      mockUseStockOperationPages.mockClear();

      clearSegment('day', label, 2);
      await waitForFilter();

      expect(segment('day', label)).toHaveTextContent('dd');
      expect(segment('month', label)).toHaveTextContent('11');
      expect(segment('year', label)).toHaveTextContent('2026');
      for (const [query] of mockUseStockOperationPages.mock.calls) {
        expect(query).toEqual(appliedRange);
      }
      expect(lastQuery()).toEqual(appliedRange);

      // React Aria does not emit onChange when the same last complete date is restored.
      typeSegment('day', label, '2');
      await waitForFilter();

      expect(lastQuery()[label === 'Start date' ? 'operationDateMin' : 'operationDateMax']).toBe(
        '2026-11-02T00:00:00.000Z',
      );
    },
  );

  it('removes only the end bound when all its segments are cleared', async () => {
    render(<StockOperations />);
    typeDate('Start date', '01');
    typeDate('End date', '23');
    await waitForFilter();

    clearSegment('day', 'End date', 2);
    clearSegment('month', 'End date', 2);
    clearSegment('year', 'End date', 4);
    await waitForFilter();

    expect(lastQuery()).toEqual(
      expect.objectContaining({
        operationDateMin: '2026-11-01T00:00:00.000Z',
        operationDateMax: undefined,
      }),
    );
  });
});
