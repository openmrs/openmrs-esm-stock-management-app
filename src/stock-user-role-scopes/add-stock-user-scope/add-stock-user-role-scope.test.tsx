import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { showSnackbar, useConfig } from '@openmrs/esm-framework';
import { mockWorkspace2Props } from '@mocks';
import { type UserRoleScope } from '../../core/api/types/identity/UserRoleScope';
import {
  useRoles,
  useStockOperationTypes,
  useStockTagLocations,
  useUser,
} from '../../stock-lookups/stock-lookups.resource';
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

const operationTypes = [
  { uuid: 'receive', name: 'Receive' },
  { uuid: 'issue', name: 'Issue' },
];
const locations = [
  { id: 'store', name: 'Store' },
  { id: 'pharmacy', name: 'Pharmacy' },
];

const mockUserSearch = (userList: any[] = []) =>
  vi.mocked(useSearchUser).mockReturnValue({ userList, setSearchString: vi.fn(), isLoading: false } as never);

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

// The error shows on its field, not in a toast
const expectValidationError = async (message: string) => {
  expect(await screen.findByText(message)).toBeInTheDocument();
  expect(showSnackbar).not.toHaveBeenCalled();
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

      expect(screen.getByLabelText(/^Active From/)).toHaveValue('15/01/2020');
      expect(screen.getByLabelText(/^Active To/)).toHaveValue('20/02/2020');
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

      await expectValidationError('Active From is required');
      expect(screen.getByText('Active To is required')).toBeInTheDocument();
      expect(screen.getByRole('textbox', { name: /^Active From/ })).toHaveAttribute('data-invalid', 'true');
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

    it('marks every missing field at once and takes the user to the first one', async () => {
      const user = userEvent.setup();
      renderForm();

      await user.click(screen.getByRole('button', { name: /save/i }));

      await expectValidationError('User is required');
      for (const message of [
        'Role is required',
        'Active From is required',
        'Active To is required',
        'Select at least one stock operation',
        'Select at least one location',
      ]) {
        expect(screen.getByText(message)).toBeInTheDocument();
      }
      expect(screen.getByRole('combobox', { name: 'User' })).toHaveFocus();
    });

    it('drops an error once its field is filled in', async () => {
      const user = userEvent.setup();
      renderForm();
      await user.click(screen.getByRole('button', { name: /save/i }));
      expect(await screen.findByText('User is required')).toBeInTheDocument();

      await selectUser(user);
      await user.selectOptions(screen.getByRole('combobox', { name: 'Role' }), 'Inventory Clerk');
      await user.click(screen.getByRole('checkbox', { name: 'Permanent' }));

      expect(screen.queryByText('User is required')).not.toBeInTheDocument();
      expect(screen.queryByText('Role is required')).not.toBeInTheDocument();
      expect(screen.queryByText('Active From is required')).not.toBeInTheDocument();
      expect(screen.getByText('Select at least one stock operation')).toBeInTheDocument();
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
    mockUserSearch([
      {
        uuid: 'user-uuid',
        display: 'Jane Doe',
        roles: [
          { uuid: 'configured-role-uuid', display: 'Central Store Clerk' },
          { uuid: 'other-role-uuid', display: 'Provider' },
        ],
      },
    ]);
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

describe('AddStockUserRoleScope group selection', () => {
  beforeEach(() => {
    vi.useRealTimers();
    mockUserSearch();
    vi.mocked(useStockOperationTypes).mockReturnValue({
      types: { results: operationTypes },
      isLoading: false,
    } as any);
    vi.mocked(useStockTagLocations).mockReturnValue({ stockLocations: locations, isLoading: false } as any);
    vi.mocked(useRoles).mockReturnValue({ isLoading: false } as any);
    vi.mocked(useUser).mockReturnValue({ data: undefined } as any);
    vi.mocked(createOrUpdateUserRoleScope).mockResolvedValue({} as any);
  });

  it('selects and clears both groups in the add flow after a partial selection', async () => {
    const user = userEvent.setup();
    render(<AddStockUserRoleScope {...mockWorkspace2Props({})} />);

    await user.click(screen.getByLabelText('Receive'));
    await user.click(screen.getByLabelText('Store'));

    const allOperations = screen.getByRole('checkbox', { name: 'Select all stock operations' });
    const allLocations = screen.getByRole('checkbox', { name: 'Select all locations' });
    expect((allOperations as HTMLInputElement).indeterminate).toBe(true);
    expect((allLocations as HTMLInputElement).indeterminate).toBe(true);

    await user.click(allOperations);
    await user.click(allLocations);
    expect(screen.getByLabelText('Receive')).toBeChecked();
    expect(screen.getByLabelText('Issue')).toBeChecked();
    expect(screen.getByLabelText('Store')).toBeChecked();
    expect(screen.getByLabelText('Pharmacy')).toBeChecked();

    await user.click(allOperations);
    await user.click(allLocations);
    expect(screen.getByLabelText('Receive')).not.toBeChecked();
    expect(screen.getByLabelText('Issue')).not.toBeChecked();
    expect(screen.getByLabelText('Store')).not.toBeChecked();
    expect(screen.getByLabelText('Pharmacy')).not.toBeChecked();
  });

  it('preserves existing descendant settings when selecting all in the edit flow', async () => {
    const user = userEvent.setup();
    const model = {
      userUuid: 'user-uuid',
      role: 'Inventory Clerk',
      enabled: true,
      permanent: true,
      operationTypes: [{ operationTypeUuid: 'receive', operationTypeName: 'Receive' }],
      locations: [{ locationUuid: 'store', locationName: 'Store', enableDescendants: true }],
    };
    render(<AddStockUserRoleScope {...mockWorkspace2Props({ model: model as any, editMode: true })} />);

    const allLocations = screen.getByRole('checkbox', { name: 'Select all locations' });
    expect((allLocations as HTMLInputElement).indeterminate).toBe(true);
    await user.click(allLocations);
    await user.click(screen.getByRole('button', { name: /save/i }));

    await waitFor(() => expect(createOrUpdateUserRoleScope).toHaveBeenCalled());
    const savedModel = vi.mocked(createOrUpdateUserRoleScope).mock.calls.at(-1)?.[0];
    expect(savedModel?.locations).toEqual([
      { locationUuid: 'store', locationName: 'Store', enableDescendants: true },
      { locationUuid: 'pharmacy', locationName: 'Pharmacy', enableDescendants: false },
    ]);
    expect(savedModel?.operationTypes).toHaveLength(1);
  });
});
