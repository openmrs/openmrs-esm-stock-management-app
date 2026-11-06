import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useSession } from '@openmrs/esm-framework';
import { type UserRoleScope } from '../core/api/types/identity/UserRoleScope';
import { useStockOperationTypes } from '../stock-lookups/stock-lookups.resource';
import useStockUserRoleScopesPage from './stock-user-role-scopes-items-table.resource';
import StockUserRoleScopesItems from './stock-user-role-scopes-items-table.component';

vi.mock('./stock-user-role-scopes-items-table.resource', () => ({ default: vi.fn() }));
vi.mock('../stock-lookups/stock-lookups.resource', () => ({ useStockOperationTypes: vi.fn() }));
vi.mock('../utils', () => ({ useHandleMutate: vi.fn(() => vi.fn()) }));

const operationTypeNames = [
  'Receipt',
  'Requisition',
  'Stock Issue',
  'Transfer Out',
  'Return',
  'Adjustment',
  'Disposal',
  'Stock Take',
  'Opening Stock',
];

function scope(overrides: object = {}): UserRoleScope {
  return {
    uuid: 'scope-1',
    userUuid: 'other-user',
    userFamilyName: 'Kamau',
    userGivenName: 'Amina',
    role: 'Inventory Clerk',
    permanent: true,
    enabled: true,
    locations: [
      { uuid: 'loc-1', locationUuid: 'loc-1', locationName: 'Main Store', enableDescendants: true },
      { uuid: 'loc-2', locationUuid: 'loc-2', locationName: 'Pharmacy', enableDescendants: false },
    ],
    operationTypes: operationTypeNames.slice(0, 2).map((name, index) => ({
      uuid: `op-${index}`,
      operationTypeUuid: `op-${index}`,
      operationTypeName: name,
    })),
    ...overrides,
  } as UserRoleScope;
}

function mockPage(items: UserRoleScope[]) {
  vi.mocked(useStockUserRoleScopesPage).mockReturnValue({
    items,
    totalItems: items.length,
    currentPage: 1,
    pageSizes: [10],
    goTo: vi.fn(),
    currentPageSize: 10,
    setPageSize: vi.fn(),
    isLoading: false,
    paginatedItems: items,
    error: null,
  });
}

describe('StockUserRoleScopesItems', () => {
  beforeEach(() => {
    vi.mocked(useSession).mockReturnValue({
      user: { uuid: 'current-user' },
    } as ReturnType<typeof useSession>);
    vi.mocked(useStockOperationTypes).mockReturnValue({
      types: {
        results: operationTypeNames.map((name, index) => ({ uuid: `type-${index}`, name })),
        totalCount: operationTypeNames.length,
      },
      isLoading: false,
      error: null,
    } as ReturnType<typeof useStockOperationTypes>);
  });

  it('shows operation names when three or fewer are selected', () => {
    mockPage([
      scope({
        operationTypes: operationTypeNames.slice(0, 3).map((name, index) => ({
          uuid: `op-${index}`,
          operationTypeUuid: `op-${index}`,
          operationTypeName: name,
        })),
      }),
    ]);

    render(<StockUserRoleScopesItems />);

    expect(screen.getByText('Receipt, Requisition, Stock Issue')).toBeInTheDocument();
    expect(screen.queryByText('All operations')).not.toBeInTheDocument();
  });

  it('expands the row when a partial operation count is clicked', async () => {
    const user = userEvent.setup();
    mockPage([
      scope({
        operationTypes: operationTypeNames.slice(0, 4).map((name, index) => ({
          uuid: `op-${index}`,
          operationTypeUuid: `op-${index}`,
          operationTypeName: name,
        })),
      }),
    ]);

    render(<StockUserRoleScopesItems />);

    expect(screen.queryByText('Transfer Out')).not.toBeInTheDocument();
    await user.click(screen.getByText('4 of 9'));
    expect(screen.getByText('Receipt, Requisition, Stock Issue, Transfer Out')).toBeInTheDocument();
  });

  it('expands the row when All operations is clicked', async () => {
    const user = userEvent.setup();
    mockPage([
      scope({
        operationTypes: operationTypeNames.map((name, index) => ({
          uuid: `op-${index}`,
          operationTypeUuid: `op-${index}`,
          operationTypeName: name,
        })),
      }),
    ]);

    render(<StockUserRoleScopesItems />);

    expect(screen.queryByText(/Opening Stock/)).not.toBeInTheDocument();
    await user.click(screen.getByText('All operations'));
    expect(screen.getByText(/Opening Stock/)).toBeInTheDocument();
  });

  it('renders location chips with child inclusion in the label', () => {
    mockPage([scope()]);

    render(<StockUserRoleScopesItems />);

    expect(screen.getByText('Main Store +children')).toBeInTheDocument();
    expect(screen.getByText('Pharmacy')).toBeInTheDocument();
  });

  it('shows the first three locations and the rest in the expanded row', async () => {
    const user = userEvent.setup();
    const locations = ['Main Store', 'Pharmacy', 'Ward', 'Lab', 'Theatre'].map((locationName, index) => ({
      uuid: `loc-${index}`,
      locationUuid: `loc-${index}`,
      locationName,
      enableDescendants: index === 0,
    }));
    mockPage([scope({ locations })]);

    render(<StockUserRoleScopesItems />);

    expect(screen.getByText('Ward')).toBeInTheDocument();
    expect(screen.getByText('+2 more')).toBeInTheDocument();
    expect(screen.queryByText('Lab')).not.toBeInTheDocument();
    expect(screen.queryByText('Theatre')).not.toBeInTheDocument();

    await user.click(screen.getByText('+2 more'));

    expect(screen.getByText('Lab')).toBeInTheDocument();
    expect(screen.getByText('Theatre')).toBeInTheDocument();
  });

  it('keeps the locations, operations, and actions columns width-constrained', () => {
    mockPage([scope()]);

    render(<StockUserRoleScopesItems />);

    expect(screen.getByRole('columnheader', { name: /Locations/ })).toHaveClass('locationsColumn');
    expect(screen.getByRole('columnheader', { name: /Stock operations/ })).toHaveClass('operationsColumn');
    expect(screen.getByRole('columnheader', { name: /Actions/ })).toHaveClass('actionsColumn');
  });
});
