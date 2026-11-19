import React from 'react';
import { vi, describe, it, expect } from 'vitest';
import userEvent from '@testing-library/user-event';
import { render, screen, waitFor } from '@testing-library/react';
import { type FetchResponse } from '@openmrs/esm-framework';
import { type StockItemDTO } from '../../core/api/types/stockItem/StockItem';
import { mockWorkspace2Props } from '@mocks';
import { updateStockItem } from '../stock-items.resource';
import AddEditStockItem from './add-stock-item.component';

vi.mock('../stock-items.resource', () => ({
  createStockItem: vi.fn(),
  updateStockItem: vi.fn(),
}));

const mockUpdateStockItem = vi.mocked(updateStockItem);

// Mock the API-hitting child components so the integration test can focus on
// the form-staleness behaviour without bringing in their dependencies.
vi.mock('./drug-selector/drug-selector.component', () => ({ default: () => <div data-testid="drug-selector" /> }));
vi.mock('./concepts-selector/concepts-selector.component', () => ({
  default: () => <div data-testid="concepts-selector" />,
}));
vi.mock('./stock-item-category-selector/stock-item-category-selector.component', () => ({
  default: () => <div data-testid="stock-item-category-selector" />,
}));
vi.mock('./dispensing-unit-selector/dispensing-unit-selector.component', () => ({
  default: () => <div data-testid="dispensing-unit-selector" />,
}));
vi.mock('./preferred-vendor-selector/preferred-vendor-selector.component', () => ({
  default: () => <div data-testid="preferred-vendor-selector" />,
}));
vi.mock('./stock-item-units-edit/stock-item-units-edit.component', () => ({
  default: () => <div data-testid="stock-item-units-edit" />,
}));

// Other tabs are only mounted if the user navigates to them; the default tab
// is Stock Item Details, which is what this test exercises. Mock them to keep
// the test surface small.
vi.mock('./packaging-units/packaging-units.component', () => ({
  default: () => <div data-testid="packaging-units" />,
}));
vi.mock('./transactions/transactions.component', () => ({ default: () => <div data-testid="transactions" /> }));
vi.mock('./batch-information/batch-information.component', () => ({
  default: () => <div data-testid="batch-information" />,
}));
vi.mock('./quantities/quantities.component', () => ({ default: () => <div data-testid="quantities" /> }));
vi.mock('./stock-item-rules/stock-item-rules.component', () => ({
  default: () => <div data-testid="stock-item-rules" />,
}));
vi.mock('./stock-item-references/stock-item-references.component', () => ({
  default: () => <div data-testid="stock-item-references" />,
}));

const baseItem: Partial<StockItemDTO> = {
  isDrug: false,
  hasExpiration: false,
  commonName: '',
  acronym: '',
  conceptName: '',
  expiryNotice: 0,
  permission: { canView: true, canEdit: true } as StockItemDTO['permission'],
};

describe('AddEditStockItem (integration)', () => {
  it('shows the newly selected stock item in the Stock Item Details form fields when stockItem changes', () => {
    const itemA: StockItemDTO = {
      ...(baseItem as StockItemDTO),
      uuid: 'item-a',
      commonName: 'Aspirin',
      acronym: 'ASP',
    };
    const itemB: StockItemDTO = {
      ...(baseItem as StockItemDTO),
      uuid: 'item-b',
      commonName: 'Paracetamol',
      acronym: 'PCM',
    };

    const { rerender } = render(<AddEditStockItem {...mockWorkspace2Props({ stockItem: itemA })} />);

    expect(screen.getByDisplayValue('Aspirin')).toBeInTheDocument();
    expect(screen.getByDisplayValue('ASP')).toBeInTheDocument();

    rerender(<AddEditStockItem {...mockWorkspace2Props({ stockItem: itemB })} />);

    expect(screen.getByDisplayValue('Paracetamol')).toBeInTheDocument();
    expect(screen.getByDisplayValue('PCM')).toBeInTheDocument();
    expect(screen.queryByDisplayValue('Aspirin')).not.toBeInTheDocument();
    expect(screen.queryByDisplayValue('ASP')).not.toBeInTheDocument();
  });

  it('keeps an edit when the Details tab is left and saved again', async () => {
    const user = userEvent.setup();
    mockUpdateStockItem.mockImplementation((uuid, item) =>
      Promise.resolve({ data: { ...item, uuid } } as unknown as FetchResponse<StockItemDTO>),
    );
    const item: StockItemDTO = {
      ...(baseItem as StockItemDTO),
      uuid: 'item-a',
      conceptUuid: 'concept-a',
      commonName: 'Aspirin',
      acronym: 'ASP',
    };

    render(<AddEditStockItem {...mockWorkspace2Props({ stockItem: item })} />);

    const commonName = screen.getByDisplayValue('Aspirin');
    await user.clear(commonName);
    await user.type(commonName, 'Aspirin v2');
    await user.click(screen.getByRole('button', { name: /save/i }));
    await waitFor(() => expect(mockUpdateStockItem).toHaveBeenCalledTimes(1));

    await user.click(screen.getByText(/packaging units/i));
    await user.click(screen.getByText(/stock item details/i));

    expect(screen.getByDisplayValue('Aspirin v2')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /save/i }));
    await waitFor(() => expect(mockUpdateStockItem).toHaveBeenCalledTimes(2));
    expect(mockUpdateStockItem).toHaveBeenLastCalledWith(
      'item-a',
      expect.objectContaining({ commonName: 'Aspirin v2', acronym: 'ASP' }),
    );
  });
});
