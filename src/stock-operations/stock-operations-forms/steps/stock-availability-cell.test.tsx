import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { useStockItemInventory } from '../../../stock-items/stock-items.resource';
import StockAvailability from './stock-availability-cell.component';

vi.mock('../../../stock-items/stock-items.resource', () => ({
  useStockItemInventory: vi.fn(),
}));

const mockUseStockItemInventory = vi.mocked(useStockItemInventory);

const mockInventory = (results: Array<Record<string, unknown>>) =>
  mockUseStockItemInventory.mockReturnValue({
    items: { results },
    isLoading: false,
    error: null,
  } as any);

describe('StockAvailability', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows the location total as one row in one unit, and asks the backend to group it', () => {
    mockInventory([{ quantity: 5.35, quantityUoM: 'Box' }]);

    render(<StockAvailability stockItemUuid="item-1" sourceUuid="party-1" />);

    expect(screen.getByText(/Available: 5.35 Box/)).toBeInTheDocument();

    const filter = mockUseStockItemInventory.mock.calls[0][0];
    expect(filter).toMatchObject({
      stockItemUuid: 'item-1',
      partyUuid: 'party-1',
      groupBy: 'LocationStockItem',
    });
    expect(filter.includeBatchNo).toBeUndefined();
  });

  it('falls back to a single item-wide total when there is no source', () => {
    mockInventory([{ quantity: 12, quantityUoM: 'Box' }]);

    render(<StockAvailability stockItemUuid="item-1" />);

    expect(screen.getByText(/Available: 12 Box/)).toBeInTheDocument();
    expect(mockUseStockItemInventory.mock.calls[0][0]).toMatchObject({ groupBy: 'StockItemOnly' });
  });

  it('shows Out of Stock when there are no rows', () => {
    mockInventory([]);

    render(<StockAvailability stockItemUuid="item-1" sourceUuid="party-1" />);

    expect(screen.getByText(/Out of Stock/)).toBeInTheDocument();
  });
});
