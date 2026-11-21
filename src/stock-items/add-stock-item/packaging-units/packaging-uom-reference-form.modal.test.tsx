import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createStockItemPackagingUomReference, updateStockItemPackagingUomReference } from '../../stock-items.resource';
import { type StockItemPackagingUomReference } from '../../../core/api/types/stockItem/StockItemPackagingUomReference';
import PackagingUomReferenceFormModal from './packaging-uom-reference-form.modal';

vi.mock('../../stock-items.resource', () => ({
  createStockItemPackagingUomReference: vi.fn(),
  updateStockItemPackagingUomReference: vi.fn(),
}));

vi.mock('../../../stock-sources/stock-sources.resource', () => ({
  useStockSources: vi.fn().mockReturnValue({
    items: {
      results: [
        { uuid: 'nms-uuid', name: 'NMS' },
        { uuid: 'jms-uuid', name: 'JMS' },
      ],
    },
    isLoading: false,
    error: null,
  }),
}));

const mockCreateReference = vi.mocked(createStockItemPackagingUomReference);
const mockUpdateReference = vi.mocked(updateStockItemPackagingUomReference);

const existingReference: StockItemPackagingUomReference = {
  uuid: 'reference-uuid',
  referenceCode: 'M221680001EP30T',
  name: 'UNHTS packaging reference',
  description: 'Code for the 30-unit pack',
  stockSourceUuid: 'nms-uuid',
  stockSourceName: 'NMS',
  stockItemPackagingUomUuid: 'uom-uuid',
  voided: false,
};

const renderModal = (overrides: Record<string, unknown> = {}) => {
  const closeModal = vi.fn();
  const onSaved = vi.fn();
  render(
    <PackagingUomReferenceFormModal
      closeModal={closeModal}
      packagingUomUuid="uom-uuid"
      packagingUomLabel="Dose pack — 30"
      onSaved={onSaved}
      {...overrides}
    />,
  );
  return { closeModal, onSaved };
};

describe('PackagingUomReferenceFormModal', () => {
  beforeEach(() => {
    mockCreateReference.mockResolvedValue({ data: existingReference } as any);
    mockUpdateReference.mockResolvedValue({ data: existingReference } as any);
  });

  it('shows the stock source as immutable and the immutability notice when editing', () => {
    renderModal({ reference: existingReference });

    expect(screen.getByRole('combobox', { name: /stock source/i })).toBeDisabled();
    expect(screen.getByText(/packaging unit and stock source cannot be changed/i)).toBeInTheDocument();
    expect(screen.getByText(/affects source-specific lookup/i)).toBeInTheDocument();
  });

  it('sends only the updatable properties when editing an existing reference', async () => {
    const { closeModal, onSaved } = renderModal({ reference: existingReference });

    await userEvent.click(screen.getByRole('button', { name: /save changes/i }));

    await waitFor(() => expect(mockUpdateReference).toHaveBeenCalledTimes(1));
    expect(mockUpdateReference).toHaveBeenCalledWith('reference-uuid', {
      referenceCode: 'M221680001EP30T',
      name: 'UNHTS packaging reference',
      description: 'Code for the 30-unit pack',
    });
    expect(closeModal).toHaveBeenCalled();
    expect(onSaved).toHaveBeenCalled();
  });

  it('shows a duplicate rejection verbatim and keeps the entered values for correction', async () => {
    mockCreateReference.mockRejectedValue({
      responseBody: {
        error: {
          message:
            'Stock item packaging UOM reference code M221680001EP30T already exists for the given stock source (reference other-uuid)',
        },
      },
    });

    renderModal();

    await userEvent.type(screen.getByLabelText(/reference code/i), 'M221680001EP30T');
    // pick a stock source from the combobox
    const combobox = screen.getByRole('combobox', { name: /stock source/i });
    await userEvent.click(combobox);
    await userEvent.click(screen.getByRole('option', { name: 'NMS' }));

    await userEvent.click(screen.getByRole('button', { name: /add reference/i }));

    expect(await screen.findByText(/already exists for the given stock source/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/reference code/i)).toHaveValue('M221680001EP30T');
  });
});
