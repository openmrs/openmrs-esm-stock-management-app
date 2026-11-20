import React from 'react';
import { vi, describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { type StockItemInventory } from '../../../core/api/types/stockItem/StockItemInventory';
import { useStockItemBatchInformationHook } from '../../../stock-items/add-stock-item/batch-information/batch-information.resource';
import StockAvailability from './stock-availability-cell.component';

vi.mock('../../../stock-items/add-stock-item/batch-information/batch-information.resource', () => ({
  useStockItemBatchInformationHook: vi.fn(),
}));

const mockUseStockItemBatchInformationHook = vi.mocked(useStockItemBatchInformationHook);

describe('StockAvailability', () => {
  it("counts only the stock held by the operation's party", () => {
    const inventory = [
      { partyUuid: 'main-pharmacy', batchNumber: 'B1', quantity: 20, quantityUoM: 'Tablet' },
      { partyUuid: 'main-store', batchNumber: 'B1', quantity: 500, quantityUoM: 'Tablet' },
      { partyUuid: 'main-store', batchNumber: 'B2', quantity: 295, quantityUoM: 'Tablet' },
    ] as StockItemInventory[];
    mockUseStockItemBatchInformationHook.mockImplementation((filter) => ({
      items: inventory.filter((row) => !filter?.partyUuid || row.partyUuid === filter.partyUuid),
      totalCount: 3,
      currentPage: 1,
      currentPageSize: 10,
      pageSizes: [10, 20, 30, 40, 50],
      isLoading: false,
      error: null,
      setCurrentPage: vi.fn(),
      setPageSize: vi.fn(),
      setSearchString: vi.fn(),
      setStockItemUuid: vi.fn(),
      setLocationUuid: vi.fn(),
      setPartyUuid: vi.fn(),
      setStockBatchUuid: vi.fn(),
    }));

    render(<StockAvailability stockItemUuid="item-uuid" partyUuid="main-store" />);

    expect(screen.getByText('Available: 795 Tablet')).toBeInTheDocument();
  });
});
