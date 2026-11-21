import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { voidStockItemPackagingUomReference } from '../../stock-items.resource';
import { type StockItemPackagingUomReference } from '../../../core/api/types/stockItem/StockItemPackagingUomReference';
import PackagingUomReferenceVoidModal from './packaging-uom-reference-void.modal';

vi.mock('../../stock-items.resource', () => ({
  voidStockItemPackagingUomReference: vi.fn(),
}));

const mockVoidReference = vi.mocked(voidStockItemPackagingUomReference);

const reference: StockItemPackagingUomReference = {
  uuid: 'reference-uuid',
  referenceCode: 'M221680001EP30T',
  name: 'UNHTS packaging reference',
  description: null,
  stockSourceUuid: 'nms-uuid',
  stockSourceName: 'NMS',
  stockItemPackagingUomUuid: 'uom-uuid',
  voided: false,
};

const renderModal = (overrides: Record<string, unknown> = {}) => {
  const closeModal = vi.fn();
  const onVoided = vi.fn();
  render(
    <PackagingUomReferenceVoidModal closeModal={closeModal} reference={reference} onVoided={onVoided} {...overrides} />,
  );
  return { closeModal, onVoided };
};

describe('PackagingUomReferenceVoidModal', () => {
  beforeEach(() => {
    mockVoidReference.mockResolvedValue({} as any);
  });

  it('requires a reason before voiding', async () => {
    const { closeModal } = renderModal();

    await userEvent.click(screen.getByRole('button', { name: /void reference/i }));

    expect(await screen.findByText(/a reason is required/i)).toBeInTheDocument();
    expect(mockVoidReference).not.toHaveBeenCalled();
    expect(closeModal).not.toHaveBeenCalled();
  });

  it('caps the reason at 250 characters through the text area counter', async () => {
    renderModal();

    const reasonField = screen.getByLabelText(/reason for voiding/i);
    await userEvent.type(reasonField, 'R'.repeat(251));
    // Carbon truncates at maxCount, so the impossible request can never be sent
    expect(reasonField).toHaveValue('R'.repeat(250));
    await userEvent.click(screen.getByRole('button', { name: /void reference/i }));

    await waitFor(() => expect(mockVoidReference).toHaveBeenCalledWith('reference-uuid', 'R'.repeat(250)));
  });

  it('voids with the url-encoded reason and refreshes via onVoided', async () => {
    const { closeModal, onVoided } = renderModal();

    await userEvent.type(screen.getByLabelText(/reason for voiding/i), 'Superseded by supplier code');
    await userEvent.click(screen.getByRole('button', { name: /void reference/i }));

    await waitFor(() => expect(mockVoidReference).toHaveBeenCalledTimes(1));
    expect(mockVoidReference).toHaveBeenCalledWith('reference-uuid', 'Superseded by supplier code');
    await waitFor(() => {
      expect(onVoided).toHaveBeenCalledWith(reference);
      expect(closeModal).toHaveBeenCalled();
    });
  });

  it('shows the backend error verbatim and keeps the modal open on failure', async () => {
    mockVoidReference.mockRejectedValue({
      responseBody: { error: { message: 'Unable to void stock item packaging UOM reference' } },
    });
    const { closeModal } = renderModal();

    await userEvent.type(screen.getByLabelText(/reason for voiding/i), 'Superseded by supplier code');
    await userEvent.click(screen.getByRole('button', { name: /void reference/i }));

    expect(await screen.findByText(/unable to void stock item packaging uom reference/i)).toBeInTheDocument();
    expect(closeModal).not.toHaveBeenCalled();
  });
});
