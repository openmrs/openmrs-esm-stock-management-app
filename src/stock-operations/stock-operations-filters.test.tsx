import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useConfig } from '@openmrs/esm-framework';
import { StockFilters } from '../constants';
import { useConcept } from '../stock-lookups/stock-lookups.resource';
import StockOperationsFilters from './stock-operations-filters.component';
import { useStockOperationPages } from './stock-operations-table.resource';
import StockOperations from './stock-operations-table.component';

vi.mock('../stock-lookups/stock-lookups.resource', () => ({
  getStockOperationTypes: vi.fn(() => Promise.resolve({ data: { results: [] } })),
  useConcept: vi.fn(),
}));
vi.mock('./stock-operations-table.resource', () => ({ useStockOperationPages: vi.fn() }));
vi.mock('./stock-operation-types-selector/stock-operation-types-selector.component', () => ({ default: () => null }));
vi.mock('../utils', () => ({ useHandleMutate: vi.fn(() => vi.fn()) }));

const sourceTypeConceptUuid = 'source-type-concept-uuid';
const openSourcesFilter = (user: ReturnType<typeof userEvent.setup>) =>
  user.click(screen.getByText(StockFilters.SOURCES));

const answers = [
  { uuid: 'donation-uuid', display: 'Donation' },
  { uuid: 'commercial-uuid', display: 'Commercial/sales' },
];

describe('Operations Sources filter', () => {
  beforeEach(() => {
    vi.mocked(useConfig).mockReturnValue({ stockSourceTypeUUID: sourceTypeConceptUuid });
    vi.mocked(useConcept).mockImplementation(
      (uuid) => ({ items: uuid === sourceTypeConceptUuid ? { answers } : {}, isLoading: false } as never),
    );
    vi.mocked(useStockOperationPages).mockReturnValue({
      items: [],
      tableHeaders: [],
      currentPage: 1,
      pageSizes: [10],
      totalItems: 0,
      goTo: vi.fn(),
      currentPageSize: 10,
      setPageSize: vi.fn(),
      isLoading: false,
    } as never);
  });

  it('loads the stock source types from the configured concept on the Operations page', async () => {
    const user = userEvent.setup();
    render(<StockOperations />);

    await openSourcesFilter(user);

    expect(screen.getByText('Donation')).toBeInTheDocument();
    expect(screen.getByText('Commercial/sales')).toBeInTheDocument();
  });

  it('filters operations by the selected source type', async () => {
    const user = userEvent.setup();
    render(<StockOperations />);

    await openSourcesFilter(user);
    await user.click(screen.getByText('Donation'));

    expect(useStockOperationPages).toHaveBeenLastCalledWith(
      expect.objectContaining({ sourceTypeUuid: 'donation-uuid' }),
    );
  });

  it('reports the selected source types to its parent', async () => {
    const user = userEvent.setup();
    const onFilterChange = vi.fn();
    render(
      <StockOperationsFilters
        conceptUuid={sourceTypeConceptUuid}
        filterName={StockFilters.SOURCES}
        onFilterChange={onFilterChange}
      />,
    );

    await openSourcesFilter(user);
    await user.click(screen.getByText('Commercial/sales'));

    expect(onFilterChange).toHaveBeenCalledWith(['commercial-uuid'], StockFilters.SOURCES);
  });
});
