import React from 'react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
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
});