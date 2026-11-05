import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import userEvent from '@testing-library/user-event';
import { render, screen, within } from '@testing-library/react';
import { FormProvider, useForm, type UseFormReturn } from 'react-hook-form';
import { requisitionOperationTypeMock } from '@mocks';
import { type StockOperationType } from '../../../core/api/types/stockOperation/StockOperationType';
import { type StockOperationItemDtoSchema } from '../../validation-schema';
import StockOperationItemsFormStep from './stock-operation-items-form-step.component';

vi.mock('../input-components/stock-item-search.component', () => ({
  default: () => <div>stock item search</div>,
}));
vi.mock('./stock-operation-item-cell.component', () => ({
  default: ({ stockItemUuid }: { stockItemUuid: string }) => <span>{stockItemUuid}</span>,
}));
vi.mock('./stock-availability-cell.component', () => ({ default: () => <span>availability</span> }));
vi.mock('./quantity-uom-cell.component', () => ({ default: () => <span>uom</span> }));
vi.mock('./stock-operation-item-batch-no-cell.component', () => ({ default: () => <span>batch</span> }));
vi.mock('./stock-operation-item-expiry-cell.component', () => ({ default: () => <span>expiry</span> }));

const items = [
  { uuid: 'item-1-uuid', stockItemUuid: 'stock-item-a', quantity: 10, stockItemPackagingUOMUuid: 'uom-1' },
  { uuid: 'new-item-2', stockItemUuid: 'stock-item-b', quantity: 20, stockItemPackagingUOMUuid: 'uom-1' },
  { uuid: 'item-3-uuid', stockItemUuid: 'stock-item-c', quantity: 30, stockItemPackagingUOMUuid: 'uom-1' },
];

let formRef: UseFormReturn<StockOperationItemDtoSchema>;

const Wrapper: React.FC<{ onLaunchItemsForm: () => void }> = ({ onLaunchItemsForm }) => {
  const form = useForm<StockOperationItemDtoSchema>({
    defaultValues: { stockOperationItems: items } as unknown as StockOperationItemDtoSchema,
  });
  formRef = form;
  return (
    <FormProvider {...form}>
      <StockOperationItemsFormStep
        stockOperationType={requisitionOperationTypeMock as unknown as StockOperationType}
        onLaunchItemsForm={onLaunchItemsForm}
      />
    </FormProvider>
  );
};

const getRow = (stockItemUuid: string) =>
  screen.getAllByRole('row').find((row) => within(row).queryByText(stockItemUuid));

describe('StockOperationItemsFormStep', () => {
  it('removes only the clicked line when Delete is pressed', async () => {
    const user = userEvent.setup();
    const onLaunchItemsForm = vi.fn();
    render(<Wrapper onLaunchItemsForm={onLaunchItemsForm} />);

    expect(screen.getByText('stock-item-a')).toBeInTheDocument();
    expect(screen.getByText('stock-item-b')).toBeInTheDocument();
    expect(screen.getByText('stock-item-c')).toBeInTheDocument();

    await user.click(within(getRow('stock-item-b')).getByLabelText('Delete'));

    expect(screen.queryByText('stock-item-b')).not.toBeInTheDocument();
    expect(screen.getByText('stock-item-a')).toBeInTheDocument();
    expect(screen.getByText('stock-item-c')).toBeInTheDocument();
    expect(formRef.getValues('stockOperationItems').map((item) => item.uuid)).toEqual(['item-1-uuid', 'item-3-uuid']);
    expect(onLaunchItemsForm).not.toHaveBeenCalled();
  });

  it('opens the item form for the clicked line when Edit is pressed', async () => {
    const user = userEvent.setup();
    const onLaunchItemsForm = vi.fn();
    render(<Wrapper onLaunchItemsForm={onLaunchItemsForm} />);

    await user.click(within(getRow('stock-item-c')).getByLabelText('Edit'));

    expect(onLaunchItemsForm).toHaveBeenCalledTimes(1);
    expect(onLaunchItemsForm).toHaveBeenCalledWith(expect.objectContaining({ uuid: 'item-3-uuid' }));
    expect(formRef.getValues('stockOperationItems')).toHaveLength(3);
  });
});
