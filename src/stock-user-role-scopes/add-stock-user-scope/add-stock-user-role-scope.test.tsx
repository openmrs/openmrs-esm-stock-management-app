import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { showSnackbar, useConfig } from '@openmrs/esm-framework';
import { mockWorkspace2Props } from '@mocks';
import { type UserRoleScope } from '../../core/api/types/identity/UserRoleScope';
import { useStockOperationTypes, useStockTagLocations, useUser } from '../../stock-lookups/stock-lookups.resource';
import useSearchUser from '../../stock-operations/stock-operations-forms/hooks/useSearchUser';
import { createOrUpdateUserRoleScope } from '../stock-user-role-scopes.resource';
import AddStockUserRoleScope from './add-stock-user-role-scope.workspace';

vi.mock('../../stock-lookups/stock-lookups.resource', () => ({
  useRoles: vi.fn(() => ({ isLoading: false })),
  useStockOperationTypes: vi.fn(),
  useStockTagLocations: vi.fn(),
  useUser: vi.fn(),
}));
vi.mock('../../stock-operations/stock-operations-forms/hooks/useSearchUser', () => ({ default: vi.fn() }));
vi.mock('../stock-user-role-scopes.resource', () => ({ createOrUpdateUserRoleScope: vi.fn() }));
vi.mock('../../utils', () => ({ useHandleMutate: vi.fn(() => vi.fn()) }));

const stockRole = { uuid: 'stock-role-uuid', display: 'Inventory Clerk' };
const otherRole = { uuid: 'other-role-uuid', display: 'Provider' };
const jane = { uuid: 'user-uuid', display: 'Jane Doe', roles: [stockRole, otherRole] };
const operationType = { uuid: 'operation-type-uuid', name: 'Receipt' };
const location = { id: 'location-uuid', name: 'Main Store' };

const savedScope = {
  uuid: 'scope-uuid',
  userUuid: 'user-uuid',
  userName: 'jdoe',
  userFamilyName: 'Doe',
  userGivenName: 'Jane',
  role: 'Inventory Clerk',
  enabled: true,
  permanent: false,
  activeFrom: '2020-01-15T00:00:00.000+0000',
  activeTo: '2020-02-20T00:00:00.000+0000',
  operationTypes: [{ operationTypeUuid: operationType.uuid, operationTypeName: operationType.name }],
  locations: [{ locationUuid: location.id, locationName: location.name, enableDescendants: false }],
} as unknown as UserRoleScope;

const renderForm = (model?: UserRoleScope) =>
  render(<AddStockUserRoleScope {...mockWorkspace2Props(model ? { model } : {})} />);

const selectUser = async (user: ReturnType<typeof userEvent.setup>) => {
  await user.click(screen.getByRole('combobox', { name: 'User' }));
  await user.click(screen.getByRole('option', { name: 'Jane Doe' }));
};

const expectValidationError = async (subtitle: string) => {
  await waitFor(() => expect(showSnackbar).toHaveBeenCalledWith(expect.objectContaining({ kind: 'error', subtitle })));
  expect(createOrUpdateUserRoleScope).not.toHaveBeenCalled();
};

describe('AddStockUserRoleScope', () => {
  beforeEach(() => {
    vi.mocked(useConfig).mockReturnValue({ stockRoleUUIDs: [stockRole.uuid] });
    vi.mocked(useUser).mockReturnValue({ data: jane } as never);
    vi.mocked(useStockOperationTypes).mockReturnValue({
      types: { results: [operationType] },
      isLoading: false,
    } as never);
    vi.mocked(useStockTagLocations).mockReturnValue({ stockLocations: [location], isLoading: false } as never);
    vi.mocked(useSearchUser).mockReturnValue({
      userList: [jane],
      setSearchString: vi.fn(),
      isLoading: false,
    } as never);
    vi.mocked(createOrUpdateUserRoleScope).mockResolvedValue({} as never);
  });

  describe('child locations toggle', () => {
    it('switches on and is saved with the location', async () => {
      const user = userEvent.setup();
      renderForm(savedScope);

      const toggle = screen.getByRole('switch', { name: 'Apply to child locations' });
      expect(toggle).not.toBeChecked();

      await user.click(toggle);
      expect(toggle).toBeChecked();

      await user.click(screen.getByRole('button', { name: /save/i }));
      await waitFor(() =>
        expect(createOrUpdateUserRoleScope).toHaveBeenCalledWith(
          expect.objectContaining({
            locations: [expect.objectContaining({ locationUuid: location.id, enableDescendants: true })],
          }),
        ),
      );
    });
  });

  describe('editing a saved scope', () => {
    it('shows the saved user as read-only, even when they are not in the user search results', () => {
      vi.mocked(useSearchUser).mockReturnValue({ userList: [], setSearchString: vi.fn(), isLoading: false } as never);
      renderForm(savedScope);

      const userField = screen.getByRole('textbox', { name: 'User' });
      expect(userField).toHaveValue('Doe Jane');
      expect(userField).toHaveAttribute('readonly');
      expect(screen.queryByRole('combobox', { name: 'User' })).not.toBeInTheDocument();
    });

    it('shows the saved active dates, even when they are in the past', () => {
      renderForm(savedScope);

      expect(screen.getByLabelText('Active From')).toHaveValue('15/01/2020');
      expect(screen.getByLabelText('Active To')).toHaveValue('20/02/2020');
    });

    it('keeps a saved role selectable when it is no longer a configured stock role', () => {
      vi.mocked(useConfig).mockReturnValue({ stockRoleUUIDs: ['another-role-uuid'] });
      renderForm(savedScope);

      expect(screen.getByRole('combobox', { name: 'Role' })).toHaveValue('Inventory Clerk');
    });
  });

  describe('role list', () => {
    it('only offers stock roles once the user has loaded', async () => {
      const user = userEvent.setup();
      renderForm();

      await selectUser(user);

      expect(screen.getByRole('option', { name: 'Inventory Clerk' })).toBeInTheDocument();
      expect(screen.queryByRole('option', { name: 'Provider' })).not.toBeInTheDocument();
    });

    it('says so when the user has no stock roles', async () => {
      const user = userEvent.setup();
      vi.mocked(useUser).mockReturnValue({ data: { ...jane, roles: [otherRole] } } as never);
      renderForm();

      await selectUser(user);

      expect(screen.getByText('This user has no stock roles')).toBeInTheDocument();
    });

    it('clears the selected role when a different user is chosen', async () => {
      const user = userEvent.setup();
      const john = { uuid: 'john-uuid', display: 'John Roe', roles: [stockRole] };
      vi.mocked(useSearchUser).mockReturnValue({
        userList: [jane, john],
        setSearchString: vi.fn(),
        isLoading: false,
      } as never);
      renderForm();

      await selectUser(user);
      await user.selectOptions(screen.getByRole('combobox', { name: 'Role' }), 'Inventory Clerk');

      await user.clear(screen.getByRole('combobox', { name: 'User' }));
      await user.click(screen.getByRole('option', { name: 'John Roe' }));
      await user.click(screen.getByRole('button', { name: /save/i }));

      await expectValidationError('Role is required');
    });

    it('shows no role after switching straight to another user who has the same role', async () => {
      const user = userEvent.setup();
      const john = { uuid: 'john-uuid', display: 'John Roe', roles: [stockRole] };
      vi.mocked(useSearchUser).mockReturnValue({
        userList: [jane, john],
        setSearchString: vi.fn(),
        isLoading: false,
      } as never);
      renderForm();

      await selectUser(user);
      await user.selectOptions(screen.getByRole('combobox', { name: 'Role' }), 'Inventory Clerk');

      await user.click(screen.getByRole('combobox', { name: 'User' }));
      await user.click(screen.getByRole('option', { name: 'John Roe' }));

      expect(screen.getByRole('combobox', { name: 'Role' })).toHaveValue('');
      await user.click(screen.getByRole('button', { name: /save/i }));
      await expectValidationError('Role is required');
    });
  });

  describe('saving', () => {
    const fillRequiredFieldsExceptDates = async (user: ReturnType<typeof userEvent.setup>) => {
      await selectUser(user);
      await user.selectOptions(screen.getByRole('combobox', { name: 'Role' }), 'Inventory Clerk');
    };

    it('sends enabled and permanent as false rather than leaving them out', async () => {
      const user = userEvent.setup();
      renderForm({ ...savedScope, enabled: undefined, permanent: undefined } as unknown as UserRoleScope);

      await user.click(screen.getByRole('button', { name: /save/i }));

      await waitFor(() =>
        expect(createOrUpdateUserRoleScope).toHaveBeenCalledWith(
          expect.objectContaining({ enabled: false, permanent: false }),
        ),
      );
    });

    it('requires dates unless the scope is permanent', async () => {
      const user = userEvent.setup();
      renderForm();

      await fillRequiredFieldsExceptDates(user);
      await user.click(screen.getByRole('button', { name: /save/i }));

      await expectValidationError('Active From and Active To are required unless the scope is permanent');
    });

    it('requires at least one stock operation', async () => {
      const user = userEvent.setup();
      renderForm();

      await fillRequiredFieldsExceptDates(user);
      await user.click(screen.getByRole('checkbox', { name: 'Permanent' }));
      await user.click(screen.getByRole('button', { name: /save/i }));

      await expectValidationError('Select at least one stock operation');
    });

    it('requires at least one location', async () => {
      const user = userEvent.setup();
      renderForm();

      await fillRequiredFieldsExceptDates(user);
      await user.click(screen.getByRole('checkbox', { name: 'Permanent' }));
      await user.click(screen.getByRole('checkbox', { name: operationType.name }));
      await user.click(screen.getByRole('button', { name: /save/i }));

      await expectValidationError('Select at least one location');
    });

    it('saves a complete permanent scope', async () => {
      const user = userEvent.setup();
      renderForm();

      await fillRequiredFieldsExceptDates(user);
      await user.click(screen.getByRole('checkbox', { name: 'Permanent' }));
      await user.click(screen.getByRole('checkbox', { name: operationType.name }));
      await user.click(screen.getByRole('checkbox', { name: location.name }));
      await user.click(screen.getByRole('button', { name: /save/i }));

      await waitFor(() =>
        expect(createOrUpdateUserRoleScope).toHaveBeenCalledWith(
          expect.objectContaining({
            userUuid: jane.uuid,
            role: 'Inventory Clerk',
            enabled: false,
            permanent: true,
          }),
        ),
      );
    });
  });
});

describe('AddStockUserRoleScope stock roles', () => {
  beforeEach(() => {
    vi.mocked(useConfig).mockReturnValue({ stockRoleUUIDs: ['configured-role-uuid'] });
    // The user's full roles haven't loaded yet, so the roles come from the search result
    vi.mocked(useUser).mockReturnValue({ data: {} } as never);
    vi.mocked(useStockOperationTypes).mockReturnValue({ types: { results: [] }, isLoading: false } as never);
    vi.mocked(useStockTagLocations).mockReturnValue({ stockLocations: [], isLoading: false } as never);
    vi.mocked(useSearchUser).mockReturnValue({
      userList: [
        {
          uuid: 'user-uuid',
          display: 'Jane Doe',
          roles: [
            { uuid: 'configured-role-uuid', display: 'Central Store Clerk' },
            { uuid: 'other-role-uuid', display: 'Provider' },
          ],
        },
      ],
      setSearchString: vi.fn(),
      isLoading: false,
    } as never);
  });

  it('identifies stock roles by the configured role UUIDs', async () => {
    const user = userEvent.setup();
    render(<AddStockUserRoleScope {...mockWorkspace2Props({})} />);

    await user.click(screen.getByRole('combobox', { name: 'User' }));
    await user.click(screen.getByRole('option', { name: 'Jane Doe' }));

    expect(screen.getByRole('option', { name: 'Central Store Clerk' })).toBeInTheDocument();
    expect(screen.queryByRole('option', { name: 'Provider' })).not.toBeInTheDocument();
  });
});
