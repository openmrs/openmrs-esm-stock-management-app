import React from 'react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useConfig } from '@openmrs/esm-framework';
import { StockFilters } from '../constants';
import StockOperationsFilters from './stock-operations-filters.component';
import { useStockOperationPages } from './stock-operations-table.resource';
import StockOperations from './stock-operations-table.component';

const mockUseConfig = vi.mocked(useConfig);
const mockStockOperationsFilters = vi.mocked(StockOperationsFilters);
const mockUseStockOperationPages = vi.mocked(useStockOperationPages);

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

// Each column puts these three operations in a different order, and none of those is the order they arrive in
const operationsToSort = [
  {
    uuid: 'uuid-disposal',
    operationNumber: 'DIS-0003',
    operationTypeName: 'Disposal',
    status: 'NEW',
    sourceName: 'Dispensary',
    destinationName: null,
    operationDate: '2026-11-19T08:00:00.000+0000',
    stockOperationItems: [{ commonName: 'Amoxicillin' }],
  },
  {
    uuid: 'uuid-adjustment',
    operationNumber: 'ADJ-0001',
    operationTypeName: 'Adjustment',
    status: 'NEW',
    sourceName: 'Bulk Store',
    destinationName: 'Ward 1',
    operationDate: '2026-12-02T08:00:00.000+0000',
    stockOperationItems: [{ commonName: 'Paracetamol' }, { commonName: 'Zinc' }],
  },
  {
    uuid: 'uuid-receipt',
    operationNumber: 'RCPT-0002',
    operationTypeName: 'Receipt',
    status: 'NEW',
    sourceName: 'Central Store',
    destinationName: 'Pharmacy',
    operationDate: '2026-10-30T08:00:00.000+0000',
    stockOperationItems: [{ commonName: 'Ibuprofen' }],
  },
];

const allTableHeaders = [
  { id: 0, key: 'operationTypeName', header: 'Type' },
  { id: 1, key: 'operationNumber', header: 'Number' },
  { id: 2, key: 'stockOperationItems', header: 'Items' },
  { id: 3, key: 'status', header: 'Status' },
  { id: 4, key: 'location', header: 'Location' },
  { id: 5, key: 'operationDate', header: 'Date' },
  { key: 'actions', header: '', isSortable: false },
];

function operationNumbersInRowOrder() {
  return screen
    .getAllByRole('row')
    .map((row) => row.textContent?.match(/[A-Z]+-\d{4}/)?.[0])
    .filter(Boolean);
}

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

  it.each([
    ['Number', ['ADJ-0001', 'DIS-0003', 'RCPT-0002']],
    ['Items', ['DIS-0003', 'RCPT-0002', 'ADJ-0001']],
    ['Location', ['ADJ-0001', 'RCPT-0002', 'DIS-0003']],
    ['Date', ['RCPT-0002', 'DIS-0003', 'ADJ-0001']],
  ])('sorts the rows by %s, ascending on the first click and descending on the second', async (column, ascending) => {
    mockPages({ items: operationsToSort, tableHeaders: allTableHeaders, totalItems: 3 });
    const user = userEvent.setup();
    render(<StockOperations />);
    const sortButton = screen.getByRole('button', { name: column });

    expect(operationNumbersInRowOrder()).toEqual(['DIS-0003', 'ADJ-0001', 'RCPT-0002']);

    await user.click(sortButton);
    expect(operationNumbersInRowOrder()).toEqual(ascending);

    await user.click(sortButton);
    expect(operationNumbersInRowOrder()).toEqual([...ascending].reverse());
  });

  it('shows the number, items, location and date of each operation', () => {
    mockPages({ items: operationsToSort, tableHeaders: allTableHeaders, totalItems: 3 });

    render(<StockOperations />);

    const adjustmentRow = screen.getByRole('row', { name: /ADJ-0001/ });
    expect(within(adjustmentRow).getByText('Paracetamol')).toBeInTheDocument();
    expect(within(adjustmentRow).getByText('...(1 more)')).toBeInTheDocument();
    expect(within(adjustmentRow).getByText(/Bulk Store\s+Ward 1/)).toBeInTheDocument();
    expect(within(adjustmentRow).getByText('02-Dec-2026')).toBeInTheDocument();

    const disposalRow = screen.getByRole('row', { name: /DIS-0003/ });
    expect(within(disposalRow).getByText('Amoxicillin')).toBeInTheDocument();
    expect(within(disposalRow).queryByText(/more\)/)).not.toBeInTheDocument();
    expect(within(disposalRow).getByText(/Dispensary/)).toBeInTheDocument();
  });
});
