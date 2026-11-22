import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FormProvider, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { showSnackbar } from '@openmrs/esm-framework';
import StockOperationSubmissionFormStep from './stock-operation-submission-form-step.component';
import { launchStockOperationsModal } from '../../stock-operation.utils';
import { updateStockOperation } from '../../stock-operations.resource';
import { type StockOperationDTO } from '../../../core/api/types/stockOperation/StockOperationDTO';
import { type StockOperationType } from '../../../core/api/types/stockOperation/StockOperationType';
import { type RecordPermission } from '../../../core/api/types/RecordPermission';

vi.mock('../../stock-operation.utils', () => ({ launchStockOperationsModal: vi.fn() }));
vi.mock('../../stock-operations.resource', () => ({
  updateStockOperation: vi.fn(),
  createStockOperation: vi.fn(),
  deleteStockOperationItem: vi.fn(),
}));
vi.mock('../../../utils', () => ({ useHandleMutate: () => vi.fn() }));

const schema = z.object({
  responsiblePersonUuid: z.string().min(1),
  stockOperationItems: z.array(z.object({ uuid: z.string() })),
});

function Operation({
  type,
  approval,
  valid,
  status = 'NEW',
  permission = { canEdit: true },
  unsaved = false,
}: {
  type: string;
  approval: boolean;
  valid: boolean;
  status?: StockOperationDTO['status'];
  permission?: Partial<RecordPermission> | null;
  unsaved?: boolean;
}) {
  const form = useForm({
    defaultValues: { responsiblePersonUuid: valid ? 'responsible-person' : '', stockOperationItems: [] },
    resolver: zodResolver(schema),
  });
  return (
    <FormProvider {...form}>
      <StockOperationSubmissionFormStep
        stockOperation={
          unsaved
            ? undefined
            : ({ uuid: 'operation-being-edited', status, approvalRequired: approval, permission } as StockOperationDTO)
        }
        stockOperationType={{ operationType: type } as StockOperationType}
      />
    </FormProvider>
  );
}

const actions = [
  { type: 'receipt', approval: false, label: 'Complete', title: 'Complete', status: 'COMPLETED' },
  { type: 'receipt', approval: true, label: 'Submit For Review', title: 'Submit', status: 'SUBMITTED' },
  { type: 'stockissue', approval: false, label: 'Dispatch', title: 'Dispatch', status: 'DISPATCHED' },
];

beforeEach(() => vi.resetAllMocks());

describe('operation identity after validation and save', () => {
  it.each(actions)('$title does not open a confirmation when validation fails', async ({ type, approval, label }) => {
    render(<Operation type={type} approval={approval} valid={false} />);
    await userEvent.click(screen.getByRole('button', { name: label }));
    expect(updateStockOperation).not.toHaveBeenCalled();
    expect(launchStockOperationsModal).not.toHaveBeenCalled();
  });

  it.each(actions)(
    '$title uses the identity returned by the save',
    async ({ type, approval, label, title, status }) => {
      const saved = { uuid: 'saved-operation', status: 'NEW' };
      vi.mocked(updateStockOperation).mockResolvedValue({ data: saved } as never);
      render(<Operation type={type} approval={approval} valid />);
      await userEvent.click(screen.getByRole('button', { name: label }));
      await waitFor(() => expect(launchStockOperationsModal).toHaveBeenCalledWith(title, false, { ...saved, status }));
    },
  );

  it.each(actions.flatMap((action) => [undefined, '', ' \t'].map((uuid) => ({ ...action, uuid }))))(
    '$title does not open a confirmation when the saved UUID is [$uuid]',
    async ({ type, approval, label, uuid }) => {
      vi.mocked(updateStockOperation).mockResolvedValue({ data: { uuid } } as never);
      render(<Operation type={type} approval={approval} valid />);
      await userEvent.click(screen.getByRole('button', { name: label }));
      await waitFor(() => expect(updateStockOperation).toHaveBeenCalled());
      expect(launchStockOperationsModal).not.toHaveBeenCalled();
    },
  );

  it.each(actions)('$title does not open a confirmation when saving fails', async ({ type, approval, label }) => {
    vi.mocked(updateStockOperation).mockRejectedValue(new Error('Save rejected'));
    render(<Operation type={type} approval={approval} valid />);
    await userEvent.click(screen.getByRole('button', { name: label }));
    await waitFor(() => expect(showSnackbar).toHaveBeenCalledWith(expect.objectContaining({ kind: 'error' })));
    expect(launchStockOperationsModal).not.toHaveBeenCalled();
    expect(await screen.findByRole('button', { name: 'Save' })).toBeEnabled();
  });
});

describe('editing by permission', () => {
  it.each(['NEW', 'RETURNED'] as const)('shows the save and submit buttons for an editable %s operation', (status) => {
    render(<Operation type="receipt" approval valid status={status} />);
    expect(screen.getByRole('button', { name: 'Submit For Review' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Save' })).toBeInTheDocument();
  });

  it('shows the save button for a new, unsaved operation', () => {
    render(<Operation type="receipt" approval valid unsaved />);
    expect(screen.getByRole('button', { name: 'Save' })).toBeInTheDocument();
  });

  it.each(['NEW', 'RETURNED', 'SUBMITTED', 'DISPATCHED', 'COMPLETED', 'CANCELLED', 'REJECTED'] as const)(
    'keeps a %s operation locked when the user cannot edit it',
    (status) => {
      render(<Operation type="receipt" approval valid status={status} permission={{ canEdit: false }} />);
      expect(screen.queryByRole('button', { name: 'Submit For Review' })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'Save' })).not.toBeInTheDocument();
    },
  );

  it('keeps an operation locked when the permission is missing', () => {
    render(<Operation type="receipt" approval valid permission={null} />);
    expect(screen.queryByRole('button', { name: 'Submit For Review' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Save' })).not.toBeInTheDocument();
  });

  it('resubmits a RETURNED operation for review', async () => {
    const saved = { uuid: 'saved-operation', status: 'RETURNED' };
    vi.mocked(updateStockOperation).mockResolvedValue({ data: saved } as never);
    render(<Operation type="receipt" approval valid status="RETURNED" />);
    await userEvent.click(screen.getByRole('button', { name: 'Submit For Review' }));
    await waitFor(() =>
      expect(launchStockOperationsModal).toHaveBeenCalledWith('Submit', false, { ...saved, status: 'SUBMITTED' }),
    );
  });
});
