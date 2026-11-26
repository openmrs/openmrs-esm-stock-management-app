import React from 'react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { OpenmrsDatePicker, useConfig } from '@openmrs/esm-framework';
import { StockFilters } from '../constants';
import StockOperationsFilters from './stock-operations-filters.component';
import { useStockOperationPages } from './stock-operations-table.resource';
import StockOperations from './stock-operations-table.component';

const mockUseConfig = vi.mocked(useConfig);
const mockStockOperationsFilters = vi.mocked(StockOperationsFilters);
const mockUseStockOperationPages = vi.mocked(useStockOperationPages);
const mockOpenmrsDatePicker = vi.mocked(OpenmrsDatePicker);

vi.mock('./stock-operations-filters.component', () => ({
  default: vi.fn(() => null),
}));

vi.mock('./stock-operation-types-selector/stock-operation-types-selector.component', () => ({
  default: () => null,
}));

vi.mock('./edit-stock-operation/edit-stock-operation-action-menu.component', () => ({
  default: ({ stockOperation }) => <span>{stockOperation.operationNumber}</span>,
}));

vi.mock('./add-stock-operation/stock-operations-expanded-row/stock-operation-expanded-row.component', () => ({
  default: ({ model }) => <div data-testid="panel">{model.operationNumber}</div>,
}));

vi.mock('./stock-operations-table.resource', () => ({
  useStockOperationPages: vi.fn(),
}));

const operations = [
  { uuid: 'uuid-49', operationNumber: 'RCPT-0049', status: 'SUBMITTED', stockOperationItems: [] },
  { uuid: 'uuid-44', operationNumber: 'RCPT-0044', status: 'CANCELLED', stockOperationItems: [] },
];

const tableHeaders = [
  { id: 0, key: 'operationNumber', header: 'Number' },
  { id: 1, key: 'status', header: 'Status' },
];

function mockPages(overrides: Record<string, unknown> = {}) {
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
    ...overrides,
  } as any);
}

describe('StockOperations', () => {
  beforeEach(() => {
    mockUseConfig.mockReturnValue({ stockSourceTypeUUID: 'stock-source-type-uuid' });
    mockPages();
  });

  it('passes the stock source type concept to the Sources filter', () => {
    render(<StockOperations />);

    const sourcesFilterProps = mockStockOperationsFilters.mock.calls
      .map(([props]) => props)
      .find((props) => props.filterName === StockFilters.SOURCES);

    expect(sourcesFilterProps?.conceptUuid).toBe('stock-source-type-uuid');
  });

  it('shows the operation of the expanded row after sorting by status', async () => {
    mockPages({ items: operations, tableHeaders, totalItems: 2 });
    const user = userEvent.setup();
    render(<StockOperations />);

    // Ascending sort puts CANCELLED (RCPT-0044) above SUBMITTED (RCPT-0049)
    await user.click(screen.getByRole('button', { name: /status/i }));
    await user.click(screen.getAllByRole('button', { name: /expand current row/i })[0]);

    expect(screen.getByTestId('panel')).toHaveTextContent('RCPT-0044');
  });

  it('keeps the table on screen while the next page loads', () => {
    mockPages({ items: operations, tableHeaders, totalItems: 2, isLoading: true });

    render(<StockOperations />);

    expect(screen.getByRole('searchbox')).toBeInTheDocument();
    expect(screen.getByText('RCPT-0049')).toBeInTheDocument();
  });

  it('shows only the skeleton when loading with nothing to display', () => {
    mockPages({ isLoading: true });

    render(<StockOperations />);

    expect(screen.queryByRole('searchbox')).not.toBeInTheDocument();
  });

  it('shows an error and hides the previous rows when the request fails', () => {
    mockPages({ items: operations, tableHeaders, totalItems: 2, error: new Error('Server unavailable') });

    render(<StockOperations />);

    expect(screen.getByText('Server unavailable')).toBeInTheDocument();
    expect(screen.queryByText('RCPT-0049')).not.toBeInTheDocument();
  });

  describe('date filter', () => {
    const lastQuery = () => mockUseStockOperationPages.mock.lastCall[0];
    const datePicker = (label: string) =>
      mockOpenmrsDatePicker.mock.calls.filter(([props]) => props.labelText === label).at(-1)[0];
    const pickDate = (label: string, date: Date | undefined) => act(() => datePicker(label).onChange(date));
    const waitForFilter = () => act(() => vi.advanceTimersByTime(500));
    // new Date() maps the years 0 to 99 to 1900 to 1999, but the picker reports the year as typed
    const dateInYear = (year: number, month: number, day: number) => {
      const date = new Date(2026, month, day);
      date.setFullYear(year);
      return date;
    };

    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('filters operations by the dates picked', () => {
      render(<StockOperations />);

      pickDate('Start date', new Date(2026, 10, 1));
      pickDate('End date', new Date(2026, 10, 23));
      waitForFilter();

      expect(lastQuery()).toEqual(
        expect.objectContaining({
          operationDateMin: '2026-11-01T00:00:00.000Z',
          operationDateMax: '2026-11-23T00:00:00.000Z',
        }),
      );
    });

    it('filters by a start date or an end date alone', () => {
      render(<StockOperations />);

      pickDate('Start date', new Date(2026, 10, 1));
      waitForFilter();
      expect(lastQuery()).toEqual(
        expect.objectContaining({ operationDateMin: '2026-11-01T00:00:00.000Z', operationDateMax: undefined }),
      );

      pickDate('Start date', undefined);
      pickDate('End date', new Date(2026, 10, 23));
      waitForFilter();
      expect(lastQuery()).toEqual(
        expect.objectContaining({ operationDateMin: undefined, operationDateMax: '2026-11-23T00:00:00.000Z' }),
      );
    });

    it('waits for the typing to stop before filtering', () => {
      render(<StockOperations />);

      // Changing the day from 23 to 25 reports day 2 first
      pickDate('Start date', new Date(2026, 10, 2));
      pickDate('Start date', new Date(2026, 10, 25));
      expect(lastQuery().operationDateMin).toBeUndefined();

      waitForFilter();

      const requestedStartDates = mockUseStockOperationPages.mock.calls.map(([query]) => query.operationDateMin);
      expect(requestedStartDates.filter(Boolean)).toEqual(['2026-11-25T00:00:00.000Z']);
    });

    it('keeps the last valid filter while a year is deleted digit by digit', () => {
      render(<StockOperations />);

      pickDate('Start date', new Date(2026, 10, 1));
      waitForFilter();

      // The picker reports the years 202, 20 and 2, then nothing once the year is empty
      for (const year of [202, 20, 2]) {
        pickDate('Start date', dateInYear(year, 10, 1));
      }
      waitForFilter();

      expect(datePicker('Start date').value).toEqual(dateInYear(2, 10, 1));
      expect(lastQuery().operationDateMin).toBe('2026-11-01T00:00:00.000Z');
    });

    it('keeps the last valid filter while the end date is before the start date', () => {
      render(<StockOperations />);

      pickDate('Start date', new Date(2026, 10, 10));
      pickDate('End date', new Date(2026, 10, 23));
      waitForFilter();

      pickDate('End date', new Date(2026, 10, 5));
      waitForFilter();

      expect(lastQuery().operationDateMax).toBe('2026-11-23T00:00:00.000Z');
    });

    it('drops a pending date when the typing ends on an invalid date', () => {
      render(<StockOperations />);

      pickDate('Start date', new Date(2026, 10, 1));
      pickDate('End date', new Date(2026, 10, 23));
      waitForFilter();

      // Retyping the end date as 25/11/2025 reports 25 Nov 2026 before the year is changed
      pickDate('End date', new Date(2026, 10, 25));
      for (const year of [2, 20, 202, 2025]) {
        pickDate('End date', dateInYear(year, 10, 25));
      }
      waitForFilter();

      expect(lastQuery().operationDateMax).toBe('2026-11-23T00:00:00.000Z');
    });

    it('limits each picker to the other date', () => {
      render(<StockOperations />);

      pickDate('Start date', new Date(2026, 10, 1));
      pickDate('End date', new Date(2026, 10, 23));

      expect(datePicker('Start date').maxDate).toEqual(new Date(2026, 10, 23));
      expect(datePicker('End date').minDate).toEqual(new Date(2026, 10, 1));

      pickDate('End date', dateInYear(20, 10, 23));

      expect(datePicker('Start date').maxDate).toBeUndefined();
    });

    it('removes the date filter when a date is cleared', () => {
      render(<StockOperations />);

      pickDate('Start date', new Date(2026, 10, 1));
      waitForFilter();
      expect(lastQuery().operationDateMin).toBeDefined();

      pickDate('Start date', undefined);
      waitForFilter();

      expect(lastQuery().operationDateMin).toBeUndefined();
      expect(datePicker('Start date').value).toBeNull();
    });
  });
});
