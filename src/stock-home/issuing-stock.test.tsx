import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import routes from '../routes.json';
import IssuingStockModal from './issuing-stock.modal';

const issuingStock = [
  {
    status: 'DISPATCHED',
    sourceName: 'Main Store',
    destinationName: 'Main Pharmacy',
    stockOperationItems: [
      { stockItemName: 'Paracetamol 500mg', stockItemPackagingUOMName: 'Tablet', quantity: 200 },
      { stockItemName: 'Amoxicillin 250mg', stockItemPackagingUOMName: 'Capsule', quantity: 100 },
    ],
  },
];

describe('IssuingStockModal', () => {
  it('is registered as a modal so showModal can launch it', () => {
    expect(routes.modals).toContainEqual({ name: 'issuing-stock-modal', component: 'issuingStockModal' });
  });

  it('lists each item of the issued stock operations', () => {
    render(<IssuingStockModal closeModal={vi.fn()} issuingStock={issuingStock} />);

    expect(
      screen.getByRole('row', { name: /Dispatched Main Store Main Pharmacy Paracetamol 500mg Tablet 200/ }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('row', { name: /Dispatched Main Store Main Pharmacy Amoxicillin 250mg Capsule 100/ }),
    ).toBeInTheDocument();
    expect(screen.queryByText('DISPATCHED')).not.toBeInTheDocument();
    expect(screen.queryByRole('cell', { name: 'N/A' })).not.toBeInTheDocument();
  });

  it('says so when there is no issued stock', () => {
    render(<IssuingStockModal closeModal={vi.fn()} issuingStock={[]} />);

    expect(screen.getByText('No issued stock data available.')).toBeInTheDocument();
  });
});
