import React from 'react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useConfig } from '@openmrs/esm-framework';
import { StockFilters } from '../constants';
import StockOperationsFilters from './stock-operations-filters.component';
import StockOperations from './stock-operations-table.component';
import { useStockOperationPages } from './stock-operations-table.resource';

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
  default: () => null,
}));

vi.mock('./add-stock-operation/stock-operations-expanded-row/stock-operation-expanded-row.component', () => ({
  default: () => null,
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

  describe('status column', () => {
    const operation = (uuid: string, status: string) => ({
      uuid,
      status,
      operationTypeName: 'Receipt',
      stockOperationItems: [],
    });

    beforeEach(() => {
      mockUseStockOperationPages.mockReturnValue({
        items: [operation('op-1', 'SUBMITTED'), operation('op-2', 'CANCELLED')],
        tableHeaders: [{ key: 'status', header: 'Status' }],
        currentPage: 1,
        pageSizes: [10],
        totalItems: 2,
        goTo: vi.fn(),
        currentPageSize: 10,
        setPageSize: vi.fn(),
        isLoading: false,
      } as unknown as ReturnType<typeof useStockOperationPages>);
    });

    it('shows each status as a translated, sentence case Tag', () => {
      render(<StockOperations />);

      expect(screen.getByText('Submitted')).toHaveClass('cds--tag__label');
      expect(screen.getByText('Cancelled')).toHaveClass('cds--tag__label');
      expect(screen.queryByText('SUBMITTED')).not.toBeInTheDocument();
      expect(screen.queryByText('CANCELLED')).not.toBeInTheDocument();
    });

    it('can still be sorted by status', async () => {
      const user = userEvent.setup();
      render(<StockOperations />);

      const statusesInOrder = () =>
        screen
          .getAllByRole('row')
          .slice(1)
          .map((row) => within(row).queryByText(/^(Submitted|Cancelled)$/)?.textContent)
          .filter(Boolean);

      expect(statusesInOrder()).toEqual(['Submitted', 'Cancelled']);

      await user.click(screen.getByRole('button', { name: /status/i }));
      expect(statusesInOrder()).toEqual(['Cancelled', 'Submitted']);

      await user.click(screen.getByRole('button', { name: /status/i }));
      expect(statusesInOrder()).toEqual(['Submitted', 'Cancelled']);
    });
  });
});
