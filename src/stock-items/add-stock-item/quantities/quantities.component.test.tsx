import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { useStockItemQuantitiesHook } from './quantities.resource';
import StockQuantities from './quantities.component';

vi.mock('./quantities.resource', () => ({
  useStockItemQuantitiesHook: vi.fn(),
}));

vi.mock('../../../core/components/table/table.component', () => ({
  default: ({ data }: { data: Array<{ id: string; expires?: string }> }) => (
    <div>
      {data?.map((row) => (
        <span key={row.id}>{row.expires}</span>
      ))}
    </div>
  ),
}));

describe('StockQuantities', () => {
  const originalTimeZone = process.env.TZ;

  afterEach(() => {
    if (originalTimeZone === undefined) {
      delete process.env.TZ;
    } else {
      process.env.TZ = originalTimeZone;
    }
  });

  it('formats batch expiry as the server calendar date behind the server timezone', () => {
    process.env.TZ = 'America/New_York';
    vi.mocked(useStockItemQuantitiesHook).mockReturnValue({
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
    } as unknown as ReturnType<typeof useStockItemQuantitiesHook>);

    render(<StockQuantities stockItemUuid="item-1" />);

    expect(screen.getByText('31-Dec-2027')).toBeInTheDocument();
  });
});
