import React from 'react';
import dayjs from 'dayjs';
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { useStockInventory } from './stock-home-inventory-expiry.resource';
import StockHomeInventoryCard from './stock-home-inventory-card.component';

vi.mock('./stock-home-inventory-expiry.resource', () => ({ useStockInventory: vi.fn() }));

const row = ({
  batchNumber,
  expiresInDays,
  itemName = 'Paracetamol 500mg',
  expiryNotice = 30,
}: {
  batchNumber: string;
  expiresInDays: number;
  itemName?: string;
  expiryNotice?: number;
}) => ({
  stockItemUuid: `item-${batchNumber}`,
  stockBatchUuid: `batch-${batchNumber}`,
  partyUuid: 'party',
  partyName: 'Main Pharmacy',
  batchNumber,
  quantity: 20,
  quantityUoM: 'Tablet',
  quantityFactor: 1,
  expiration: dayjs().add(expiresInDays, 'day').toDate(),
  itemName,
  hasExpiration: true,
  expiryNotice,
  reorderLevel: 10,
  reorderLevelUoMFactor: 1,
  dispensingUnitName: 'Tablet',
});

const setup = (items: Array<unknown> = []) => {
  vi.mocked(useStockInventory).mockReturnValue({
    items,
    isLoading: false,
    error: undefined,
  } as unknown as ReturnType<typeof useStockInventory>);
  render(<StockHomeInventoryCard />);
};

describe('StockHomeInventoryCard', () => {
  it('says there are no alerts, without View All, when no batch is within its expiry notice period', () => {
    setup([row({ batchNumber: 'LATER', expiresInDays: 400 })]);

    expect(screen.getByText('No inventory alerts to display')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'View All' })).not.toBeInTheDocument();
  });

  it('says there are no alerts when there are no batches', () => {
    setup();

    expect(screen.getByText('No inventory alerts to display')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'View All' })).not.toBeInTheDocument();
  });

  it('lists a batch within its expiry notice period, with View All', () => {
    setup([row({ batchNumber: 'SOON', expiresInDays: 30 }), row({ batchNumber: 'LATER', expiresInDays: 400 })]);

    expect(screen.getByText(/SOON/)).toBeInTheDocument();
    expect(screen.queryByText(/LATER/)).not.toBeInTheDocument();
    expect(screen.queryByText('No inventory alerts to display')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'View All' })).toBeInTheDocument();
  });

  it('excludes a batch that expires within 6 months but outside its notice period', () => {
    setup([row({ batchNumber: 'BEYOND', expiresInDays: 60, expiryNotice: 30 })]);

    expect(screen.getByText('No inventory alerts to display')).toBeInTheDocument();
    expect(screen.queryByText(/BEYOND/)).not.toBeInTheDocument();
  });

  it('excludes an already-expired batch', () => {
    setup([row({ batchNumber: 'PAST', expiresInDays: -5 })]);

    expect(screen.getByText('No inventory alerts to display')).toBeInTheDocument();
    expect(screen.queryByText(/PAST/)).not.toBeInTheDocument();
  });

  it('names a non-drug item whose batch expires soon', () => {
    setup([row({ batchNumber: 'G1', expiresInDays: 30, itemName: 'Surgical gloves' })]);

    expect(screen.getByText('Surgical gloves')).toBeInTheDocument();
    expect(screen.getByText(/G1/)).toBeInTheDocument();
  });
});
