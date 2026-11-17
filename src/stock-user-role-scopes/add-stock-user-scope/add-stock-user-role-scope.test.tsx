import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useConfig } from '@openmrs/esm-framework';
import { mockWorkspace2Props } from '@mocks';
import useSearchUser from '../../stock-operations/stock-operations-forms/hooks/useSearchUser';
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
