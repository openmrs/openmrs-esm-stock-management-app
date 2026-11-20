import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import userEvent from '@testing-library/user-event';
import { render, screen, waitFor } from '@testing-library/react';
import { type FetchResponse, showSnackbar, useConfig } from '@openmrs/esm-framework';
import { type Concept } from '../../../core/api/types/concept/Concept';
import { type Drug } from '../../../core/api/types/concept/Drug';
import { type StockItemDTO } from '../../../core/api/types/stockItem/StockItem';
import { createStockItem, fetchStockItem } from '../../stock-items.resource';
import { useConcept, useConcepts } from '../../../stock-lookups/stock-lookups.resource';
import { useStockSources } from '../../../stock-sources/stock-sources.resource';
import { useDrugsHook } from '../drug-selector/drug-selector.resource';
import { launchAddOrEditStockItemWorkspace } from '../../stock-item.utils';
import StockItemDetails from './stock-item-details.component';

vi.mock('../../stock-items.resource', () => ({
  createStockItem: vi.fn(),
  updateStockItem: vi.fn(),
  fetchStockItem: vi.fn(),
}));
vi.mock('../../../stock-lookups/stock-lookups.resource', () => ({
  useConcept: vi.fn(),
  useConcepts: vi.fn(),
}));
vi.mock('../../../stock-sources/stock-sources.resource', () => ({
  useStockSources: vi.fn(),
}));
vi.mock('../drug-selector/drug-selector.resource', () => ({
  useDrugsHook: vi.fn(),
}));
vi.mock('../../stock-item.utils', () => ({
  launchAddOrEditStockItemWorkspace: vi.fn(),
}));
vi.mock('../../../utils', () => ({
  useHandleMutate: () => vi.fn(),
}));

const mockCreateStockItem = vi.mocked(createStockItem);
const mockFetchStockItem = vi.mocked(fetchStockItem);
const mockUseConcept = vi.mocked(useConcept);
const mockUseConcepts = vi.mocked(useConcepts);
const mockUseStockSources = vi.mocked(useStockSources);
const mockUseDrugsHook = vi.mocked(useDrugsHook);
const mockUseConfig = vi.mocked(useConfig);
const mockLaunchWorkspace = vi.mocked(launchAddOrEditStockItemWorkspace);
const mockShowSnackbar = vi.mocked(showSnackbar);

const categories = [{ uuid: 'category-medical-supplies', display: 'Medical supplies' }] as Concept[];
const dispensingUnits = [{ uuid: 'unit-tablet', display: 'Tablet' }] as Concept[];

async function selectComboBoxItem(user: ReturnType<typeof userEvent.setup>, name: RegExp, item: string) {
  await user.click(screen.getByRole('combobox', { name }));
  await user.click(await screen.findByText(item));
}

describe('StockItemDetails', () => {
  const handleTabChange = vi.fn();

  beforeEach(() => {
    mockUseConfig.mockReturnValue({
      stockItemCategoryUUID: 'category-concept',
      packingUnitsUUID: 'packing-units-concept',
    });
    mockUseConcept.mockImplementation(
      (uuid: string) =>
        ({
          items: { answers: uuid === 'category-concept' ? categories : dispensingUnits },
          isLoading: false,
        } as ReturnType<typeof useConcept>),
    );
    mockUseConcepts.mockReturnValue({
      items: { results: [{ uuid: 'concept-gloves', display: 'Gloves' }] as Concept[] },
      isLoading: false,
    } as ReturnType<typeof useConcepts>);
    mockUseStockSources.mockReturnValue({
      items: { results: [{ uuid: 'source-kemsa', name: 'KEMSA' }] },
      isLoading: false,
    } as ReturnType<typeof useStockSources>);
    mockUseDrugsHook.mockReturnValue({
      drugList: [{ uuid: 'drug-paracetamol', name: 'Paracetamol 500mg' }] as Drug[],
      isLoading: false,
    });
    mockFetchStockItem.mockResolvedValue({ results: [] });
    mockCreateStockItem.mockImplementation((item) =>
      Promise.resolve({ data: { ...item, uuid: 'new-item' } } as unknown as FetchResponse<StockItemDTO>),
    );
  });

  it('creates a non-drug item from the filled form', async () => {
    const user = userEvent.setup();
    render(<StockItemDetails handleTabChange={handleTabChange} />);

    await user.click(screen.getByRole('radio', { name: 'Non Pharmaceuticals' }));
    await selectComboBoxItem(user, /please specify/i, 'Gloves');
    await user.type(screen.getByRole('textbox', { name: /common name/i }), 'Surgical gloves');
    await user.type(screen.getByRole('textbox', { name: /abbreviation/i }), 'GLV');
    await user.click(screen.getByRole('radio', { name: 'Yes' }));
    await user.type(await screen.findByRole('spinbutton'), '30');
    await selectComboBoxItem(user, /preferred vendor/i, 'KEMSA');
    await selectComboBoxItem(user, /category/i, 'Medical supplies');

    await user.click(screen.getByRole('button', { name: /save/i }));

    await waitFor(() => expect(mockCreateStockItem).toHaveBeenCalledTimes(1));
    expect(mockCreateStockItem).toHaveBeenCalledWith({
      isDrug: false,
      conceptUuid: 'concept-gloves',
      commonName: 'Surgical gloves',
      acronym: 'GLV',
      hasExpiration: true,
      expiryNotice: 30,
      preferredVendorUuid: 'source-kemsa',
      categoryUuid: 'category-medical-supplies',
      reorderLevelUoMUuid: null,
    });
    expect(mockShowSnackbar).toHaveBeenCalledWith(expect.objectContaining({ kind: 'success' }));
    expect(mockLaunchWorkspace).toHaveBeenCalledWith(expect.objectContaining({ uuid: 'new-item', isDrug: false }));
    expect(handleTabChange).toHaveBeenCalledWith(1);
  });

  it('creates a drug item with its dispensing unit', async () => {
    const user = userEvent.setup();
    render(<StockItemDetails handleTabChange={handleTabChange} />);

    await user.click(screen.getByRole('radio', { name: 'Pharmaceuticals' }));
    await selectComboBoxItem(user, /please specify/i, 'Paracetamol 500mg');
    await user.click(screen.getByRole('radio', { name: 'No' }));
    await selectComboBoxItem(user, /dispensing unit/i, 'Tablet');

    await user.click(screen.getByRole('button', { name: /save/i }));

    await waitFor(() => expect(mockCreateStockItem).toHaveBeenCalledTimes(1));
    expect(mockCreateStockItem).toHaveBeenCalledWith({
      isDrug: true,
      drugUuid: 'drug-paracetamol',
      hasExpiration: false,
      dispensingUnitUuid: 'unit-tablet',
      reorderLevelUoMUuid: null,
    });
    expect(mockLaunchWorkspace).toHaveBeenCalledWith(expect.objectContaining({ isDrug: true }));
  });

  it('does not save until the item type and expiry are answered', async () => {
    const user = userEvent.setup();
    render(<StockItemDetails handleTabChange={handleTabChange} />);

    await user.click(screen.getByRole('button', { name: /save/i }));

    expect(await screen.findByText('Please select an item type')).toBeInTheDocument();
    expect(screen.getByText('Please indicate whether the item expires')).toBeInTheDocument();
    expect(mockCreateStockItem).not.toHaveBeenCalled();
  });

  it('requires a drug, a dispensing unit and an expiry notice where they apply', async () => {
    const user = userEvent.setup();
    render(<StockItemDetails handleTabChange={handleTabChange} />);

    await user.click(screen.getByRole('radio', { name: 'Pharmaceuticals' }));
    await user.click(screen.getByRole('radio', { name: 'Yes' }));
    await user.click(screen.getByRole('button', { name: /save/i }));

    expect(await screen.findByText('Drug required')).toBeInTheDocument();
    expect(screen.getByText('Dispensing unit required')).toBeInTheDocument();
    expect(screen.getByText('Expiry notice required')).toBeInTheDocument();
    expect(mockCreateStockItem).not.toHaveBeenCalled();

    await selectComboBoxItem(user, /please specify/i, 'Paracetamol 500mg');
    await selectComboBoxItem(user, /dispensing unit/i, 'Tablet');
    await user.type(screen.getByRole('spinbutton'), '14');

    await waitFor(() => expect(screen.queryByText('Drug required')).not.toBeInTheDocument());
    expect(screen.queryByText('Dispensing unit required')).not.toBeInTheDocument();
    expect(screen.queryByText('Expiry notice required')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /save/i }));

    await waitFor(() =>
      expect(mockCreateStockItem).toHaveBeenCalledWith(
        expect.objectContaining({ drugUuid: 'drug-paracetamol', dispensingUnitUuid: 'unit-tablet', expiryNotice: 14 }),
      ),
    );
  });
});
