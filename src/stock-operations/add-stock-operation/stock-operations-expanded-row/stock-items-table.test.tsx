import React from 'react';
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import StockItemsTable from './stock-items-table';

const items = [
  {
    commonName: 'Acetaminophen',
    batchNo: '330',
    quantity: 330,
    expiration: null,
    stockItemPackagingUOMName: 'Box',
  },
  {
    commonName: 'Ibuprofen 200mg',
    batchNo: 'IBU-1',
    quantity: 10,
    expiration: null,
    stockItemPackagingUOMName: 'Tablet',
  },
] as any;

describe('StockItemsTable search', () => {
  it.each(['acet', 'ACET', 'Acet'])('finds the item when searching "%s"', async (text) => {
    const user = userEvent.setup();
    render(<StockItemsTable items={items} />);

    await user.type(screen.getByRole('searchbox'), text);

    expect(screen.getByText('Acetaminophen')).toBeInTheDocument();
    expect(screen.queryByText('Ibuprofen 200mg')).not.toBeInTheDocument();
  });
});
