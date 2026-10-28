import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { mockWorkspace2Props } from '@mocks';
import { createOrUpdateUserRoleScope } from '../stock-user-role-scopes.resource';
import {
  useRoles,
  useStockOperationTypes,
  useStockTagLocations,
  useUser,
} from '../../stock-lookups/stock-lookups.resource';
import AddStockUserRoleScope from './add-stock-user-role-scope.workspace';

const { mockUserList } = vi.hoisted(() => ({ mockUserList: [] as any[] }));

vi.mock('../../stock-lookups/stock-lookups.resource', () => ({
  useRoles: vi.fn(() => ({ isLoading: false })),
  useStockOperationTypes: vi.fn(),
  useStockTagLocations: vi.fn(),
  useUser: vi.fn(() => ({ data: undefined })),
}));

vi.mock('../stock-user-role-scopes.resource', () => ({
  createOrUpdateUserRoleScope: vi.fn(),
}));

vi.mock('../../stock-operations/stock-operations-forms/hooks/useSearchUser', () => ({
  default: vi.fn(() => ({ userList: mockUserList, setSearchString: vi.fn(), isLoading: false })),
}));

vi.mock('../../utils', () => ({ useHandleMutate: vi.fn(() => vi.fn()) }));

const operationTypes = [
  { uuid: 'receive', name: 'Receive' },
  { uuid: 'issue', name: 'Issue' },
];
const locations = [
  { id: 'store', name: 'Store' },
  { id: 'pharmacy', name: 'Pharmacy' },
];

describe('AddStockUserRoleScope group selection', () => {
  beforeEach(() => {
    vi.useRealTimers();
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

    const allOperations = screen.getByLabelText('Select all', { selector: '#chk-all-stock-operations' });
    const allLocations = screen.getByLabelText('Select all', { selector: '#chk-all-stock-locations' });
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

    const allLocations = screen.getByLabelText('Select all', { selector: '#chk-all-stock-locations' });
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
