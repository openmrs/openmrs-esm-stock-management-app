import React from 'react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { type Session, useSession } from '@openmrs/esm-framework';
import { type UserRoleScope } from '../core/api/types/identity/UserRoleScope';
import useStockUserRoleScopesPage from './stock-user-role-scopes-items-table.resource';
import StockUserRoleScopesItems from './stock-user-role-scopes-items-table.component';

const mockUseStockUserRoleScopesPage = vi.mocked(useStockUserRoleScopesPage);
const mockUseSession = vi.mocked(useSession);

vi.mock('./stock-user-role-scopes-items-table.resource', () => ({
  default: vi.fn(),
}));

vi.mock('../utils', () => ({
  useHandleMutate: () => vi.fn(),
}));

vi.mock('./edit-stock-user-scope/edit-stock-user-scope-action-menu.component', () => ({
  default: () => <button>Edit</button>,
}));

vi.mock('./delete-stock-user-scope/delete-stock-user-scope.component', () => ({
  default: () => <button>Delete</button>,
}));

const scope = (uuid: string, userUuid: string, familyName: string, givenName: string) =>
  ({
    uuid,
    userUuid,
    userFamilyName: familyName,
    userGivenName: givenName,
    role: 'Inventory Clerk',
    locations: [],
    operationTypes: [],
    permanent: true,
    enabled: true,
  } as UserRoleScope);

describe('StockUserRoleScopesItems', () => {
  beforeEach(() => {
    mockUseSession.mockReturnValue({ user: { uuid: 'current-user' } } as Session);
    mockUseStockUserRoleScopesPage.mockReturnValue({
      items: [scope('scope-1', 'current-user', 'Admin', 'Super'), scope('scope-2', 'other-user', 'Doe', 'Jane')],
      totalItems: 2,
      currentPage: 1,
      currentPageSize: 10,
      paginatedItems: [],
      goTo: vi.fn(),
      pageSizes: [10, 20],
      isLoading: false,
      error: null,
      setPageSize: vi.fn(),
    });
  });

  it('shows user names as plain text, without links to routes the app does not serve', () => {
    render(<StockUserRoleScopesItems />);

    expect(screen.getByText('Admin Super')).toBeInTheDocument();
    expect(screen.getByText('Doe Jane')).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Doe Jane' })).not.toBeInTheDocument();
  });
});
