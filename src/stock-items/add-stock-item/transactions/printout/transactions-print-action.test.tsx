import React from 'react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import userEvent from '@testing-library/user-event';
import { render, screen } from '@testing-library/react';
import { getDefaultsFromConfigSchema, showModal, useConfig } from '@openmrs/esm-framework';
import { configSchema, type ConfigObject } from '../../../../config-schema';
import {
  type StockInventoryResult,
  useStockItem,
  useStockItemInventory,
  useStockItemTransactions,
} from '../../../stock-items.resource';
import TransactionsPrintAction from './transactions-print-action.component';

vi.mock('../../../stock-items.resource', () => ({
  useStockItem: vi.fn(),
  useStockItemInventory: vi.fn(),
  useStockItemTransactions: vi.fn(),
}));

const mockUseConfig = vi.mocked(useConfig<ConfigObject>);
const mockShowModal = vi.mocked(showModal);
const mockUseStockItem = vi.mocked(useStockItem);
const mockUseStockItemInventory = vi.mocked(useStockItemInventory);
const mockUseStockItemTransactions = vi.mocked(useStockItemTransactions);

const itemUuid = 'stock-item-uuid';

const patientTransactions = [
  { uuid: 'transaction-1', stockItemUuid: itemUuid, packagingUomName: 'Tablet', quantity: -2 },
  { uuid: 'transaction-2', stockItemUuid: itemUuid, packagingUomName: 'Tablet', quantity: -5 },
];

const mockInventoryTotal = (total: number) =>
  mockUseStockItemInventory.mockReturnValue({
    items: { total } as unknown as StockInventoryResult,
    isLoading: false,
    error: null,
  } as ReturnType<typeof useStockItemInventory>);

const clickPrintMenuItem = async (user: ReturnType<typeof userEvent.setup>, name: RegExp) => {
  await user.click(screen.getByRole('button', { name: /additional actions/i }));
  await user.click(screen.getByText(name));
};

describe('TransactionsPrintAction', () => {
  beforeEach(() => {
    mockUseConfig.mockReturnValue(getDefaultsFromConfigSchema(configSchema) as ConfigObject);
    mockUseStockItem.mockReturnValue({
      item: { drugName: 'Amoxicillin 500mg' },
      isLoading: false,
      error: null,
    } as ReturnType<typeof useStockItem>);
    mockUseStockItemTransactions.mockReturnValue({
      items: { results: patientTransactions },
      isLoading: false,
      error: null,
    } as ReturnType<typeof useStockItemTransactions>);
    mockInventoryTotal(80);
  });

  it('requests patient transactions and the balance for the current item only', () => {
    render(<TransactionsPrintAction itemUuid={itemUuid} columns={[]} data={[]} />);

    expect(mockUseStockItemTransactions).toHaveBeenCalledWith(
      expect.objectContaining({ isPatientTransaction: 'true', stockItemUuid: itemUuid }),
    );
    expect(mockUseStockItemInventory).toHaveBeenCalledWith(expect.objectContaining({ stockItemUuid: itemUuid }));
  });

  it('applies the location selected on the Transactions tab', () => {
    const locationUuid = 'main-pharmacy-uuid';
    render(<TransactionsPrintAction itemUuid={itemUuid} columns={[]} data={[]} filter={{ locationUuid }} />);

    expect(mockUseStockItemTransactions).toHaveBeenCalledWith(
      expect.objectContaining({ stockItemUuid: itemUuid, locationUuid }),
    );
    expect(mockUseStockItemInventory).toHaveBeenCalledWith(
      expect.objectContaining({ stockItemUuid: itemUuid, locationUuid }),
    );
  });

  it('passes the item balance to the Stock Card preview', async () => {
    const user = userEvent.setup();
    render(<TransactionsPrintAction itemUuid={itemUuid} columns={[]} data={[]} />);

    await clickPrintMenuItem(user, /print stock card/i);

    expect(mockShowModal).toHaveBeenCalledWith(
      'transactions-print-stockcard-preview-modal',
      expect.objectContaining({
        title: 'Amoxicillin 500mg',
        data: [
          expect.objectContaining({ uuid: 'transaction-1', balance: '80 Tablet' }),
          expect.objectContaining({ uuid: 'transaction-2', balance: '80 Tablet' }),
        ],
      }),
    );
  });

  it('prints a zero balance as zero', async () => {
    const user = userEvent.setup();
    mockInventoryTotal(0);
    render(<TransactionsPrintAction itemUuid={itemUuid} columns={[]} data={[]} />);

    await clickPrintMenuItem(user, /print stock card/i);

    expect(mockShowModal).toHaveBeenCalledWith(
      'transactions-print-stockcard-preview-modal',
      expect.objectContaining({
        data: expect.arrayContaining([expect.objectContaining({ balance: '0 Tablet' })]),
      }),
    );
  });

  it('passes the Transactions tab rows to the Bin Card preview', async () => {
    const user = userEvent.setup();
    const columns = [{ key: 'date', header: 'Date' }];
    const rows = [{ id: 'row-1', date: '20-Oct-2026' }];
    render(<TransactionsPrintAction itemUuid={itemUuid} columns={columns} data={rows} />);

    await clickPrintMenuItem(user, /print bin card/i);

    expect(mockShowModal).toHaveBeenCalledWith(
      'transactions-print-bincard-preview-modal',
      expect.objectContaining({ title: 'Amoxicillin 500mg', columns, data: rows }),
    );
  });
});
