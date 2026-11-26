import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import StockHomeIssuingCard from './stock-home-issuing-card.component';
import { useStockIssuing } from './stock-home-issuing.resource';

const mockHandleMutate = vi.fn();

vi.mock('./stock-home-issuing.resource', () => ({ useStockIssuing: vi.fn() }));
vi.mock('../utils', () => ({ useHandleMutate: () => mockHandleMutate }));

const issue = {
  uuid: 'issue-uuid',
  operationType: 'stockissue',
  status: 'NEW',
  sourceName: 'Main Store',
  destinationName: 'Main Pharmacy',
  stockOperationItems: [{ stockItemName: 'Paracetamol', stockItemPackagingUOMName: 'Tablet', quantity: 5 }],
};

describe('StockHomeIssuingCard', () => {
  it('shows an error with a retry when the operations fail to load', async () => {
    const user = userEvent.setup();
    vi.mocked(useStockIssuing).mockReturnValue({
      items: undefined,
      isLoading: false,
      error: new Error('Service Unavailable'),
    } as never);
    render(<StockHomeIssuingCard />);

    expect(screen.getByRole('alert')).toHaveTextContent("Couldn't load issued stock");
    expect(screen.queryByRole('button', { name: 'View All' })).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Try again' }));

    expect(mockHandleMutate).toHaveBeenCalledWith(expect.stringMatching(/\/stockmanagement\/stockoperation\?$/));
  });

  it('keeps the error and Try again when Escape is pressed', async () => {
    const user = userEvent.setup();
    vi.mocked(useStockIssuing).mockReturnValue({
      items: undefined,
      isLoading: false,
      error: new Error('Service Unavailable'),
    } as never);
    render(<StockHomeIssuingCard />);

    screen.getByRole('button', { name: 'Try again' }).focus();
    await user.keyboard('{Escape}');

    expect(screen.getByRole('alert')).toHaveTextContent("Couldn't load issued stock");
    expect(screen.getByRole('button', { name: 'Try again' })).toBeInTheDocument();
  });

  it('shows the error when a reload fails, even with data from an earlier load', () => {
    vi.mocked(useStockIssuing).mockReturnValue({
      items: [issue],
      isLoading: false,
      error: new Error('Service Unavailable'),
    } as never);
    render(<StockHomeIssuingCard />);

    expect(screen.getByRole('alert')).toHaveTextContent("Couldn't load issued stock");
    expect(screen.queryByText('Paracetamol')).not.toBeInTheDocument();
  });

  it('shows no error when the operations load', () => {
    vi.mocked(useStockIssuing).mockReturnValue({
      items: [],
      isLoading: false,
      error: null,
    } as never);
    render(<StockHomeIssuingCard />);

    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
});
