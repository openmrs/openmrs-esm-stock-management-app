import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { type StockOperationDTO } from '../../../core/api/types/stockOperation/StockOperationDTO';
import ReceivedItems from './received-items.component';

describe('ReceivedItems', () => {
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
    const stockOperation = {
      stockOperationItems: [
        {
          uuid: 'item-1',
          stockItemName: 'Paracetamol',
          batchNo: 'BATCH-001',
          expiration: '2027-12-31T00:00:00.000+0000',
          quantity: 10,
          quantityReceived: 10,
          quantityReceivedPackagingUOMName: 'Tablet',
        },
      ],
    } as unknown as StockOperationDTO;

    render(<ReceivedItems stockOperation={stockOperation} onPrevious={vi.fn()} />);

    expect(screen.getByText('12/31/2027')).toBeInTheDocument();
  });
});
