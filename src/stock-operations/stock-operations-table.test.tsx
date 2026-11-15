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

vi.mock('./stock-operations-filters.component', () => ({
  default: vi.fn(() => null),
}));

vi.mock('./stock-operation-types-selector/stock-operation-types-selector.component', () => ({
  default: () => null,
}));

vi.mock('./edit-stock-operation/edit-stock-operation-action-menu.component', () => ({
  default: () => null,
}));

vi.mock('./add-stock-operation/stock-operations-expanded-row/stock-operation-expanded-row.component', () => ({
  default: ({ model }) => <p>Every item of {model.operationNumber}</p>,
}));

vi.mock('./stock-operations-table.resource', () => ({
  useStockOperationPages: vi.fn(() => ({
    items: [],
    tableHeaders: [],
    currentPage: 1,
    pageSizes: [10],
    totalItems: 0,
    goTo: vi.fn(),
    currentPageSize: 10,
    setPageSize: vi.fn(),
    isLoading: false,
  })),
}));

describe('StockOperations', () => {
  beforeEach(() => {
    mockUseConfig.mockReturnValue({ stockSourceTypeUUID: 'stock-source-type-uuid' });
  });

  it('passes the stock source type concept to the Sources filter', () => {
    render(<StockOperations />);

    const sourcesFilterProps = mockStockOperationsFilters.mock.calls
      .map(([props]) => props)
      .find((props) => props.filterName === StockFilters.SOURCES);

    expect(sourcesFilterProps?.conceptUuid).toBe('stock-source-type-uuid');
  });

  it('lets the keyboard expand a row from its "more" items control', async () => {
    const user = userEvent.setup();
    vi.mocked(useStockOperationPages).mockReturnValue({
      ...vi.mocked(useStockOperationPages)({}),
      items: [
        {
          uuid: 'op-uuid',
          operationNumber: 'SIS-0007',
          stockOperationItems: [{ commonName: 'Paracetamol' }, { commonName: 'Amoxicillin' }],
        },
      ],
      tableHeaders: [
        { key: 'operationNumber', header: 'Number' },
        { key: 'stockOperationItems', header: 'Items' },
      ],
    } as never);
    render(<StockOperations />);

    const more = screen.getByRole('button', { name: '...(1 more)' });
    expect(more).toHaveAttribute('aria-expanded', 'false');

    more.focus();
    await user.keyboard('{Enter}');

    expect(screen.getByText('Every item of SIS-0007')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '...(1 more)' })).toHaveAttribute('aria-expanded', 'true');
  });
});
