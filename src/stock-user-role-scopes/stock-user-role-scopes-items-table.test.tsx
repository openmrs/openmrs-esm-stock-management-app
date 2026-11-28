import React from 'react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { type Session, useSession, userHasAccess } from '@openmrs/esm-framework';
import { roleScopeOperationTypes, userRoleScopeMock } from '../../__mocks__/user-role-scope.mock';
import { type UserRoleScope } from '../core/api/types/identity/UserRoleScope';
import { useStockOperationTypes } from '../stock-lookups/stock-lookups.resource';
import useStockUserRoleScopesPage from './stock-user-role-scopes-items-table.resource';
import StockUserRoleScopesItems from './stock-user-role-scopes-items-table.component';

const mockUseStockUserRoleScopesPage = vi.mocked(useStockUserRoleScopesPage);
const mockUseSession = vi.mocked(useSession);
const mockUserHasAccess = vi.mocked(userHasAccess);
const mockUseStockOperationTypes = vi.mocked(useStockOperationTypes);

vi.mock('./stock-user-role-scopes-items-table.resource', () => ({
  default: vi.fn(),
}));

vi.mock('../stock-lookups/stock-lookups.resource', () => ({
  useStockOperationTypes: vi.fn(),
}));

vi.mock('../utils', () => ({
  useHandleMutate: () => vi.fn(),
}));

vi.mock('./edit-stock-user-scope/edit-stock-user-scope-action-menu.component', () => ({
  default: () => <button>Edit user role scope</button>,
}));

vi.mock('./delete-stock-user-scope/delete-stock-user-scope.component', () => ({
  default: () => <button>Delete user role scope</button>,
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

const currentUserScope: UserRoleScope = {
  ...userRoleScopeMock,
  uuid: 'scope-admin',
  userUuid: 'current-user',
  userFamilyName: 'Admin',
  userGivenName: 'Super',
  locations: [],
  operationTypes: [],
};

const largeScope: UserRoleScope = {
  ...userRoleScopeMock,
  operationTypes: userRoleScopeMock.operationTypes.slice(0, 4),
};

function mockScopes(items: UserRoleScope[]) {
  mockUseStockUserRoleScopesPage.mockReturnValue({
    items,
    totalItems: items.length,
    currentPage: 1,
    currentPageSize: 10,
    paginatedItems: items,
    goTo: vi.fn(),
    pageSizes: [10, 20],
    isLoading: false,
    error: null,
    setPageSize: vi.fn(),
  });
}

const buildPageResult = (overrides: Partial<ReturnType<typeof useStockUserRoleScopesPage>> = {}) =>
  ({
    items: [scope('scope-1', 'other-user', 'Doe', 'Jane')],
    totalItems: 1,
    currentPage: 1,
    currentPageSize: 10,
    pageSizes: [10, 20, 50],
    goTo: vi.fn(),
    setPageSize: vi.fn(),
    paginatedItems: [],
    isLoading: false,
    error: undefined,
    ...overrides,
  } as ReturnType<typeof useStockUserRoleScopesPage>);

describe('StockUserRoleScopesItems', () => {
  beforeEach(() => {
    mockUseSession.mockReturnValue({ user: { uuid: 'current-user' } } as Session);
    mockUserHasAccess.mockReturnValue(true);
    mockScopes([currentUserScope, largeScope]);
    mockUseStockOperationTypes.mockReturnValue({
      types: { results: roleScopeOperationTypes, totalCount: roleScopeOperationTypes.length, links: [] },
      isLoading: false,
      error: null,
    });
  });

  it('shows user names as plain text, without links to routes the app does not serve', () => {
    render(<StockUserRoleScopesItems />);

    expect(screen.getByText('Admin Super')).toBeInTheDocument();
    expect(screen.getByText('Doe Jane')).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Doe Jane' })).not.toBeInTheDocument();
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
    expect(screen.getByRole('button', { name: /edit user role scope/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /delete user role scope/i })).toBeInTheDocument();
  });

  it('hides the add button when the user lacks the mutate privilege', () => {
    mockUserHasAccess.mockReturnValue(false);
    mockUseStockUserRoleScopesPage.mockReturnValue(buildPageResult());

    render(<StockUserRoleScopesItems />);

    expect(screen.queryByRole('button', { name: /add new user role scope/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /edit user role scope/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /delete user role scope/i })).not.toBeInTheDocument();
  });

  it('shows three operations and four locations in full without summary buttons', () => {
    mockScopes([
      {
        ...largeScope,
        operationTypes: userRoleScopeMock.operationTypes.slice(0, 3),
        locations: userRoleScopeMock.locations.slice(0, 4),
      },
    ]);
    render(<StockUserRoleScopesItems />);

    const row = within(screen.getByRole('row', { name: /Doe Jane/ }));
    expect(row.getByText('Adjustment, Disposal, Transfer Out')).toBeVisible();
    expect(row.getByText('Central Medical Supplies Main Store +children')).toBeVisible();
    expect(row.getByText('Outpatient Department Main Pharmacy', { exact: true })).toBeVisible();
    expect(row.getByText('Maternal and Child Health Pharmacy')).toBeVisible();
    expect(row.getByText('Emergency and Trauma Department Store')).toBeVisible();
    expect(row.queryByRole('button', { name: /more|of 9|All operations/ })).not.toBeInTheDocument();
  });

  it('summarizes four operations and five locations while retaining the first three locations', () => {
    render(<StockUserRoleScopesItems />);

    const row = within(screen.getByRole('row', { name: /Doe Jane/ }));
    expect(row.getByRole('button', { name: '4 of 9' })).toBeVisible();
    expect(row.getByRole('button', { name: '+2 more' })).toBeVisible();
    expect(row.getByText('Central Medical Supplies Main Store +children')).toBeVisible();
    expect(row.getByText('Outpatient Department Main Pharmacy', { exact: true })).toBeVisible();
    expect(row.getByText('Maternal and Child Health Pharmacy')).toBeVisible();
    expect(screen.queryByText('Emergency and Trauma Department Store')).not.toBeInTheDocument();
    expect(screen.queryByText('Community Outreach Supply Store')).not.toBeInTheDocument();
    expect(screen.queryByText('Adjustment, Disposal, Transfer Out, Receipt')).not.toBeInTheDocument();
  });

  it('lets users inspect every operation from the All operations summary', async () => {
    const user = userEvent.setup();
    mockScopes([userRoleScopeMock]);
    render(<StockUserRoleScopesItems />);

    await user.click(screen.getByRole('button', { name: 'All operations' }));

    expect(
      screen.getByText(
        'Adjustment, Disposal, Transfer Out, Receipt, Return, Stock Issue, Requisition, Stock Take, Opening Stock',
      ),
    ).toBeVisible();
  });

  it.each([
    { first: '+2 more', second: '4 of 9', tabs: 1 },
    { first: '4 of 9', second: '+2 more', tabs: 2 },
  ])(
    'opens details from "$first" with the keyboard and keeps them open after "$second"',
    async ({ first, second, tabs }) => {
      const user = userEvent.setup();
      render(<StockUserRoleScopesItems />);
      const row = within(screen.getByRole('row', { name: /Doe Jane/ }));

      row.getByRole('button', { name: 'Expand current row' }).focus();
      for (let index = 0; index < tabs; index++) {
        await user.tab();
      }
      expect(row.getByRole('button', { name: first })).toHaveFocus();
      await user.keyboard('{Enter}');

      const details = within(screen.getByRole('row', { name: /^Stock operations / }));
      expect(details.getByText('Adjustment, Disposal, Transfer Out, Receipt')).toBeVisible();
      expect(details.getByText('Central Medical Supplies Main Store +children')).toBeVisible();
      expect(details.getByText('Outpatient Department Main Pharmacy', { exact: true })).toBeVisible();
      expect(details.getByText('Maternal and Child Health Pharmacy')).toBeVisible();
      expect(details.getByText('Emergency and Trauma Department Store')).toBeVisible();
      expect(details.getByText('Community Outreach Supply Store')).toBeVisible();
      expect(details.getByText('Permanent')).toBeVisible();
      expect(details.getByText('No')).toBeVisible();
      expect(details.getByText('Active From')).toBeVisible();
      expect(details.getByText('01-Jan-2026')).toBeVisible();
      expect(details.getByText('Active To')).toBeVisible();
      expect(details.getByText('Not Set')).toBeVisible();

      await user.click(row.getByRole('button', { name: first }));
      expect(details.getByText('Community Outreach Supply Store')).toBeVisible();
      await user.click(row.getByRole('button', { name: second }));
      expect(details.getByText('Community Outreach Supply Store')).toBeVisible();

      await user.click(row.getByRole('button', { name: 'Collapse current row' }));
      expect(screen.queryByText('Community Outreach Supply Store')).not.toBeInTheDocument();
      expect(screen.queryByText('Active From')).not.toBeInTheDocument();
    },
  );

  it.each(['Community Outreach Supply Store', 'Receipt'])(
    'finds and expands the correct scope when searching for hidden "%s"',
    async (searchTerm) => {
      const user = userEvent.setup();
      render(<StockUserRoleScopesItems />);
      expect(screen.queryByText(searchTerm, { exact: true })).not.toBeInTheDocument();

      await user.type(screen.getByRole('searchbox'), searchTerm);

      expect(screen.queryByText('Admin Super')).not.toBeInTheDocument();
      const row = within(screen.getByRole('row', { name: /Doe Jane/ }));
      await user.click(row.getByRole('button', { name: 'Expand current row' }));
      const details = within(screen.getByRole('row', { name: /^Stock operations / }));
      expect(details.getByText('Community Outreach Supply Store')).toBeVisible();
      expect(details.getByText('Adjustment, Disposal, Transfer Out, Receipt')).toBeVisible();

      await user.clear(screen.getByRole('searchbox'));
      expect(screen.getByText('Admin Super')).toBeVisible();
      expect(screen.getByText('Doe Jane')).toBeVisible();
    },
  );

  it('keeps scopes readable and expandable when the operation lookup fails', async () => {
    const user = userEvent.setup();
    mockUseStockOperationTypes.mockReturnValue({
      types: { results: [], totalCount: null, links: [] },
      isLoading: false,
      error: new Error('Operation types unavailable'),
    });
    render(<StockUserRoleScopesItems />);

    const row = within(screen.getByRole('row', { name: /Doe Jane/ }));
    await user.click(row.getByRole('button', { name: '4 operations' }));

    expect(screen.getByText('Adjustment, Disposal, Transfer Out, Receipt')).toBeVisible();
    expect(screen.getByText('Community Outreach Supply Store')).toBeVisible();
  });
});
