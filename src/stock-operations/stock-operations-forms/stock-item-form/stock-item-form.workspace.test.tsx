import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { OpenmrsDatePicker } from '@openmrs/esm-framework';
import { type StockOperationType } from '../../../core/api/types/stockOperation/StockOperationType';
import { type BaseStockOperationItemFormData } from '../../validation-schema';
import BatchNoSelector from '../input-components/batch-no-selector.component';
import StockItemForm from './stock-item-form.workspace';

vi.mock('../input-components/batch-no-selector.component', () => ({ default: vi.fn(() => null) }));
vi.mock('../input-components/quantity-uom-selector.component', () => ({ default: vi.fn(() => null) }));
vi.mock('../../../stock-items/stock-items.resource', () => ({
  useStockItem: vi.fn(() => ({ item: { drugName: 'Paracetamol' }, isLoading: false })),
}));

const operationType = (operationType: string, allowExpiredBatchNumbers: boolean) =>
  ({
    uuid: `${operationType}-uuid`,
    name: operationType,
    operationType,
    allowExpiredBatchNumbers,
  } as StockOperationType);

const item = { uuid: 'line-1', stockItemUuid: 'item-1' } as BaseStockOperationItemFormData;

describe('StockItemForm batch picker', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('lets a disposal pick expired batches', () => {
    render(<StockItemForm stockOperationType={operationType('disposed', true)} stockOperationItem={item} />);

    expect(vi.mocked(BatchNoSelector).mock.lastCall[0]).toEqual(
      expect.objectContaining({ stockItemUuid: 'item-1', includeExpiredBatches: true }),
    );
  });

  it('keeps expired batches out of a stock issue', () => {
    render(<StockItemForm stockOperationType={operationType('stockissue', false)} stockOperationItem={item} />);

    expect(vi.mocked(BatchNoSelector).mock.lastCall[0]).toEqual(
      expect.objectContaining({ stockItemUuid: 'item-1', includeExpiredBatches: false }),
    );
  });
});

describe('StockItemForm expiration date', () => {
  const expirationPicker = () => vi.mocked(OpenmrsDatePicker).mock.lastCall[0];
  // The form validates asynchronously, so its updates land after the change handler returns
  const pickExpiration = (date: Date | undefined) => act(async () => expirationPicker().onChange(date));
  const daysFromToday = (days: number) => {
    const date = new Date();
    return new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('starts the calendar tomorrow for a receipt', () => {
    render(<StockItemForm stockOperationType={operationType('receipt', false)} stockOperationItem={item} />);

    expect(expirationPicker()).toEqual(
      expect.objectContaining({ labelText: 'Expiration date', minDate: daysFromToday(1) }),
    );
  });

  it.each([
    ['today', 0],
    ['yesterday', -1],
  ])('rejects an expiration date of %s', async (_, days) => {
    const user = userEvent.setup();
    const onSave = vi.fn();
    render(
      <StockItemForm stockOperationType={operationType('receipt', false)} stockOperationItem={item} onSave={onSave} />,
    );

    await pickExpiration(daysFromToday(days));
    await user.click(screen.getByRole('button', { name: 'Save' }));

    expect(await screen.findByText('Expiration date must be after today')).toBeInTheDocument();
    expect(onSave).not.toHaveBeenCalled();
  });

  it('accepts an expiration date of tomorrow', async () => {
    const user = userEvent.setup();
    render(<StockItemForm stockOperationType={operationType('initial', false)} stockOperationItem={item} />);

    await pickExpiration(daysFromToday(1));
    await user.click(screen.getByRole('button', { name: 'Save' }));

    // The batch number is still missing, so the form has been validated once that error shows
    expect(await screen.findByText('Required')).toBeInTheDocument();
    expect(expirationPicker().invalid).toBe(false);
  });

  it('requires an expiration date again after it is cleared', async () => {
    const user = userEvent.setup();
    const onSave = vi.fn();
    render(
      <StockItemForm stockOperationType={operationType('receipt', false)} stockOperationItem={item} onSave={onSave} />,
    );

    await pickExpiration(daysFromToday(30));
    await pickExpiration(undefined);
    await user.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() => expect(expirationPicker().invalid).toBe(true));
    expect(onSave).not.toHaveBeenCalled();
  });

  it("doesn't show an expiration date for a disposal", () => {
    render(<StockItemForm stockOperationType={operationType('disposed', true)} stockOperationItem={item} />);

    expect(OpenmrsDatePicker).not.toHaveBeenCalled();
  });
});
