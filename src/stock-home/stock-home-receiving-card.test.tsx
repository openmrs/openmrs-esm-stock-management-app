import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import StockHomeReceivingCard from './stock-home-receiving-card.component';
import { useStockReceiving } from './stock-home-receiving.resource';

const mockHandleMutate = vi.fn();

vi.mock('./stock-home-receiving.resource', () => ({ useStockReceiving: vi.fn() }));
vi.mock('../utils', () => ({ useHandleMutate: () => mockHandleMutate }));

const receipt = {
  uuid: 'receipt-uuid',
  operationType: 'receipt',
  status: 'NEW',
  sourceName: 'Supplier',
  destinationName: 'Main Store',
  stockOperationItems: [{ stockItemName: 'Paracetamol', stockItemPackagingUOMName: 'Tablet', quantity: 5 }],
};

describe('StockHomeReceivingCard', () => {
  it('shows an error with a retry when the operations fail to load', async () => {
    const user = userEvent.setup();
    vi.mocked(useStockReceiving).mockReturnValue({
      items: undefined,
      isLoading: false,
      error: new Error('Service Unavailable'),
    } as never);
    render(<StockHomeReceivingCard />);

    expect(screen.getByRole('alert')).toHaveTextContent("Couldn't load received stock");
    expect(screen.queryByRole('button', { name: 'View All' })).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Try again' }));

    expect(mockHandleMutate).toHaveBeenCalledWith(expect.stringMatching(/\/stockmanagement\/stockoperation\?$/));
  });

  it('keeps the error and Try again when Escape is pressed', async () => {
    const user = userEvent.setup();
    vi.mocked(useStockReceiving).mockReturnValue({
      items: undefined,
      isLoading: false,
      error: new Error('Service Unavailable'),
    } as never);
    render(<StockHomeReceivingCard />);

    screen.getByRole('button', { name: 'Try again' }).focus();
    await user.keyboard('{Escape}');

    expect(screen.getByRole('alert')).toHaveTextContent("Couldn't load received stock");
    expect(screen.getByRole('button', { name: 'Try again' })).toBeInTheDocument();
  });

  it('shows the error when a reload fails, even with data from an earlier load', () => {
    vi.mocked(useStockReceiving).mockReturnValue({
      items: [receipt],
      isLoading: false,
      error: new Error('Service Unavailable'),
    } as never);
    render(<StockHomeReceivingCard />);

    expect(screen.getByRole('alert')).toHaveTextContent("Couldn't load received stock");
    expect(screen.queryByText('Paracetamol')).not.toBeInTheDocument();
  });

  it('shows no error when the operations load', () => {
    vi.mocked(useStockReceiving).mockReturnValue({
      items: [],
      isLoading: false,
      error: null,
    } as never);
    render(<StockHomeReceivingCard />);

    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
});
