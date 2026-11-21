import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { deleteStockItemPackagingUnit } from '../../stock-items.resource';
import DeletePackagingUnitModal from './packaging-units-delete.modal';

vi.mock('../../stock-items.resource', () => ({
  deleteStockItemPackagingUnit: vi.fn(),
}));

const mockDelete = vi.mocked(deleteStockItemPackagingUnit);

const renderModal = () => {
  render(
    <DeletePackagingUnitModal
      closeModal={vi.fn()}
      onDeleted={vi.fn()}
      row={{ uuid: 'unit-uuid', packagingUomName: 'Dose pack' } as any}
    />,
  );
};

describe('DeletePackagingUnitModal', () => {
  beforeEach(() => {
    mockDelete.mockReturnValue(new Promise(() => {}));
  });

  it('fires exactly one DELETE even when the confirm button is clicked twice', async () => {
    renderModal();

    const reason = screen.getByLabelText(/reason/i);
    await userEvent.type(reason, 'no longer needed');
    const yes = screen.getByRole('button', { name: /yes/i });
    await userEvent.click(yes);
    await userEvent.click(yes);
    await userEvent.click(yes);

    await waitFor(() => expect(mockDelete).toHaveBeenCalledTimes(1));
    // both footer buttons are disabled while the request is in flight
    expect(yes).toBeDisabled();
    expect(screen.getByRole('button', { name: /no/i })).toBeDisabled();
  });
});
