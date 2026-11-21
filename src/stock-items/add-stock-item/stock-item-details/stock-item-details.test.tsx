import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { type StockItemDTO } from '../../../core/api/types/stockItem/StockItem';
import { updateStockItem } from '../../stock-items.resource';
import StockItemDetails from './stock-item-details.component';

vi.mock('../../stock-items.resource', () => ({ createStockItem: vi.fn(), updateStockItem: vi.fn() }));
vi.mock('../../../utils', () => ({ useHandleMutate: () => vi.fn() }));
vi.mock('../../stock-item.utils', () => ({ launchAddOrEditStockItemWorkspace: vi.fn() }));
vi.mock('../concepts-selector/concepts-selector.component', () => ({ default: () => null }));
vi.mock('../dispensing-unit-selector/dispensing-unit-selector.component', () => ({ default: () => null }));
vi.mock('../drug-selector/drug-selector.component', () => ({ default: () => null }));
vi.mock('../preferred-vendor-selector/preferred-vendor-selector.component', () => ({ default: () => null }));
vi.mock('../stock-item-category-selector/stock-item-category-selector.component', () => ({ default: () => null }));
vi.mock('../stock-item-units-edit/stock-item-units-edit.component', () => ({ default: () => null }));

const gauze = { uuid: 'gauze-uuid', isDrug: false, hasExpiration: false, commonName: 'Gauze' } as StockItemDTO;

describe('StockItemDetails', () => {
  it('disables Save until the save finishes', async () => {
    const user = userEvent.setup();
    let finishSave: (value: unknown) => void;
    vi.mocked(updateStockItem).mockReturnValue(new Promise((resolve) => (finishSave = resolve)) as never);
    render(<StockItemDetails stockItem={gauze} handleTabChange={vi.fn()} />);

    const save = screen.getByRole('button', { name: /save/i });
    await user.click(save);

    await waitFor(() => expect(save).toBeDisabled());
    await user.click(save);
    expect(updateStockItem).toHaveBeenCalledTimes(1);

    finishSave({ data: gauze });
    await waitFor(() => expect(save).toBeEnabled());
  });
});
