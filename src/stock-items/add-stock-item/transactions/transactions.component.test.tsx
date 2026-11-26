import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { useStockTagLocations } from '../../../stock-lookups/stock-lookups.resource';
import { useStockItem, useStockItemTransactions } from '../../stock-items.resource';
import { useStockItemsTransactions } from './transactions.resource';
import Transactions from './transactions.component';

vi.mock('./transactions.resource', () => ({
  useStockItemsTransactions: vi.fn(),
}));

vi.mock('../../../stock-lookups/stock-lookups.resource', () => ({
  useStockTagLocations: vi.fn(),
}));

vi.mock('../../stock-items.resource', () => ({
  useStockItem: vi.fn(),
  useStockItemTransactions: vi.fn(),
  fetchAllStockItemTransactions: vi.fn(),
}));

describe('Transactions', () => {
  const originalTimeZone = process.env.TZ;

  afterEach(() => {
    if (originalTimeZone === undefined) {
      delete process.env.TZ;
    } else {
      process.env.TZ = originalTimeZone;
    }
  });

  it('shows the server calendar batch expiry date when the browser is behind the server', () => {
    process.env.TZ = 'America/New_York';
    vi.mocked(useStockTagLocations).mockReturnValue({
      stockLocations: [{ id: 'loc-1', name: 'Main Pharmacy' }],
      isLoading: false,
      error: undefined,
    } as ReturnType<typeof useStockTagLocations>);
    vi.mocked(useStockItem).mockReturnValue({ item: undefined, isLoading: false } as ReturnType<typeof useStockItem>);
    vi.mocked(useStockItemTransactions).mockReturnValue({
      items: { results: [] },
      isLoading: false,
    } as ReturnType<typeof useStockItemTransactions>);
    vi.mocked(useStockItemsTransactions).mockReturnValue({
      isLoading: false,
      items: [
        {
          uuid: 'tx-1',
          dateCreated: '2026-10-21T08:00:00.000+0000' as unknown as Date,
          partyName: 'Main Pharmacy',
          isPatientTransaction: true,
          quantity: -2,
          packagingUomName: 'Tablet',
          packagingUomFactor: '10',
          stockBatchNo: 'BATCH-001',
          expiration: '2027-12-31T00:00:00.000+0000' as unknown as Date,
          stockOperationStatus: 'COMPLETED',
        },
      ],
      tableHeaders: [
        { key: 'date', header: 'Date' },
        { key: 'batch', header: 'Batch' },
      ],
      binCardHeaders: [{ key: 'batch', header: 'Batch' }],
      totalCount: 1,
      setCurrentPage: vi.fn(),
      setStockItemUuid: vi.fn(),
      setLocationUuid: vi.fn(),
      inventory: { total: 10 },
    } as unknown as ReturnType<typeof useStockItemsTransactions>);

    render(<Transactions stockItemUuid="item-1" />);

    expect(screen.getByText('BATCH-001 (31-Dec-2027)')).toBeInTheDocument();
  });
});
