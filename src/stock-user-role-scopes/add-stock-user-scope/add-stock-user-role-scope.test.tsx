import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { showSnackbar, useConfig } from '@openmrs/esm-framework';
import { mockWorkspace2Props } from '@mocks';
import { type UserRoleScope } from '../../core/api/types/identity/UserRoleScope';
import useSearchUser from '../../stock-operations/stock-operations-forms/hooks/useSearchUser';
import { createOrUpdateUserRoleScope } from '../stock-user-role-scopes.resource';
import AddStockUserRoleScope from './add-stock-user-role-scope.workspace';

vi.mock('../../stock-lookups/stock-lookups.resource', () => ({
  useRoles: vi.fn(() => ({ isLoading: false })),
  useStockOperationTypes: vi.fn(() => ({ types: { results: [] }, isLoading: false })),
  useStockTagLocations: vi.fn(() => ({ stockLocations: [], isLoading: false })),
  useUser: vi.fn(() => ({ data: {} })),
}));
vi.mock('../../stock-operations/stock-operations-forms/hooks/useSearchUser', () => ({ default: vi.fn() }));
vi.mock('../stock-user-role-scopes.resource', () => ({ createOrUpdateUserRoleScope: vi.fn() }));
vi.mock('../../utils', () => ({ useHandleMutate: vi.fn(() => vi.fn()) }));

describe('AddStockUserRoleScope stock roles', () => {
  beforeEach(() => {
    vi.mocked(useConfig).mockReturnValue({ stockRoleUUIDs: ['configured-role-uuid'] });
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

const invalidMessage = 'Enter a valid date in the format DD/MM/YYYY that is not in the past';
const model = { uuid: 'scope-uuid', userUuid: 'user-uuid', role: 'Inventory Clerk' } as unknown as UserRoleScope;

describe('AddStockUserRoleScope typed active dates', () => {
  beforeEach(() => {
    vi.mocked(useConfig).mockReturnValue({});
    vi.mocked(useSearchUser).mockReturnValue({ userList: [], setSearchString: vi.fn(), isLoading: false } as never);
    vi.mocked(createOrUpdateUserRoleScope).mockResolvedValue({} as never);
  });

  it('marks a date before today as invalid and does not save it', async () => {
    const user = userEvent.setup();
    render(<AddStockUserRoleScope {...mockWorkspace2Props({ model })} />);

    fireEvent.change(screen.getByLabelText('Active From'), { target: { value: '01/01/2020' } });

    expect(await screen.findByText(invalidMessage)).toBeInTheDocument();
    expect(screen.getByLabelText('Active From')).toHaveAttribute('data-invalid', 'true');

    await user.click(screen.getByRole('button', { name: /save/i }));

    expect(showSnackbar).toHaveBeenCalledWith(expect.objectContaining({ kind: 'error', subtitle: invalidMessage }));
    expect(createOrUpdateUserRoleScope).not.toHaveBeenCalled();
  });

  it('saves a valid typed date and clears the error once corrected', async () => {
    const user = userEvent.setup();
    render(<AddStockUserRoleScope {...mockWorkspace2Props({ model })} />);

    fireEvent.change(screen.getByLabelText('Active To'), { target: { value: '01/01/2020' } });
    expect(await screen.findByText(invalidMessage)).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('Active To'), { target: { value: '31/12/2999' } });
    await waitFor(() => expect(screen.queryByText(invalidMessage)).not.toBeInTheDocument());

    await user.click(screen.getByRole('button', { name: /save/i }));

    await waitFor(() =>
      expect(createOrUpdateUserRoleScope).toHaveBeenCalledWith(
        expect.objectContaining({ activeTo: new Date(2999, 11, 31) }),
      ),
    );
  });

  it('saves no Active To once a typed date is cleared from the box', async () => {
    const user = userEvent.setup();
    render(<AddStockUserRoleScope {...mockWorkspace2Props({ model })} />);

    fireEvent.change(screen.getByLabelText('Active To'), { target: { value: '31/12/2999' } });
    fireEvent.change(screen.getByLabelText('Active To'), { target: { value: '' } });
    await user.click(screen.getByRole('button', { name: /save/i }));

    await waitFor(() => expect(createOrUpdateUserRoleScope).toHaveBeenCalled());
    expect(vi.mocked(createOrUpdateUserRoleScope).mock.lastCall[0].activeTo).toBeUndefined();
  });

  it('drops an invalid date error when Permanent is turned on and off', async () => {
    const user = userEvent.setup();
    render(<AddStockUserRoleScope {...mockWorkspace2Props({ model })} />);

    fireEvent.change(screen.getByLabelText('Active To'), { target: { value: '01/01/2020' } });
    expect(await screen.findByText(invalidMessage)).toBeInTheDocument();

    await user.click(screen.getByRole('checkbox', { name: 'Permanent' }));
    await user.click(screen.getByRole('checkbox', { name: 'Permanent' }));

    expect(screen.getByLabelText('Active To')).toHaveValue('');
    expect(screen.queryByText(invalidMessage)).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /save/i }));
    expect(showSnackbar).not.toHaveBeenCalledWith(expect.objectContaining({ subtitle: invalidMessage }));
  });
});
