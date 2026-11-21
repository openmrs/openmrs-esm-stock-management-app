import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createStockItemPackagingUnit, updateStockItemPackagingUnit } from '../../stock-items.resource';
import PackagingUnitFormModal, { type PackagingUnitModalSession } from './packaging-unit-form.modal';

vi.mock('../../stock-items.resource', () => ({
  createStockItemPackagingUnit: vi.fn(),
  updateStockItemPackagingUnit: vi.fn(),
  createStockItemPackagingUomReference: vi.fn(),
  updateStockItemPackagingUomReference: vi.fn(),
  voidStockItemPackagingUomReference: vi.fn(),
  useStockItemPackagingUomReferences: vi.fn().mockReturnValue({
    items: [],
    isLoading: false,
    error: null,
    mutate: vi.fn(),
  }),
}));

// the concept selector pulls config-driven concept lookups; the modal tests stub it out
vi.mock('../packaging-units-concept-selector/packaging-units-concept-selector.component', () => ({
  default: () => <div data-testid="concept-selector-stub" />,
}));

const mockCreateUnit = vi.mocked(createStockItemPackagingUnit);
const mockUpdateUnit = vi.mocked(updateStockItemPackagingUnit);

const stagedSession: PackagingUnitModalSession = {
  persistedUnitUuid: null,
  packagingUomUuid: 'dose-pack-concept-uuid',
  packagingUomName: 'Dose pack',
  factor: 30,
};

const renderModal = (overrides: Record<string, unknown> = {}) => {
  const onSaved = vi.fn();
  const onDismiss = vi.fn();
  const closeModal = vi.fn();
  render(
    <PackagingUnitFormModal
      closeModal={closeModal}
      stockItemUuid="item-uuid"
      unit={null}
      stagedSession={stagedSession}
      onSaved={onSaved}
      onDismiss={onDismiss}
      {...overrides}
    />,
  );
  return { onSaved, onDismiss, closeModal };
};

describe('PackagingUnitFormModal', () => {
  beforeEach(() => {
    mockCreateUnit.mockResolvedValue({
      data: { uuid: 'new-unit-uuid', factor: 30, packagingUomName: 'Dose pack' },
    } as any);
  });

  it('creates the unit with the entered values and closes on success', async () => {
    const { onSaved, closeModal } = renderModal();

    await userEvent.click(screen.getByRole('button', { name: /create packaging unit/i }));

    await waitFor(() => expect(mockCreateUnit).toHaveBeenCalledTimes(1));
    expect(mockCreateUnit).toHaveBeenCalledWith({
      factor: 30,
      packagingUomUuid: 'dose-pack-concept-uuid',
      stockItemUuid: 'item-uuid',
    });
    await waitFor(() => {
      expect(onSaved).toHaveBeenCalled();
      expect(closeModal).toHaveBeenCalled();
    });
  });

  it('stays open with an error when the create response carries no uuid', async () => {
    // without the new UUID the modal cannot mark the unit persisted; saving again
    // would create it a second time, so the response must be surfaced as an error
    mockCreateUnit.mockResolvedValue({ data: {} } as any);
    const { onSaved, closeModal } = renderModal();

    await userEvent.click(screen.getByRole('button', { name: /create packaging unit/i }));

    expect(await screen.findByText(/identifier was missing from the response/i)).toBeInTheDocument();
    expect(onSaved).not.toHaveBeenCalled();
    expect(closeModal).not.toHaveBeenCalled();
  });

  it('shows the backend error verbatim and stays open when creation fails', async () => {
    mockCreateUnit.mockRejectedValue({
      responseBody: { error: { message: 'Pack size must be greater than zero' } },
    });
    const { onSaved, closeModal } = renderModal();

    await userEvent.click(screen.getByRole('button', { name: /create packaging unit/i }));

    expect(await screen.findByText(/pack size must be greater than zero/i)).toBeInTheDocument();
    expect(onSaved).not.toHaveBeenCalled();
    expect(closeModal).not.toHaveBeenCalled();
  });

  it('updates an existing unit instead of re-creating it, and only when values changed', async () => {
    renderModal({
      unit: {
        uuid: 'unit-30',
        stockItemUuid: 'item-uuid',
        packagingUomUuid: 'dose-pack-concept-uuid',
        packagingUomName: 'Dose pack',
        factor: 10,
      },
      stagedSession: { ...stagedSession, persistedUnitUuid: 'unit-30', factor: 30 },
    });

    await userEvent.click(screen.getByRole('button', { name: /save packaging unit/i }));

    await waitFor(() => expect(mockUpdateUnit).toHaveBeenCalledTimes(1));
    expect(mockCreateUnit).not.toHaveBeenCalled();
    expect(mockUpdateUnit).toHaveBeenCalledWith(expect.objectContaining({ factor: 30 }), 'unit-30');
  });

  it('sends nothing when saving an existing unit without changes', async () => {
    renderModal({
      unit: {
        uuid: 'unit-30',
        stockItemUuid: 'item-uuid',
        packagingUomUuid: 'dose-pack-concept-uuid',
        packagingUomName: 'Dose pack',
        factor: 30,
      },
      stagedSession: { ...stagedSession, persistedUnitUuid: 'unit-30' },
    });

    await userEvent.click(screen.getByRole('button', { name: /save packaging unit/i }));

    await waitFor(() => expect(mockUpdateUnit).not.toHaveBeenCalled());
    expect(mockCreateUnit).not.toHaveBeenCalled();
  });

  it('returns the staged session on cancel so unsaved values survive dismissal', async () => {
    const { onDismiss, closeModal } = renderModal();

    await userEvent.click(screen.getByRole('button', { name: /cancel/i }));

    expect(onDismiss).toHaveBeenCalledWith(
      expect.objectContaining({
        persistedUnitUuid: null,
        packagingUomUuid: 'dose-pack-concept-uuid',
        factor: 30,
      }),
    );
    expect(closeModal).toHaveBeenCalled();
  });

  it('renders field errors instead of failing silently when saving empty', async () => {
    // validation used to run through form.trigger() with no resolver, which validated
    // nothing: clicking Create with empty fields did nothing and showed no errors
    renderModal({
      stagedSession: { persistedUnitUuid: null, packagingUomUuid: null, packagingUomName: '', factor: '' },
    });

    await userEvent.click(screen.getByRole('button', { name: /create packaging unit/i }));

    await waitFor(() => expect(mockCreateUnit).not.toHaveBeenCalled());
    expect(await screen.findByText(/pack size must be greater than zero/i)).toBeInTheDocument();
  });

  it('renders only the unit fields — references live in their own section', () => {
    renderModal();

    expect(screen.getByTestId('concept-selector-stub')).toBeInTheDocument();
    expect(screen.queryByText(/external references/i)).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /add reference/i })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /create packaging unit/i })).toBeInTheDocument();
  });
});
