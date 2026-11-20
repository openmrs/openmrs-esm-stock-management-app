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

const transactionRows = [{ id: 'row-1', date: '20-Oct-2026' }];

const mockPatientTransactions = (results: typeof patientTransactions | undefined, isLoading = false) => {
  mockUseStockItemTransactions.mockReturnValue({
    items: results ? { results } : undefined,
    isLoading,
    error: null,
  } as ReturnType<typeof useStockItemTransactions>);
};

const clickPrintMenuItem = async (user: ReturnType<typeof userEvent.setup>, name: RegExp) => {
  await user.click(screen.getByRole('button', { name: /^print$/i }));
  await user.click(screen.getByRole('menuitem', { name }));
};

describe('TransactionsPrintAction', () => {
  beforeEach(() => {
    mockUseConfig.mockReturnValue(getDefaultsFromConfigSchema(configSchema) as ConfigObject);
    mockUseStockItem.mockReturnValue({
      item: { drugName: 'Amoxicillin 500mg' },
      isLoading: false,
      error: null,
    } as ReturnType<typeof useStockItem>);
    mockPatientTransactions(patientTransactions);
  });

  it('opens the print menu when the Print button is clicked', async () => {
    const user = userEvent.setup();
    render(<TransactionsPrintAction itemUuid={itemUuid} columns={[]} data={transactionRows} />);

    expect(screen.queryByRole('menuitem')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /^print$/i }));

    expect(screen.getByRole('menuitem', { name: /print stock card/i })).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: /print bin card/i })).toBeInTheDocument();
  });

  it('leaves out Print Bin Card when the Transactions table is empty', async () => {
    const user = userEvent.setup();
    render(<TransactionsPrintAction itemUuid={itemUuid} columns={[]} data={[]} />);

    await user.click(screen.getByRole('button', { name: /^print$/i }));

    expect(screen.getByRole('menuitem', { name: /print stock card/i })).toBeInTheDocument();
    expect(screen.queryByRole('menuitem', { name: /print bin card/i })).not.toBeInTheDocument();
  });

  it('leaves out Print Stock Card when the item has no patient transactions', async () => {
    const user = userEvent.setup();
    mockPatientTransactions([]);
    render(<TransactionsPrintAction itemUuid={itemUuid} columns={[]} data={transactionRows} />);

    await user.click(screen.getByRole('button', { name: /^print$/i }));

    expect(screen.queryByRole('menuitem', { name: /print stock card/i })).not.toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: /print bin card/i })).toBeInTheDocument();
  });

  it('shows Print Stock Card disabled while the patient transactions load', async () => {
    const user = userEvent.setup();
    mockPatientTransactions(undefined, true);
    render(<TransactionsPrintAction itemUuid={itemUuid} columns={[]} data={[]} />);

    await user.click(screen.getByRole('button', { name: /^print$/i }));

    expect(screen.getByRole('menuitem', { name: /print stock card/i })).toHaveAttribute('aria-disabled', 'true');
  });

  it('renders no Print button when neither card has anything to print', () => {
    mockPatientTransactions([]);
    render(<TransactionsPrintAction itemUuid={itemUuid} columns={[]} data={[]} />);

    expect(screen.queryByRole('button', { name: /^print$/i })).not.toBeInTheDocument();
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
