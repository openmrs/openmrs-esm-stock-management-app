import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import ReceivingStockModal from './receiving-stock.modal';

const receivingStock = [
  {
    status: 'SUBMITTED',
    sourceName: 'National Medical Stores',
    destinationName: 'Main Store',
    stockOperationItems: [{ stockItemName: 'Acetaminophen', stockItemPackagingUOMName: 'Box', quantity: 879 }],
  },
  {
    status: undefined,
    sourceName: 'National Medical Stores',
    destinationName: 'Main Store',
    stockOperationItems: [{ stockItemName: 'Ibuprofen', stockItemPackagingUOMName: 'Box', quantity: 12 }],
  },
];

describe('ReceivingStockModal', () => {
  it('shows the status as a translated, sentence case label', () => {
    render(<ReceivingStockModal closeModal={vi.fn()} receivingStock={receivingStock} />);

    expect(
      screen.getByRole('row', { name: /Submitted National Medical Stores Main Store Acetaminophen Box 879/ }),
    ).toBeInTheDocument();
    expect(screen.queryByText('SUBMITTED')).not.toBeInTheDocument();
  });

  it('keeps the N/A fallback when an operation has no status', () => {
    render(<ReceivingStockModal closeModal={vi.fn()} receivingStock={receivingStock} />);

    expect(screen.getByRole('row', { name: /N\/A National Medical Stores Main Store Ibuprofen/ })).toBeInTheDocument();
  });
});
