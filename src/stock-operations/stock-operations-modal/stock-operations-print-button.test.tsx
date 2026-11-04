import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useConfig } from '@openmrs/esm-framework';
import { type StockOperationDTO } from '../../core/api/types/stockOperation/StockOperationDTO';
import { PrintRequisitionStockOperation } from '../stock-print-reports/RequisitionDocument';
import { PrintTransferOutStockOperation } from '../stock-print-reports/StockTransferDocument';
import {
  getStockItemInventory,
  getStockOperationItemsCost,
  useStockOperationAndItems,
} from '../stock-operations.resource';
import StockOperationPrintButton from './stock-operations-print-button.component';

vi.mock('../stock-operations.resource', () => ({
  getStockItemInventory: vi.fn(),
  getStockOperation: vi.fn(),
  getStockOperationItemsCost: vi.fn(),
  useStockOperationAndItems: vi.fn(),
}));
vi.mock('../stock-print-reports/GoodsReceivedNote', () => ({ PrintGoodsReceivedNoteStockOperation: vi.fn() }));
vi.mock('../stock-print-reports/RequisitionDocument', () => ({ PrintRequisitionStockOperation: vi.fn() }));
vi.mock('../stock-print-reports/StockTransferDocument', () => ({ PrintTransferOutStockOperation: vi.fn() }));

const operationUuid = 'operation-uuid';
const makeOperation = (operationType: string) =>
  ({
    uuid: operationUuid,
    operationType,
    atLocationUuid: 'location-uuid',
    stockOperationItems: [{ uuid: 'item-uuid', stockItemUuid: 'stock-item-uuid', quantity: 200 }],
  } as unknown as StockOperationDTO);

const print = async (operation: StockOperationDTO) => {
  vi.mocked(useStockOperationAndItems).mockReturnValue({ items: operation, isLoading: false } as never);
  const user = userEvent.setup();
  render(<StockOperationPrintButton operation={operation} />);
  await user.click(screen.getByRole('button', { name: 'Print' }));
};

describe('StockOperationPrintButton', () => {
  beforeEach(() => {
    vi.mocked(getStockOperationItemsCost).mockResolvedValue({
      data: { results: [{ uuid: 'item-uuid', unitCost: 5, unitCostUOMName: 'Tablet', totalCost: 1000 }] },
    } as never);
    vi.mocked(getStockItemInventory).mockResolvedValue({
      data: { results: [{ stockItemUuid: 'stock-item-uuid', quantity: 750, quantityUoM: 'Tablet' }] },
    } as never);
  });

  it('does not look up costs or balances when the config options are off', async () => {
    vi.mocked(useConfig).mockReturnValue({ printItemCost: false, printBalanceOnHand: false });

    await print(makeOperation('requisition'));

    await waitFor(() => expect(PrintRequisitionStockOperation).toHaveBeenCalled());
    expect(getStockOperationItemsCost).not.toHaveBeenCalled();
    expect(getStockItemInventory).not.toHaveBeenCalled();
  });

  it("looks up costs with the operation's UUID when printItemCost is on, even without a parent requisition", async () => {
    vi.mocked(useConfig).mockReturnValue({ printItemCost: true, printBalanceOnHand: false });

    await print(makeOperation('transferout'));

    await waitFor(() => expect(PrintTransferOutStockOperation).toHaveBeenCalled());
    expect(getStockOperationItemsCost).toHaveBeenCalledWith(operationUuid);
    expect(vi.mocked(PrintTransferOutStockOperation).mock.calls[0][0].items[0]).toMatchObject({
      unitCost: 5,
      totalCost: 1000,
    });
  });

  it('looks up balances when printBalanceOnHand is on, even without a parent requisition', async () => {
    vi.mocked(useConfig).mockReturnValue({ printItemCost: false, printBalanceOnHand: true });

    await print(makeOperation('requisition'));

    await waitFor(() => expect(PrintRequisitionStockOperation).toHaveBeenCalled());
    expect(getStockItemInventory).toHaveBeenCalledWith(expect.objectContaining({ stockOperationUuid: operationUuid }));
    expect(vi.mocked(PrintRequisitionStockOperation).mock.calls[0][0].items[0]).toMatchObject({
      balanceOnHand: 750,
      balanceOnHandUoM: 'Tablet',
    });
  });
});
