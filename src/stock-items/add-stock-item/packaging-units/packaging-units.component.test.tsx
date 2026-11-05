import React from 'react';
import { render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import PackagingUnits from './packaging-units.component';

vi.mock('./packaging-units.resource', () => {
  const items = [
    {
      uuid: 'saved-unit',
      packagingUomName: 'Box',
      packagingUomUuid: 'uom-1',
      factor: 10,
      stockItemUuid: 'stock-item-uuid',
    },
  ];

  return {
    useStockItemPackageUnitsHook: () => ({
      items,
      isLoading: false,
      setStockItemUuid: vi.fn(),
      mutate: vi.fn(),
    }),
  };
});

vi.mock('../../stock-items.resource', () => ({
  createStockItemPackagingUnit: vi.fn(),
  updateStockItemPackagingUnit: vi.fn(),
}));

vi.mock('../../../utils', () => ({
  useHandleMutate: () => vi.fn(),
}));

vi.mock('../packaging-units-concept-selector/packaging-units-concept-selector.component', () => ({
  default: () => <div>New packaging unit</div>,
}));

describe('PackagingUnits', () => {
  it('shows a delete action only for saved packaging units', () => {
    render(<PackagingUnits stockItemUuid="stock-item-uuid" handleTabChange={vi.fn()} />);

    const [, savedRow, newRow] = screen.getAllByRole('row');

    expect(within(savedRow).getByRole('button')).toBeInTheDocument();
    expect(within(newRow).queryByRole('button')).not.toBeInTheDocument();
    expect(screen.getByText('New packaging unit')).toBeInTheDocument();
  });
});
