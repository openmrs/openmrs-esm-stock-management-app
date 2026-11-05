import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import StockOperationsModal from './stock-operations.modal';
import { executeStockOperationAction } from '../stock-operations.resource';

vi.mock('../stock-operations.resource', () => ({
  executeStockOperationAction: vi.fn(),
}));

vi.mock('@openmrs/esm-framework', () => ({
  getCoreTranslation: () => 'Cancel',
  restBaseUrl: '/ws/rest/v1',
  showSnackbar: vi.fn(),
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
        operation={{ uuid: 'operation-uuid' } as any}
        closeModal={vi.fn()}
      />,
    );

    await user.type(screen.getByRole('textbox'), '   ');
    await user.click(screen.getByRole('button', { name: 'Submit' }));

    expect(screen.getByText('Required')).toBeInTheDocument();
    expect(executeStockOperationAction).not.toHaveBeenCalled();
  });
});
