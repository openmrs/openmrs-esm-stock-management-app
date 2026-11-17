import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { useForm } from 'react-hook-form';
import { type StockItemDTO } from '../../../core/api/types/stockItem/StockItem';
import { useStockItem } from '../../stock-items.resource';
import { type StockItemFormData } from '../../validationSchema';
import StockItemUnitsEdit from './stock-item-units-edit.component';

vi.mock('../../stock-items.resource', () => ({
  useStockItem: vi.fn(),
}));

const mockUseStockItem = vi.mocked(useStockItem);

const packagingUnits = [
  {
    uuid: 'reorder-unit',
    stockItemUuid: 'item-uuid',
    packagingUomName: 'Box',
    factor: 10,
    isDefaultStockOperationsUoM: false,
    isDispensingUnit: false,
  },
  {
    uuid: 'purchase-unit',
    stockItemUuid: 'item-uuid',
    packagingUomName: 'Vial',
    factor: 1,
    isDefaultStockOperationsUoM: false,
    isDispensingUnit: false,
  },
];

const stockItem = {
  uuid: 'item-uuid',
  reorderLevel: 5,
  reorderLevelUoMUuid: 'reorder-unit',
  purchasePrice: 20,
  purchasePriceUoMUuid: 'purchase-unit',
  packagingUnits,
} as StockItemDTO;

const Harness = ({ item }: { item: StockItemDTO }) => {
  const { control, formState } = useForm<StockItemFormData>({ defaultValues: item as StockItemFormData });
  return <StockItemUnitsEdit stockItemUuid={item.uuid} control={control} formState={formState} />;
};

describe('StockItemUnitsEdit', () => {
  beforeEach(() => {
    mockUseStockItem.mockReturnValue({ isLoading: false, item: stockItem, error: undefined });
  });

  it('shows the saved reorder level unit rather than the purchase price unit', () => {
    render(<Harness item={stockItem} />);

    expect(screen.getByRole('combobox', { name: /reorder level packaging unit/i })).toHaveValue('Box - 10 ');
    expect(screen.getByRole('combobox', { name: /purchase price packaging unit/i })).toHaveValue('Vial - 1 ');
  });

  it('leaves the reorder level unit blank when no reorder unit is saved', () => {
    const itemWithoutReorderUnit = { ...stockItem, reorderLevelUoMUuid: null };
    mockUseStockItem.mockReturnValue({ isLoading: false, item: itemWithoutReorderUnit, error: undefined });

    render(<Harness item={itemWithoutReorderUnit} />);

    expect(screen.getByRole('combobox', { name: /reorder level packaging unit/i })).toHaveValue('');
  });
});
