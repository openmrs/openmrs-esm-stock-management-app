import React from 'react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import userEvent from '@testing-library/user-event';
import { render, screen } from '@testing-library/react';
import { getDefaultsFromConfigSchema, showModal, useConfig } from '@openmrs/esm-framework';
import { configSchema, type ConfigObject } from '../../../../config-schema';
import { useStockItem, useStockItemTransactions } from '../../../stock-items.resource';
import TransactionsPrintAction from './transactions-print-action.component';

vi.mock('../../../stock-items.resource', () => ({
  useStockItem: vi.fn(),
  useStockItemTransactions: vi.fn(),
}));

const mockUseConfig = vi.mocked(useConfig<ConfigObject>);
const mockShowModal = vi.mocked(showModal);
const mockUseStockItem = vi.mocked(useStockItem);
const mockUseStockItemTransactions = vi.mocked(useStockItemTransactions);

const itemUuid = 'stock-item-uuid';

const patientTransactions = [
  { uuid: 'transaction-1', stockItemUuid: itemUuid, packagingUomName: 'Tablet', quantity: -2 },
  { uuid: 'transaction-2', stockItemUuid: itemUuid, packagingUomName: 'Tablet', quantity: -5 },
];

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
  });

  it('requests patient transactions for the current item only', () => {
    render(<TransactionsPrintAction itemUuid={itemUuid} columns={[]} data={[]} />);

    expect(mockUseStockItemTransactions).toHaveBeenCalledWith(
      expect.objectContaining({ isPatientTransaction: 'true', stockItemUuid: itemUuid }),
    );
  });

  it('passes the patient transactions to the Stock Card preview without a balance column', async () => {
    const user = userEvent.setup();
    render(<TransactionsPrintAction itemUuid={itemUuid} columns={[]} data={[]} />);

    await clickPrintMenuItem(user, /print stock card/i);

    expect(mockShowModal).toHaveBeenCalledWith(
      'transactions-print-stockcard-preview-modal',
      expect.objectContaining({ title: 'Amoxicillin 500mg', data: patientTransactions }),
    );
    const { columns } = mockShowModal.mock.calls[0][1] as { columns: Array<{ key: string }> };
    expect(columns.map((column) => column.key)).not.toContain('balance');
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
