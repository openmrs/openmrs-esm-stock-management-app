import React from 'react';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { showModal, showSnackbar } from '@openmrs/esm-framework';
import { mockWorkspace2Props } from '@mocks';
import routes from '../../../routes.json';
import { type StockRule } from '../../../core/api/types/stockItem/StockRule';
import { deleteStockRule, useStockItemPackagingUOMs } from '../../stock-items.resource';
import { useRoles, useStockTagLocations } from '../../../stock-lookups/stock-lookups.resource';
import { createOrUpdateStockRule, useStockRules } from './stock-rules.resource';
import { useStockItemRules } from './stock-item-rules.resource';
import DeleteStockRuleModal from './delete-stock-rule.modal';
import StockItemRules from './stock-item-rules.component';
import StockRulesAddOrUpdate from './add-stock-rules.component';
import StockRulesDeleteActionMenu from './stock-rules-delete.component';

const { mockHandleMutate } = vi.hoisted(() => ({ mockHandleMutate: vi.fn() }));

vi.mock('../../stock-items.resource', () => ({
  deleteStockRule: vi.fn(),
  useStockItemPackagingUOMs: vi.fn(),
}));
vi.mock('./stock-rules.resource', () => ({ createOrUpdateStockRule: vi.fn(), useStockRules: vi.fn() }));
vi.mock('./stock-item-rules.resource', () => ({ useStockItemRules: vi.fn() }));
vi.mock('../../../stock-lookups/stock-lookups.resource', () => ({ useRoles: vi.fn(), useStockTagLocations: vi.fn() }));
vi.mock('../../../utils', () => ({ useHandleMutate: () => mockHandleMutate }));
vi.mock('./add-stock-rule-button.component', () => ({ default: () => null }));
vi.mock('./edit-stock-rule.component', () => ({ default: () => null }));

const rule = (overrides: Partial<StockRule>) =>
  ({
    uuid: 'rule-uuid',
    stockItemUuid: 'item-uuid',
    name: 'Advil alert',
    locationUuid: 'main-store',
    locationName: 'Main Store',
    quantity: 10,
    packagingUomName: 'Box',
    enabled: true,
    evaluationFrequency: 30,
    actionFrequency: 3600,
    ...overrides,
  } as StockRule);

const mainStoreRule = rule({});
const pharmacyRule = rule({
  uuid: 'rule-2',
  name: 'Pharmacy alert',
  locationUuid: 'main-pharmacy',
  locationName: 'Main Pharmacy',
  enabled: false,
});

describe('stock item rules', () => {
  beforeEach(() => {
    vi.mocked(deleteStockRule).mockResolvedValue({} as never);
    vi.mocked(useStockRules).mockReturnValue({ items: { results: [mainStoreRule, pharmacyRule] } } as never);
    vi.mocked(useStockItemRules).mockImplementation(
      ({ locationUuid }) =>
        ({
          items: [mainStoreRule, pharmacyRule].filter((r) => !locationUuid || r.locationUuid === locationUuid),
          isLoading: false,
          tableHeaders: [
            { key: 'name', header: 'Name' },
            { key: 'enabled', header: 'Enabled?' },
          ],
          currentPage: 1,
          currentPageSize: 10,
          pageSizes: [10],
          totalItems: 2,
          setPageSize: vi.fn(),
          goTo: vi.fn(),
        } as never),
    );
  });

  describe('deleting a rule', () => {
    it('registers the delete modal under the name the button opens', () => {
      // index.ts can't be imported in a test, so check its source for the export routes.json points at
      const indexSource = readFileSync(resolve(__dirname, '../../../index.ts'), 'utf8');
      const registration = routes.modals.find((modal) => modal.name === 'delete-stock-rule-modal');

      expect(registration?.component).toBe('deleteStockRuleModal');
      expect(indexSource).toMatch(
        /export const deleteStockRuleModal = getAsyncLifecycle\(\s*\(\) => import\('\.\/stock-items\/add-stock-item\/stock-item-rules\/delete-stock-rule\.modal'\)/,
      );
    });

    it('asks for confirmation naming the rule, deletes it and refreshes the list', async () => {
      const user = userEvent.setup();
      const closeModal = vi.fn();
      vi.mocked(showModal).mockReturnValue(closeModal);
      render(<StockRulesDeleteActionMenu uuid="rule-uuid" name="Advil alert" />);

      await user.click(screen.getByRole('button'));

      const props = vi.mocked(showModal).mock.lastCall[1] as { ruleName: string; onConfirmation: () => void };
      expect(vi.mocked(showModal).mock.lastCall[0]).toBe('delete-stock-rule-modal');
      expect(props.ruleName).toBe('Advil alert');

      props.onConfirmation();

      await waitFor(() => expect(deleteStockRule).toHaveBeenCalledWith('rule-uuid'));
      await waitFor(() => expect(mockHandleMutate).toHaveBeenCalledWith(expect.stringContaining('/stockrule')));
      expect(showSnackbar).toHaveBeenCalledWith(expect.objectContaining({ kind: 'success' }));
      expect(closeModal).toHaveBeenCalled();
    });

    it('names the rule in the confirmation', () => {
      render(<DeleteStockRuleModal ruleName="Advil alert" close={vi.fn()} onConfirmation={vi.fn()} />);

      expect(
        screen.getByText("Are you sure you want to delete the stock rule Advil alert? This action can't be undone."),
      ).toBeInTheDocument();
    });
  });

  describe('filters', () => {
    const openAndPick = async (user: ReturnType<typeof userEvent.setup>, filter: string, option: string) => {
      await user.click(screen.getByRole('combobox', { name: filter }));
      await user.click(screen.getByRole('option', { name: option }));
    };

    it('filters the rules by location on the server', async () => {
      const user = userEvent.setup();
      render(<StockItemRules stockItemUuid="item-uuid" />);
      expect(screen.getByText('Advil alert')).toBeInTheDocument();
      expect(screen.getByText('Pharmacy alert')).toBeInTheDocument();

      await openAndPick(user, 'Location', 'Main Pharmacy');

      expect(useStockItemRules).toHaveBeenLastCalledWith(expect.objectContaining({ locationUuid: 'main-pharmacy' }));
      await waitFor(() => expect(screen.queryByText('Advil alert')).not.toBeInTheDocument());
      expect(screen.getByText('Pharmacy alert')).toBeInTheDocument();

      await openAndPick(user, 'Location', 'All locations');
      expect(useStockItemRules).toHaveBeenLastCalledWith(expect.objectContaining({ locationUuid: undefined }));
    });

    it('filters the rules by enabled state', async () => {
      const user = userEvent.setup();
      render(<StockItemRules stockItemUuid="item-uuid" />);

      await openAndPick(user, 'Status', 'Disabled');

      await waitFor(() => expect(screen.queryByText('Advil alert')).not.toBeInTheDocument());
      expect(screen.getByText('Pharmacy alert')).toBeInTheDocument();

      await openAndPick(user, 'Status', 'Enabled');

      expect(await screen.findByText('Advil alert')).toBeInTheDocument();
      await waitFor(() => expect(screen.queryByText('Pharmacy alert')).not.toBeInTheDocument());
    });
  });

  describe('the rule form', () => {
    beforeEach(() => {
      vi.mocked(useStockTagLocations).mockReturnValue({
        stockLocations: [{ id: 'main-store', name: 'Main Store' }],
      } as never);
      vi.mocked(useStockItemPackagingUOMs).mockReturnValue({
        items: { results: [{ uuid: 'box-uuid', packagingUomName: 'Box' }] },
      } as never);
      vi.mocked(useRoles).mockReturnValue({ items: { results: [{ display: 'Inventory Manager' }] } } as never);
    });

    const renderForm = () => render(<StockRulesAddOrUpdate {...mockWorkspace2Props({ stockItemUuid: 'item-uuid' })} />);
    const save = (user: ReturnType<typeof userEvent.setup>) =>
      user.click(screen.getByRole('button', { name: /save/i }));

    const fillForm = async (user: ReturnType<typeof userEvent.setup>) => {
      await user.selectOptions(screen.getByRole('combobox', { name: 'Location' }), 'Main Store');
      await user.type(screen.getByRole('textbox', { name: 'Rule name' }), 'Advil alert');
      await user.selectOptions(screen.getByRole('combobox', { name: 'Quantity unit' }), 'Box');
      await user.type(screen.getByRole('spinbutton', { name: 'Quantity threshold' }), '10');
      await user.selectOptions(screen.getByRole('combobox', { name: 'Alert role' }), 'Inventory Manager');
      await user.selectOptions(screen.getByRole('combobox', { name: 'Mail role' }), 'Inventory Manager');
      await user.type(screen.getByRole('spinbutton', { name: 'Frequency Check (Minutes)' }), '30');
      await user.type(screen.getByRole('spinbutton', { name: 'Notification Frequency (Minutes)' }), '3600');
    };

    it('blocks an empty save and marks every required field', async () => {
      const user = userEvent.setup();
      renderForm();

      await save(user);

      expect(createOrUpdateStockRule).not.toHaveBeenCalled();
      for (const message of [
        'Location is required',
        'Rule name is required',
        'Quantity unit is required',
        'Enter a quantity threshold greater than 0',
        'Alert role is required',
        'Mail role is required',
        'Enter a frequency check greater than 0',
        'Enter a notification frequency greater than 0',
      ]) {
        expect(screen.getByText(message)).toBeInTheDocument();
      }
    });

    it('rejects a threshold that is not greater than 0', async () => {
      const user = userEvent.setup();
      renderForm();
      await fillForm(user);
      await user.clear(screen.getByRole('spinbutton', { name: 'Quantity threshold' }));
      await user.type(screen.getByRole('spinbutton', { name: 'Quantity threshold' }), '0');

      await save(user);

      expect(screen.getByText('Enter a quantity threshold greater than 0')).toBeInTheDocument();
      expect(createOrUpdateStockRule).not.toHaveBeenCalled();
    });

    it("shows the server's reason when a save is refused", async () => {
      const user = userEvent.setup();
      vi.mocked(createOrUpdateStockRule).mockRejectedValue({
        responseBody: { error: { message: 'User has no rights to update stock rule' } },
      });
      renderForm();
      await fillForm(user);

      await save(user);

      await waitFor(() =>
        expect(showSnackbar).toHaveBeenCalledWith(
          expect.objectContaining({ kind: 'error', subtitle: 'User has no rights to update stock rule' }),
        ),
      );
      expect(createOrUpdateStockRule).toHaveBeenCalledWith(
        expect.objectContaining({
          locationUuid: 'main-store',
          name: 'Advil alert',
          stockItemPackagingUOMUuid: 'box-uuid',
          quantity: 10,
          evaluationFrequency: 30,
          actionFrequency: 3600,
        }),
      );
    });
  });
});
