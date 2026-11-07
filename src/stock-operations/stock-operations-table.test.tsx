import React from 'react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { render } from '@testing-library/react';
import { useConfig } from '@openmrs/esm-framework';
import { StockFilters } from '../constants';
import StockOperationsFilters from './stock-operations-filters.component';
import StockOperations from './stock-operations-table.component';

const mockUseConfig = vi.mocked(useConfig);
const mockStockOperationsFilters = vi.mocked(StockOperationsFilters);

vi.mock('./stock-operations-filters.component', () => ({
  default: vi.fn(() => null),
}));

vi.mock('./stock-operation-types-selector/stock-operation-types-selector.component', () => ({
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
});
