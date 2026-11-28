import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { showSnackbar } from '@openmrs/esm-framework';
import { useStockSources } from '../../../stock-sources/stock-sources.resource';
import {
  createStockItemReference,
  deleteStockItemReference,
  updateStockItemReference,
} from '../../stock-items.resource';
import { useStockItemReferencesHook } from './stock-item-references.resource';
import StockReferences from './stock-item-references.component';

const { mockHandleMutate } = vi.hoisted(() => ({ mockHandleMutate: vi.fn() }));

vi.mock('../../stock-items.resource', () => ({
  createStockItemReference: vi.fn(),
  deleteStockItemReference: vi.fn(),
  updateStockItemReference: vi.fn(),
}));
vi.mock('./stock-item-references.resource', () => ({ useStockItemReferencesHook: vi.fn() }));
vi.mock('../../../stock-sources/stock-sources.resource', () => ({ useStockSources: vi.fn() }));
vi.mock('../../../utils', () => ({ useHandleMutate: () => mockHandleMutate }));

const stockItemUuid = 'stock-item-uuid';
const firstReference = {
  uuid: 'reference-1',
  stockItemUuid,
  stockSourceUuid: 'source-1',
  stockSourceName: 'National Medical Stores',
  referenceCode: 'NMS-MET500',
};
const secondReference = {
  uuid: 'reference-2',
  stockItemUuid,
  stockSourceUuid: 'source-2',
  stockSourceName: 'Watsons',
  referenceCode: 'WAT-100',
};

const getCodeInputs = () => screen.getAllByRole('textbox', { name: 'Code' });
const getNewCodeInput = () => getCodeInputs().at(-1);
const save = (user: ReturnType<typeof userEvent.setup>) => user.click(screen.getByRole('button', { name: 'Save' }));

const pickSource = async (user: ReturnType<typeof userEvent.setup>, name: string) => {
  await user.click(screen.getByRole('combobox'));
  await user.click(screen.getByRole('option', { name }));
};

const renderTab = (items = [firstReference]) => {
  vi.mocked(useStockItemReferencesHook).mockReturnValue({
    items,
    isLoading: false,
    setStockItemUuid: vi.fn(),
  } as never);
  return render(<StockReferences stockItemUuid={stockItemUuid} />);
};

const expectNoRequests = () => {
  expect(createStockItemReference).not.toHaveBeenCalled();
  expect(updateStockItemReference).not.toHaveBeenCalled();
};

describe('StockReferences', () => {
  beforeEach(() => {
    vi.mocked(useStockSources).mockReturnValue({
      items: {
        results: [
          { uuid: 'source-1', name: 'National Medical Stores' },
          { uuid: 'source-2', name: 'Watsons' },
        ],
      },
      isLoading: false,
    } as never);
    vi.mocked(createStockItemReference).mockResolvedValue({} as never);
    vi.mocked(updateStockItemReference).mockResolvedValue({} as never);
    vi.mocked(deleteStockItemReference).mockResolvedValue({} as never);
  });

  describe('row state', () => {
    it('gives each row its own code', async () => {
      const user = userEvent.setup();
      renderTab([firstReference, secondReference]);

      expect(getCodeInputs()[0]).toHaveValue('NMS-MET500');
      expect(getCodeInputs()[1]).toHaveValue('WAT-100');

      await user.type(getNewCodeInput(), 'NEW-500');

      expect(getCodeInputs()[0]).toHaveValue('NMS-MET500');
      expect(getCodeInputs()[1]).toHaveValue('WAT-100');
      expect(getNewCodeInput()).toHaveValue('NEW-500');
    });

    it('only offers delete on saved references', () => {
      renderTab([firstReference]);

      const rows = screen.getAllByRole('row');
      const newRow = rows.at(-1);
      expect(within(rows[1]).getByRole('button')).toBeInTheDocument();
      expect(within(newRow).queryByRole('button', { name: '' })).not.toBeInTheDocument();
    });
  });

  describe('adding', () => {
    it('creates a reference, refreshes the list and clears the new row', async () => {
      const user = userEvent.setup();
      renderTab();

      await pickSource(user, 'Watsons');
      await user.type(getNewCodeInput(), '  WAT-500  ');
      await save(user);

      await waitFor(() =>
        expect(createStockItemReference).toHaveBeenCalledWith({
          referenceCode: 'WAT-500',
          stockItemUuid,
          stockSourceUuid: 'source-2',
        }),
      );
      expect(updateStockItemReference).not.toHaveBeenCalled();
      await waitFor(() => expect(mockHandleMutate).toHaveBeenCalled());
      await waitFor(() => expect(getNewCodeInput()).toHaveValue(''));
      expect(screen.getByRole('combobox')).toHaveValue('');
    });
  });

  describe('editing', () => {
    it('updates the existing reference instead of creating a duplicate', async () => {
      const user = userEvent.setup();
      renderTab([firstReference, secondReference]);

      await user.clear(getCodeInputs()[0]);
      await user.type(getCodeInputs()[0], 'NMS-MET999');
      await save(user);

      await waitFor(() =>
        expect(updateStockItemReference).toHaveBeenCalledWith(
          { referenceCode: 'NMS-MET999', stockItemUuid, stockSourceUuid: 'source-1' },
          'reference-1',
        ),
      );
      expect(updateStockItemReference).toHaveBeenCalledTimes(1);
      expect(createStockItemReference).not.toHaveBeenCalled();
      await waitFor(() => expect(mockHandleMutate).toHaveBeenCalled());
    });
  });

  describe('deleting', () => {
    it('deletes the reference and refreshes the list', async () => {
      const user = userEvent.setup();
      renderTab();

      await user.click(within(screen.getAllByRole('row')[1]).getByRole('button'));

      await waitFor(() => expect(deleteStockItemReference).toHaveBeenCalledWith('reference-1'));
      await waitFor(() =>
        expect(mockHandleMutate).toHaveBeenCalledWith(expect.stringContaining('/stockitemreference')),
      );
    });
  });

  describe('validation', () => {
    it('marks the new row and sends nothing when there is nothing to save', async () => {
      const user = userEvent.setup();
      renderTab();

      await save(user);

      expect(await screen.findByText('Source is required')).toBeInTheDocument();
      expect(screen.getByText('Code is required')).toBeInTheDocument();
      expectNoRequests();
    });

    it('requires a source when a new code is typed', async () => {
      const user = userEvent.setup();
      renderTab();

      await user.type(getNewCodeInput(), 'WAT-500');
      await save(user);

      expect(await screen.findByText('Source is required')).toBeInTheDocument();
      expectNoRequests();
    });

    it('does not silently drop a new code without a source when a saved code is also edited', async () => {
      const user = userEvent.setup();
      renderTab();

      await user.clear(getCodeInputs()[0]);
      await user.type(getCodeInputs()[0], 'NMS-MET999');
      await user.type(getNewCodeInput(), 'WAT-500');
      await save(user);

      expect(await screen.findByText('Source is required')).toBeInTheDocument();
      expectNoRequests();
    });

    it('requires a code when a new source is picked, ignoring whitespace', async () => {
      const user = userEvent.setup();
      renderTab();

      await pickSource(user, 'Watsons');
      await user.type(getNewCodeInput(), '   ');
      await save(user);

      expect(await screen.findByText('Code is required')).toBeInTheDocument();
      expectNoRequests();
    });

    it('does not let a saved code be emptied', async () => {
      const user = userEvent.setup();
      renderTab();

      await user.clear(getCodeInputs()[0]);
      await save(user);

      expect(await screen.findByText('Code is required')).toBeInTheDocument();
      expectNoRequests();
    });
  });

  describe('server errors', () => {
    const serverError = { responseBody: { error: { message: 'Duplicate reference' } } };

    it('keeps the form as it was and shows the reason', async () => {
      const user = userEvent.setup();
      vi.mocked(createStockItemReference).mockRejectedValue(serverError);
      renderTab();

      await pickSource(user, 'Watsons');
      await user.type(getNewCodeInput(), 'WAT-500');
      await save(user);

      await waitFor(() =>
        expect(showSnackbar).toHaveBeenCalledWith(
          expect.objectContaining({
            kind: 'error',
            subtitle: 'Error saving stock item reference: Duplicate reference',
          }),
        ),
      );
      expect(getNewCodeInput()).toHaveValue('WAT-500');
      expect(screen.getByRole('combobox')).toHaveValue('Watsons');
      expect(mockHandleMutate).not.toHaveBeenCalled();
    });

    it('keeps a failed new reference when an edit in the same save succeeds', async () => {
      const user = userEvent.setup();
      vi.mocked(createStockItemReference).mockRejectedValue(serverError);
      renderTab();

      await user.clear(getCodeInputs()[0]);
      await user.type(getCodeInputs()[0], 'NMS-MET999');
      await pickSource(user, 'Watsons');
      await user.type(getNewCodeInput(), 'WAT-500');
      await save(user);

      await waitFor(() => expect(showSnackbar).toHaveBeenCalledWith(expect.objectContaining({ kind: 'error' })));
      expect(updateStockItemReference).toHaveBeenCalledTimes(1);
      expect(mockHandleMutate).toHaveBeenCalled();
      expect(getNewCodeInput()).toHaveValue('WAT-500');
    });
  });
});
