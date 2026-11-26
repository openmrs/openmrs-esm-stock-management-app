import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { useStockTagLocations } from '../../../stock-lookups/stock-lookups.resource';
import { useStockItemBatchInformationHook } from './batch-information.resource';
import BatchInformation from './batch-information.component';

vi.mock('./batch-information.resource', () => ({
  useStockItemBatchInformationHook: vi.fn(),
}));

vi.mock('../../../stock-lookups/stock-lookups.resource', () => ({
  useStockTagLocations: vi.fn(),
}));

describe('BatchInformation', () => {
  const originalTimeZone = process.env.TZ;

  afterEach(() => {
    if (originalTimeZone === undefined) {
      delete process.env.TZ;
    } else {
      process.env.TZ = originalTimeZone;
    }
  });

  it('shows the server calendar expiry date when the browser is behind the server', () => {
    process.env.TZ = 'America/New_York';
    vi.mocked(useStockTagLocations).mockReturnValue({
      stockLocations: [{ id: 'loc-1', name: 'Main Pharmacy' }],
      isLoading: false,
      error: undefined,
    } as ReturnType<typeof useStockTagLocations>);
    vi.mocked(useStockItemBatchInformationHook).mockReturnValue({
      isLoading: false,
      items: [
        {
          partyUuid: 'party-1',
          partyName: 'Main Pharmacy',
          stockBatchUuid: 'batch-1',
          batchNumber: 'BATCH-001',
          expiration: '2027-12-31T00:00:00.000+0000' as unknown as Date,
          quantity: 10,
          quantityUoM: 'Tablet',
          quantityFactor: '1',
        },
      ],
      totalCount: 1,
      setCurrentPage: vi.fn(),
      setStockItemUuid: vi.fn(),
      setLocationUuid: vi.fn(),
    } as unknown as ReturnType<typeof useStockItemBatchInformationHook>);

    render(<BatchInformation stockItemUuid="item-1" />);

    expect(screen.getByText('31-Dec-2027')).toBeInTheDocument();
  });
});
