import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useConfig } from '@openmrs/esm-framework';
import { receiptOperationTypeMock } from '@mocks';
import { type StockOperationType } from '../../../core/api/types/stockOperation/StockOperationType';
import { useStockItem } from '../../../stock-items/stock-items.resource';
import StockItemForm from './stock-item-form.workspace';

vi.mock('../../../stock-items/stock-items.resource', () => ({ useStockItem: vi.fn() }));

const receiptType = receiptOperationTypeMock as unknown as StockOperationType;

const mockStockItem = (hasExpiration: boolean) =>
  vi.mocked(useStockItem).mockReturnValue({
    isLoading: false,
    error: null,
    item: {
      uuid: 'item-uuid',
      drugName: 'Gauze roll',
      hasExpiration,
      packagingUnits: [{ uuid: 'uom-uuid', packagingUomName: 'Roll', factor: 1 }],
    },
  } as never);

const renderLineForm = (hasExpiration: boolean | undefined, onSave: () => void) =>
  render(
    <StockItemForm
      stockOperationType={receiptType}
      stockOperationItem={{ uuid: 'new-item-1', stockItemUuid: 'item-uuid', hasExpiration } as never}
      onSave={onSave}
    />,
  );

const fillBatchAndQuantity = async (user: ReturnType<typeof userEvent.setup>) => {
  await user.type(screen.getByRole('textbox', { name: 'Batch number' }), 'B-001');
  await user.type(screen.getByRole('spinbutton', { name: 'Quantity' }), '20');
};

describe('StockItemForm on a receipt', () => {
  beforeEach(() => {
    vi.mocked(useConfig).mockReturnValue({ useItemCommonNameAsDisplay: false });
  });

  it("doesn't ask for an expiration date for an item that doesn't expire", async () => {
    const user = userEvent.setup();
    mockStockItem(false);
    const onSave = vi.fn();
    renderLineForm(false, onSave);

    expect(screen.queryByLabelText('Expiration date')).not.toBeInTheDocument();

    await fillBatchAndQuantity(user);
    await user.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() => expect(onSave).toHaveBeenCalledTimes(1));
    expect(onSave.mock.calls[0][0]).toEqual(
      expect.objectContaining({ batchNo: 'B-001', quantity: 20, stockItemPackagingUOMUuid: 'uom-uuid' }),
    );
    expect(onSave.mock.calls[0][0].expiration).toBeUndefined();
  });

  it("uses the stock item to tell whether a saved line's item expires", async () => {
    const user = userEvent.setup();
    mockStockItem(false);
    const onSave = vi.fn();
    renderLineForm(undefined, onSave);

    expect(screen.queryByLabelText('Expiration date')).not.toBeInTheDocument();

    await fillBatchAndQuantity(user);
    await user.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() => expect(onSave).toHaveBeenCalledTimes(1));
  });

  it('shows an error on the expiration date when an item that expires has none', async () => {
    const user = userEvent.setup();
    mockStockItem(true);
    const onSave = vi.fn();
    renderLineForm(true, onSave);

    const expiration = screen.getByLabelText('Expiration date');
    await fillBatchAndQuantity(user);
    await user.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() => expect(expiration).toHaveAttribute('data-invalid', 'true'));
    expect(screen.getByText('Required')).toBeInTheDocument();
    expect(onSave).not.toHaveBeenCalled();
  });
});
