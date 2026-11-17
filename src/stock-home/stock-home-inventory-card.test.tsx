import React from 'react';
import dayjs from 'dayjs';
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { useStockInventory } from './stock-home-inventory-expiry.resource';
import { useStockInventoryItems } from './stock-home-inventory-items.resource';
import StockHomeInventoryCard from './stock-home-inventory-card.component';

vi.mock('./stock-home-inventory-expiry.resource', () => ({ useStockInventory: vi.fn() }));
vi.mock('./stock-home-inventory-items.resource', () => ({ useStockInventoryItems: vi.fn() }));

const paracetamol = {
  uuid: 'item-1',
  drugName: 'Paracetamol 500mg',
  hasExpiration: true,
  dispensingUnitName: 'Tablet',
};

const batch = (batchNo: string, expiresInDays: number) => ({
  uuid: `batch-${batchNo}`,
  batchNo,
  stockItemUuid: paracetamol.uuid,
  quantity: '20',
  expiration: dayjs().add(expiresInDays, 'day').toDate(),
});

const setup = ({ items = [paracetamol], batches = [] }: { items?: Array<unknown>; batches?: Array<unknown> } = {}) => {
  vi.mocked(useStockInventoryItems).mockReturnValue({ items, isLoading: false, error: undefined } as ReturnType<
    typeof useStockInventoryItems
  >);
  vi.mocked(useStockInventory).mockReturnValue({ items: batches, isLoading: false, error: undefined } as ReturnType<
    typeof useStockInventory
  >);
  render(<StockHomeInventoryCard />);
};

describe('StockHomeInventoryCard', () => {
  it('says there are no alerts, without View All, when no batch expires within 6 months', () => {
    setup({ batches: [batch('LATER', 400)] });

    expect(screen.getByText('No inventory alerts to display')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'View All' })).not.toBeInTheDocument();
  });

  it('says there are no alerts when there are stock items but no batches', () => {
    setup();

    expect(screen.getByText('No inventory alerts to display')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'View All' })).not.toBeInTheDocument();
  });

  it('says there are no alerts when there are no stock items', () => {
    setup({ items: [] });

    expect(screen.getByText('No inventory alerts to display')).toBeInTheDocument();
  });

  it('lists a batch that expires within 6 months, with View All', () => {
    setup({ batches: [batch('SOON', 30), batch('LATER', 400)] });

    expect(screen.getByText(/SOON/)).toBeInTheDocument();
    expect(screen.queryByText(/LATER/)).not.toBeInTheDocument();
    expect(screen.queryByText('No inventory alerts to display')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'View All' })).toBeInTheDocument();
  });

  it('names a non-drug item whose batch expires soon', () => {
    const gloves = { uuid: 'item-2', drugName: null, conceptName: 'Surgical gloves', hasExpiration: true };
    const batch = {
      uuid: 'batch-1',
      batchNo: 'G1',
      stockItemUuid: gloves.uuid,
      quantity: '40',
      expiration: dayjs().add(30, 'day').toDate(),
    };
    vi.mocked(useStockInventoryItems).mockReturnValue({
      items: [gloves],
      isLoading: false,
      error: undefined,
    } as unknown as ReturnType<typeof useStockInventoryItems>);
    vi.mocked(useStockInventory).mockReturnValue({
      items: [batch],
      isLoading: false,
      error: undefined,
    } as unknown as ReturnType<typeof useStockInventory>);

    render(<StockHomeInventoryCard />);

    expect(screen.getByText('Surgical gloves')).toBeInTheDocument();
    expect(screen.getByText(/G1/)).toBeInTheDocument();
  });
});
