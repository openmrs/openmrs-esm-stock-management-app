import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { showModal, useSession, userHasAccess } from '@openmrs/esm-framework';
import { type StockItemPackagingUOMDTO } from '../../../core/api/types/stockItem/StockItemPackagingUOM';
import PackagingUnits from './packaging-units.component';

vi.mock('../../stock-items.resource', () => ({
  useStockItemPackagingUomReferences: vi.fn().mockReturnValue({
    items: [],
    isLoading: false,
    error: null,
    mutate: vi.fn(),
  }),
}));

vi.mock('./packaging-units.resource', () => ({
  useStockItemPackageUnitsHook: vi.fn(),
}));

import { useStockItemPackageUnitsHook } from './packaging-units.resource';

const mockUseStockItemPackageUnitsHook = vi.mocked(useStockItemPackageUnitsHook);

const packagingUnits = [
  {
    uuid: 'unit-30',
    stockItemUuid: 'item-uuid',
    packagingUomName: 'Dose pack',
    factor: 30,
  },
  {
    uuid: 'unit-90',
    stockItemUuid: 'item-uuid',
    packagingUomName: 'Dose pack',
    factor: 90,
  },
] as Array<StockItemPackagingUOMDTO>;

describe('PackagingUnits', () => {
  beforeEach(() => {
    mockUseStockItemPackageUnitsHook.mockReturnValue({
      items: packagingUnits,
      totalCount: packagingUnits.length,
      isLoading: false,
      error: null,
      setStockItemUuid: vi.fn(),
      mutate: vi.fn(),
    });
    vi.mocked(useSession).mockReturnValue({
      authenticated: true,
      sessionId: 'session',
      user: { uuid: 'user-uuid', display: 'Test User' },
    } as any);
    vi.mocked(userHasAccess).mockReturnValue(true);
    vi.mocked(showModal).mockClear();
  });

  it('renders the saved units as a read-only list without an inline blank add row', () => {
    render(<PackagingUnits stockItemUuid="item-uuid" />);

    expect(screen.getAllByText('Dose pack').length).toBeGreaterThanOrEqual(2);
    // the pack size shows in the unit row and again in the selected unit's details panel
    expect(screen.getAllByText('30').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('90').length).toBeGreaterThanOrEqual(1);
    // no always-editable new row: the section offers a modal-opening button instead
    expect(screen.getByRole('button', { name: /add packaging unit/i })).toBeInTheDocument();
    expect(screen.queryByText(/choose a unit/i)).not.toBeInTheDocument();
  });

  it('opens the packaging unit modal to add a unit rather than rendering an editable row', async () => {
    const user = userEvent.setup();
    render(<PackagingUnits stockItemUuid="item-uuid" />);

    await user.click(screen.getByRole('button', { name: /add packaging unit/i }));

    expect(showModal).toHaveBeenCalledWith(
      'packaging-unit-form-modal',
      expect.objectContaining({ stockItemUuid: 'item-uuid', unit: null }),
    );
  });

  it('opens the packaging unit modal prefilled when editing a unit', async () => {
    const user = userEvent.setup();
    render(<PackagingUnits stockItemUuid="item-uuid" />);

    const editButtons = screen.getAllByRole('button', { name: /edit/i });
    await user.click(editButtons[0]);

    expect(showModal).toHaveBeenCalledWith(
      'packaging-unit-form-modal',
      expect.objectContaining({ stockItemUuid: 'item-uuid', unit: packagingUnits[0] }),
    );
  });

  it('hides mutation controls without the stock items mutate task', () => {
    vi.mocked(userHasAccess).mockReturnValue(false);
    render(<PackagingUnits stockItemUuid="item-uuid" />);

    expect(screen.queryByRole('button', { name: /add packaging unit/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /edit/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /delete/i })).not.toBeInTheDocument();
  });

  it('shows the reference count of each unit', () => {
    // the mocked references hook returns an empty list, so each row shows a 0 count
    render(<PackagingUnits stockItemUuid="item-uuid" />);

    expect(screen.getAllByText('0').length).toBeGreaterThanOrEqual(2);
  });
});
