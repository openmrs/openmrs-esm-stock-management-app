import React from 'react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { useSession, userHasAccess } from '@openmrs/esm-framework';
import { type UserRoleScope } from '../core/api/types/identity/UserRoleScope';
import useStockUserRoleScopesPage from './stock-user-role-scopes-items-table.resource';
import StockUserRoleScopesItems from './stock-user-role-scopes-items-table.component';

vi.mock('./stock-user-role-scopes-items-table.resource', () => ({
  default: vi.fn(),
}));

const mockUseStockUserRoleScopesPage = vi.mocked(useStockUserRoleScopesPage);
const mockUseSession = vi.mocked(useSession);
const mockUserHasAccess = vi.mocked(userHasAccess);

const userRoleScope = {
  uuid: 'scope-1',
  userUuid: 'other-user-uuid',
  userFamilyName: 'Doe',
  userGivenName: 'Jane',
  role: 'Inventory Clerk',
  locations: [],
  operationTypes: [],
  permanent: false,
  activeFrom: new Date('2026-01-01'),
  activeTo: new Date('2026-12-31'),
  enabled: true,
} as unknown as UserRoleScope;

const buildPageResult = (overrides: Partial<ReturnType<typeof useStockUserRoleScopesPage>> = {}) =>
  ({
    items: [userRoleScope],
    totalItems: 1,
    currentPage: 1,
    currentPageSize: 10,
    pageSizes: [10, 20, 50],
    goTo: vi.fn(),
    setPageSize: vi.fn(),
    paginatedItems: [userRoleScope],
    isLoading: false,
    error: undefined,
    ...overrides,
  } as ReturnType<typeof useStockUserRoleScopesPage>);

describe('StockUserRoleScopesItems', () => {
  beforeEach(() => {
    mockUseSession.mockReturnValue({
      authenticated: true,
      sessionId: 'test-session-id',
      user: {
        uuid: 'current-user-uuid',
        display: 'Current User',
        username: 'currentuser',
        systemId: 'test-system-id',
        userProperties: {},
        person: { uuid: 'test-person-uuid' },
        privileges: [],
        roles: [],
        retired: false,
        links: [],
        locale: 'en',
        allowedLocales: ['en'],
      },
      sessionLocation: {
        uuid: 'test-location-uuid',
        display: 'Test Location',
        links: [],
      },
    });
  });

  it('renders an error state instead of the empty list when loading fails', () => {
    mockUserHasAccess.mockReturnValue(false);
    mockUseStockUserRoleScopesPage.mockReturnValue(
      buildPageResult({
        items: [],
        paginatedItems: [],
        totalItems: 0,
        error: new Error('Failed to load user role scopes'),
      }),
    );

    render(<StockUserRoleScopesItems />);

    expect(screen.getByText(/error state/i)).toBeInTheDocument();
    expect(screen.queryByText(/no stock user role scopes to display/i)).not.toBeInTheDocument();
  });

  it('shows the add button when the user has the mutate privilege', () => {
    mockUserHasAccess.mockReturnValue(true);
    mockUseStockUserRoleScopesPage.mockReturnValue(buildPageResult());

    render(<StockUserRoleScopesItems />);

    expect(screen.getByRole('button', { name: /add new user role scope/i })).toBeInTheDocument();
  });

  it('hides the add button when the user lacks the mutate privilege', () => {
    mockUserHasAccess.mockReturnValue(false);
    mockUseStockUserRoleScopesPage.mockReturnValue(buildPageResult());

    render(<StockUserRoleScopesItems />);

    expect(screen.queryByRole('button', { name: /add new user role scope/i })).not.toBeInTheDocument();
  });
});
