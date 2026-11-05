import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { openmrsFetch } from '@openmrs/esm-framework';
import { type StockItemPackagingUOMDTO } from '../../../core/api/types/stockItem/StockItemPackagingUOM';
import { useStockItemPackageUnitsHook } from './packaging-units.resource';
import DeletePackagingUnitModal from './packaging-units-delete.modal';
import PackagingUnits from './packaging-units.component';

vi.mock('./packaging-units.resource', () => ({ useStockItemPackageUnitsHook: vi.fn() }));
vi.mock('../packaging-units-concept-selector/packaging-units-concept-selector.component', () => ({
  default: () => <div>Packaging unit selector</div>,
}));
vi.mock('../../../utils', () => ({ useHandleMutate: vi.fn(() => vi.fn()) }));

const savedUnit = {
  uuid: 'saved-unit-uuid',
  stockItemUuid: 'stock-item-uuid',
  packagingUomName: 'Box',
  factor: 10,
} as unknown as StockItemPackagingUOMDTO;

describe('Removing packaging units', () => {
  beforeEach(() => {
    vi.mocked(useStockItemPackageUnitsHook).mockReturnValue({
      items: [savedUnit],
      isLoading: false,
      setStockItemUuid: vi.fn(),
      mutate: vi.fn(),
    } as never);
    vi.mocked(openmrsFetch).mockResolvedValue({} as never);
  });

  it('only offers a delete action on saved packaging units, not the unsaved new row', () => {
    render(<PackagingUnits stockItemUuid="stock-item-uuid" handleTabChange={vi.fn()} />);

    expect(screen.getByText('Packaging unit selector')).toBeInTheDocument();
    // The delete button has no accessible name, so count it as the button that isn't Cancel or Save
    const otherButtons = screen.getAllByRole('button').filter((button) => !/cancel|save/i.test(button.textContent));
    expect(otherButtons).toHaveLength(1);
  });

  it('sends the typed reason, URL-encoded, with the delete request', async () => {
    const user = userEvent.setup();
    const closeModal = vi.fn();
    render(<DeletePackagingUnitModal row={savedUnit} closeModal={closeModal} />);

    await user.type(screen.getByRole('textbox'), 'Entered & saved by mistake');
    await user.click(screen.getByText('Yes'));

    await waitFor(() => expect(closeModal).toHaveBeenCalled());
    expect(openmrsFetch).toHaveBeenCalledWith(
      expect.stringMatching(/\/stockitempackaginguom\/saved-unit-uuid\?reason=Entered%20%26%20saved%20by%20mistake$/),
      expect.objectContaining({ method: 'DELETE' }),
    );
  });
});
