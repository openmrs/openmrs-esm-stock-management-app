import React from 'react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import userEvent from '@testing-library/user-event';
import { render, screen, waitFor } from '@testing-library/react';
import { type FetchResponse, showModal, showSnackbar, useWorkspace2Context } from '@openmrs/esm-framework';
import { deleteStockRule } from '../../stock-items.resource';
import { type StockRule } from '../../../core/api/types/stockItem/StockRule';
import StockRuleActionsMenu from './stock-rule-actions-menu.component';

vi.mock('../../stock-items.resource', () => ({
  deleteStockRule: vi.fn(),
}));

const mockShowModal = vi.mocked(showModal);
const mockShowSnackbar = vi.mocked(showSnackbar);
const mockUseWorkspace2Context = vi.mocked(useWorkspace2Context);
const mockDeleteStockRule = vi.mocked(deleteStockRule);
const mockLaunchChildWorkspace = vi.fn();

const stockRule: StockRule = {
  uuid: 'rule-uuid',
  stockItemUuid: 'item-uuid',
  name: 'Low stock alert',
  description: '',
  locationUuid: 'location-uuid',
  locationName: 'Main pharmacy',
  quantity: 30,
  stockItemPackagingUOMUuid: 'packaging-uom-uuid',
  packagingUomName: 'Box',
  enabled: true,
  evaluationFrequency: 60,
  lastEvaluation: new Date('2025-01-01T00:00:00Z'),
  nextEvaluation: new Date('2025-01-02T00:00:00Z'),
  lastActionDate: new Date('2025-01-01T00:00:00Z'),
  actionFrequency: 3600,
  alertRole: null,
  mailRole: null,
  permission: {
    canView: true,
    canEdit: true,
    canApprove: false,
    canReceiveItems: false,
    canDisplayReceivedItems: false,
    isRequisitionAndCanIssueStock: false,
    canUpdateBatchInformation: false,
  },
  enableDescendants: false,
};

// Carbon's OverflowMenu renders its items into a floating-menu portal that jsdom never
// finishes positioning, so it stays `visibility: hidden` even once mounted and open.
// `{ hidden: true }` makes role queries include it, but per the ARIA accname spec, a
// hidden element's accessible *name* still computes to "", so `name` matchers never
// match. Matching on `textContent` instead sidesteps that and reaches the real item.
const getMenuItem = (text: string) => {
  const item = screen.getAllByRole('menuitem', { hidden: true }).find((el) => el.textContent?.includes(text));
  if (!item) {
    throw new Error(`Could not find a menu item containing "${text}"`);
  }
  return item;
};

describe('StockRuleActionsMenu', () => {
  beforeEach(() => {
    mockUseWorkspace2Context.mockReturnValue({
      launchChildWorkspace: mockLaunchChildWorkspace,
    } as unknown as ReturnType<typeof useWorkspace2Context>);
  });

  const openMenu = async () => {
    const user = userEvent.setup();
    render(<StockRuleActionsMenu data={stockRule} stockItemUuid={stockRule.stockItemUuid} />);
    await user.click(screen.getByRole('button', { name: /stock rule actions/i }));
    await screen.findAllByRole('menuitem', { hidden: true });
    return user;
  };

  it('opens the menu and shows the Edit and Delete actions', async () => {
    await openMenu();

    expect(getMenuItem('Edit Stock Rule')).toBeInTheDocument();
    expect(getMenuItem('Delete Rule')).toBeInTheDocument();
  });

  it('launches the edit workspace with the selected rule when Edit is clicked', async () => {
    const user = await openMenu();

    await user.click(getMenuItem('Edit Stock Rule'));

    expect(mockLaunchChildWorkspace).toHaveBeenCalledWith('stock-item-rules-form-workspace', {
      stockItemUuid: stockRule.stockItemUuid,
      model: stockRule,
    });
  });

  it('waits for confirmation before deleting the rule', async () => {
    const user = await openMenu();

    await user.click(getMenuItem('Delete Rule'));

    expect(mockShowModal).toHaveBeenCalledWith(
      'delete-stock-rule-modal',
      expect.objectContaining({
        uuid: stockRule.uuid,
        close: expect.any(Function),
        onConfirmation: expect.any(Function),
      }),
    );
    expect(mockDeleteStockRule).not.toHaveBeenCalled();
  });

  it('deletes the rule and shows a success message once confirmed', async () => {
    mockDeleteStockRule.mockResolvedValueOnce({} as FetchResponse<unknown>);
    mockShowModal.mockReturnValueOnce(vi.fn());
    const user = await openMenu();

    await user.click(getMenuItem('Delete Rule'));
    const { onConfirmation } = mockShowModal.mock.calls[0][1] as { onConfirmation: () => void };
    onConfirmation();

    await waitFor(() => {
      expect(mockDeleteStockRule).toHaveBeenCalledWith(stockRule.uuid);
    });
    await waitFor(() => {
      expect(mockShowSnackbar).toHaveBeenCalledWith(expect.objectContaining({ kind: 'success' }));
    });
    expect(await screen.findByRole('button', { name: /stock rule actions/i })).toBeInTheDocument();
  });

  it('restores the menu and shows an error message after a failed delete request', async () => {
    mockDeleteStockRule.mockRejectedValueOnce(new Error('Deletion failed'));
    mockShowModal.mockReturnValueOnce(vi.fn());
    const user = await openMenu();

    await user.click(getMenuItem('Delete Rule'));
    const { onConfirmation } = mockShowModal.mock.calls[0][1] as { onConfirmation: () => void };
    onConfirmation();

    await waitFor(() => {
      expect(mockDeleteStockRule).toHaveBeenCalledWith(stockRule.uuid);
    });
    await waitFor(() => {
      expect(mockShowSnackbar).toHaveBeenCalledWith(
        expect.objectContaining({ kind: 'error', title: 'Error deleting a rule' }),
      );
    });

    // The menu is usable again rather than being stuck on the loading state.
    expect(await screen.findByRole('button', { name: /stock rule actions/i })).toBeInTheDocument();
  });
});
