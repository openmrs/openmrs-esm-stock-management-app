import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import ExpiredStockModal from './expired-stock.modal';

const expiredStock = [{ drugName: 'Paracetamol', batchNo: 'B1', quantity: 5, expiration: '2026-01-15T12:00:00.000Z' }];

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
      { drugName: 'Paracetamol', conceptName: 'Paracetamol', batchNo: 'B1', quantity: 5 },
      { drugName: null, conceptName: 'Surgical gloves', batchNo: 'G1', quantity: 40 },
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
