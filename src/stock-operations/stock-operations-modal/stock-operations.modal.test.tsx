import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { showSnackbar } from '@openmrs/esm-framework';
import StockOperationsModal from './stock-operations.modal';
import { executeStockOperationAction } from '../stock-operations.resource';
import { type StockOperationDTO } from '../../core/api/types/stockOperation/StockOperationDTO';

vi.mock('../stock-operations.resource', () => ({
  executeStockOperationAction: vi.fn().mockResolvedValue({}),
}));

vi.mock('../../utils', () => ({
  useHandleMutate: () => vi.fn(),
}));

describe('StockOperationsModal', () => {
  it('does not submit Cancel without a non-whitespace reason', async () => {
    const user = userEvent.setup();
    render(
      <StockOperationsModal
        title="Cancel"
        requireReason
        operation={{ uuid: 'operation-uuid' } as StockOperationDTO}
        closeModal={vi.fn()}
      />,
    );

    await user.type(screen.getByRole('textbox'), '   ');
    await user.click(screen.getByRole('button', { name: /cancel operation/i }));

    expect(screen.getByText('Enter a reason for cancelling this operation.')).toBeInTheDocument();
    expect(executeStockOperationAction).not.toHaveBeenCalled();

    await user.clear(screen.getByRole('textbox'));
    await user.type(screen.getByRole('textbox'), 'Duplicate request');
    await user.click(screen.getByRole('button', { name: /cancel operation/i }));

    await waitFor(() =>
      expect(executeStockOperationAction).toHaveBeenCalledWith({
        name: 'CANCEL',
        uuid: 'operation-uuid',
        reason: 'Duplicate request',
      }),
    );
    expect(showSnackbar).toHaveBeenCalledWith({
      title: 'Operation cancelled',
      subtitle: undefined,
      kind: 'success',
    });
  });

  it('dismisses the cancellation dialog without cancelling the operation when Keep operation is clicked', async () => {
    const user = userEvent.setup();
    const closeModal = vi.fn();
    render(
      <StockOperationsModal
        title="Cancel"
        requireReason
        operation={{ uuid: 'operation-uuid' } as StockOperationDTO}
        closeModal={closeModal}
      />,
    );

    expect(screen.getByRole('heading', { name: 'Cancel operation?' })).toBeInTheDocument();
    expect(screen.getByText('This operation will be marked as cancelled.')).toBeInTheDocument();
    await user.type(screen.getByRole('textbox', { name: 'Reason for cancellation (required)' }), 'Duplicate request');
    await user.click(screen.getByRole('button', { name: 'Keep operation' }));

    expect(closeModal).toHaveBeenCalledTimes(1);
    expect(executeStockOperationAction).not.toHaveBeenCalled();
  });

  it('submits without a reason when none is required', async () => {
    const user = userEvent.setup();
    render(
      <StockOperationsModal
        title="Approve"
        requireReason={false}
        operation={{ uuid: 'operation-uuid' } as StockOperationDTO}
        closeModal={vi.fn()}
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Approve' }));

    await waitFor(() =>
      expect(executeStockOperationAction).toHaveBeenCalledWith({
        name: 'APPROVE',
        uuid: 'operation-uuid',
        reason: '',
      }),
    );
  });

  it('uses a danger button named after the action for destructive actions', () => {
    render(
      <StockOperationsModal
        title="Reject"
        requireReason
        operation={{ uuid: 'operation-uuid' } as StockOperationDTO}
        closeModal={vi.fn()}
      />,
    );

    expect(screen.getByRole('button', { name: /reject/i })).toHaveClass('cds--btn--danger');
    expect(screen.queryByRole('button', { name: 'Submit' })).not.toBeInTheDocument();
  });

  it('uses a primary button for non-destructive actions', () => {
    render(
      <StockOperationsModal
        title="Approve"
        requireReason={false}
        operation={{ uuid: 'operation-uuid' } as StockOperationDTO}
        closeModal={vi.fn()}
      />,
    );

    expect(screen.getByRole('button', { name: 'Approve' })).toHaveClass('cds--btn--primary');
  });

  it('keeps the cancellation reason after an error and allows a successful retry', async () => {
    const user = userEvent.setup();
    const closeModal = vi.fn();
    vi.mocked(executeStockOperationAction).mockRejectedValueOnce({
      responseBody: { error: { message: 'Not allowed' } },
    });
    render(
      <StockOperationsModal
        title="Cancel"
        requireReason
        operation={{ uuid: 'operation-uuid' } as StockOperationDTO}
        closeModal={closeModal}
      />,
    );

    await user.type(screen.getByRole('textbox', { name: 'Reason for cancellation (required)' }), 'Duplicate request');
    await user.click(screen.getByRole('button', { name: /cancel operation/i }));

    await waitFor(() =>
      expect(showSnackbar).toHaveBeenCalledWith({
        title: 'Couldn’t cancel operation',
        subtitle: 'Details: Not allowed',
        kind: 'error',
      }),
    );
    expect(screen.getByRole('textbox')).toHaveValue('Duplicate request');
    expect(closeModal).not.toHaveBeenCalled();

    await user.click(screen.getByRole('button', { name: /cancel operation/i }));

    await waitFor(() => expect(closeModal).toHaveBeenCalledTimes(1));
    expect(executeStockOperationAction).toHaveBeenCalledTimes(2);
    expect(executeStockOperationAction).toHaveBeenLastCalledWith({
      name: 'CANCEL',
      uuid: 'operation-uuid',
      reason: 'Duplicate request',
    });
  });
});
