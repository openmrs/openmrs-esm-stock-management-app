import React from 'react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import userEvent from '@testing-library/user-event';
import { render, screen, waitFor } from '@testing-library/react';
import { getDefaultsFromConfigSchema, showModal, showSnackbar, useConfig } from '@openmrs/esm-framework';
import { configSchema, type ConfigObject } from '../../../../config-schema';
import { type StockItemTransactionDTO } from '../../../../core/api/types/stockItem/StockItemTransaction';
import { fetchAllStockItemTransactions, useStockItem, useStockItemTransactions } from '../../../stock-items.resource';
import TransactionsPrintAction from './transactions-print-action.component';

vi.mock('../../../stock-items.resource', () => ({
  fetchAllStockItemTransactions: vi.fn(),
  useStockItem: vi.fn(),
  useStockItemTransactions: vi.fn(),
}));

const mockUseConfig = vi.mocked(useConfig<ConfigObject>);
const mockShowModal = vi.mocked(showModal);
const mockShowSnackbar = vi.mocked(showSnackbar);
const mockFetchAllStockItemTransactions = vi.mocked(fetchAllStockItemTransactions);
const mockUseStockItem = vi.mocked(useStockItem);
const mockUseStockItemTransactions = vi.mocked(useStockItemTransactions);

const itemUuid = 'stock-item-uuid';

const patientTransactions = [
  { uuid: 'transaction-1', stockItemUuid: itemUuid, packagingUomName: 'Tablet', quantity: -2 },
  { uuid: 'transaction-2', stockItemUuid: itemUuid, packagingUomName: 'Tablet', quantity: -5 },
] as Array<StockItemTransactionDTO>;

const transactionRows = [{ id: 'row-1', date: '20-Oct-2026' }];

const toBinCardRow = (transaction: StockItemTransactionDTO) => ({ id: transaction.uuid });

const mockPatientTransactions = (results: typeof patientTransactions | undefined, isLoading = false) => {
  mockUseStockItemTransactions.mockReturnValue({
    items: results ? { results } : undefined,
    isLoading,
    error: null,
  } as ReturnType<typeof useStockItemTransactions>);
};

const renderPrintAction = (props: Partial<React.ComponentProps<typeof TransactionsPrintAction>> = {}) =>
  render(
    <TransactionsPrintAction
      itemUuid={itemUuid}
      columns={[]}
      data={transactionRows}
      toBinCardRow={toBinCardRow}
      {...props}
    />,
  );

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
    renderPrintAction();

    expect(screen.queryByRole('menuitem')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /^print$/i }));

    expect(screen.getByRole('menuitem', { name: /print stock card/i })).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: /print bin card/i })).toBeInTheDocument();
  });

  it('leaves out Print Bin Card when the Transactions table is empty', async () => {
    const user = userEvent.setup();
    renderPrintAction({ data: [] });

    await user.click(screen.getByRole('button', { name: /^print$/i }));

    expect(screen.getByRole('menuitem', { name: /print stock card/i })).toBeInTheDocument();
    expect(screen.queryByRole('menuitem', { name: /print bin card/i })).not.toBeInTheDocument();
  });

  it('leaves out Print Stock Card when the item has no patient transactions', async () => {
    const user = userEvent.setup();
    mockPatientTransactions([]);
    renderPrintAction();

    await user.click(screen.getByRole('button', { name: /^print$/i }));

    expect(screen.queryByRole('menuitem', { name: /print stock card/i })).not.toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: /print bin card/i })).toBeInTheDocument();
  });

  it('shows Print Stock Card disabled while the patient transactions load', async () => {
    const user = userEvent.setup();
    mockPatientTransactions(undefined, true);
    renderPrintAction({ data: [] });

    await user.click(screen.getByRole('button', { name: /^print$/i }));

    expect(screen.getByRole('menuitem', { name: /print stock card/i })).toHaveAttribute('aria-disabled', 'true');
  });

  it('renders no Print button when neither card has anything to print', () => {
    mockPatientTransactions([]);
    renderPrintAction({ data: [] });

    expect(screen.queryByRole('button', { name: /^print$/i })).not.toBeInTheDocument();
  });

  it('prints every patient transaction for the current item on the Stock Card, without a balance column', async () => {
    const user = userEvent.setup();
    const allPatientTransactions = [
      ...patientTransactions,
      { uuid: 'transaction-3', stockItemUuid: itemUuid, packagingUomName: 'Tablet', quantity: -1 },
    ] as Array<StockItemTransactionDTO>;
    mockFetchAllStockItemTransactions.mockResolvedValue(allPatientTransactions);
    renderPrintAction();

    await clickPrintMenuItem(user, /print stock card/i);

    expect(mockFetchAllStockItemTransactions).toHaveBeenCalledWith(
      expect.objectContaining({ isPatientTransaction: 'true', stockItemUuid: itemUuid }),
    );
    await waitFor(() =>
      expect(mockShowModal).toHaveBeenCalledWith(
        'transactions-print-stockcard-preview-modal',
        expect.objectContaining({ title: 'Amoxicillin 500mg', data: allPatientTransactions }),
      ),
    );
    const { columns } = mockShowModal.mock.calls[0][1] as { columns: Array<{ key: string }> };
    expect(columns.map((column) => column.key)).not.toContain('balance');
  });

  it('prints every transaction at the filtered location on the Bin Card, not just the current page', async () => {
    const user = userEvent.setup();
    const columns = [{ key: 'date', header: 'Date' }];
    mockFetchAllStockItemTransactions.mockResolvedValue([
      { uuid: 'transaction-a' },
      { uuid: 'transaction-b' },
    ] as Array<StockItemTransactionDTO>);
    renderPrintAction({ columns, locationUuid: 'main-store-uuid' });

    await clickPrintMenuItem(user, /print bin card/i);

    expect(mockFetchAllStockItemTransactions).toHaveBeenCalledWith(
      expect.objectContaining({ stockItemUuid: itemUuid, locationUuid: 'main-store-uuid' }),
    );
    await waitFor(() =>
      expect(mockShowModal).toHaveBeenCalledWith(
        'transactions-print-bincard-preview-modal',
        expect.objectContaining({
          title: 'Amoxicillin 500mg',
          columns,
          data: [{ id: 'transaction-a' }, { id: 'transaction-b' }],
        }),
      ),
    );
  });

  it('shows an error and no preview when the transactions fail to load', async () => {
    const user = userEvent.setup();
    mockFetchAllStockItemTransactions.mockRejectedValue(new Error('Internal Server Error'));
    renderPrintAction();

    await clickPrintMenuItem(user, /print bin card/i);

    await waitFor(() =>
      expect(mockShowSnackbar).toHaveBeenCalledWith(
        expect.objectContaining({ kind: 'error', subtitle: 'Internal Server Error' }),
      ),
    );
    expect(mockShowModal).not.toHaveBeenCalled();
  });
});
