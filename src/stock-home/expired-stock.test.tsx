import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import ExpiredStockModal from './expired-stock.modal';

const expiredStock = [
  {
    stockItemUuid: 'stock-item-uuid',
    stockBatchUuid: 'stock-batch-uuid',
    partyUuid: 'party-uuid',
    partyName: 'Main Pharmacy',
    batchNumber: 'B1',
    quantity: 5,
    quantityUoM: 'Tablet',
    quantityFactor: 1,
    itemName: 'Paracetamol',
    hasExpiration: true,
    expiryNotice: 30,
    reorderLevel: 10,
    reorderLevelUoMFactor: 1,
    dispensingUnitName: 'Tablet',
    expiration: new Date('2026-01-15T12:00:00.000Z'),
  },
];

describe('ExpiredStockModal', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it.each([
    ['en', /Jan/],
    ['fr', /janv/],
  ])("formats expiration dates in the user's locale (%s)", (language, expected) => {
    vi.stubGlobal('i18next', { language });

    render(<ExpiredStockModal closeModal={vi.fn()} expiredStock={expiredStock} />);

    expect(screen.getByRole('cell', { name: expected })).toBeInTheDocument();
  });

  it('names drug and non-drug items under an Item column', () => {
    const stock = [
      { ...expiredStock[0], itemName: 'Paracetamol', batchNumber: 'B1', quantity: 5 },
      { ...expiredStock[0], itemName: 'Surgical gloves', batchNumber: 'G1', quantity: 40 },
    ];

    render(<ExpiredStockModal closeModal={vi.fn()} expiredStock={stock} />);

    expect(screen.getByRole('columnheader', { name: 'Item' })).toBeInTheDocument();
    expect(screen.queryByRole('columnheader', { name: 'Drug Name' })).not.toBeInTheDocument();
    expect(screen.getByRole('row', { name: /Paracetamol B1/ })).toBeInTheDocument();
    expect(screen.getByRole('row', { name: /Surgical gloves G1/ })).toBeInTheDocument();
  });

  it('labels every column with a translated header', () => {
    render(<ExpiredStockModal closeModal={vi.fn()} expiredStock={expiredStock} />);

    expect(screen.getAllByRole('columnheader').map((header) => header.textContent)).toEqual([
      'Item',
      'Batch number',
      'Quantity',
      'Unit',
      'Expiration date',
    ]);
  });
});
