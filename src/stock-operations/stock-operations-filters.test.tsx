import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { type FetchResponse } from '@openmrs/esm-framework';
import { StockFilters } from '../constants';
import { getStockOperationTypes } from '../stock-lookups/stock-lookups.resource';
import StockOperationsFilters from './stock-operations-filters.component';

vi.mock('../stock-lookups/stock-lookups.resource', () => ({
  getStockOperationTypes: vi.fn(),
  useConcept: vi.fn(() => ({ items: {}, isLoading: false })),
}));

describe('operation type filter', () => {
  beforeEach(() => {
    vi.mocked(getStockOperationTypes).mockResolvedValue({
      data: {
        results: [
          { operationType: 'adjustment', name: 'Adjustment' },
          { operationType: 'receipt', name: 'Receipt' },
        ],
      },
    } as FetchResponse);
  });

  it('selects the type code from responses without UUIDs', async () => {
    const user = userEvent.setup();
    const onFilterChange = vi.fn();
    render(<StockOperationsFilters filterName={StockFilters.OPERATION} onFilterChange={onFilterChange} />);

    const selector = await screen.findByRole('combobox');
    await user.click(selector);
    await user.click(await screen.findByText('Receipt'));

    expect(onFilterChange).toHaveBeenLastCalledWith(['receipt'], StockFilters.OPERATION);
  });
});
