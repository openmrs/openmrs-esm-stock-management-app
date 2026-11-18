import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Button,
  DataTable,
  DataTableSkeleton,
  Pagination,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableExpandedRow,
  TableExpandHeader,
  TableExpandRow,
  TableHead,
  TableHeader,
  TableRow,
  TableToolbar,
  TableToolbarAction,
  TableToolbarContent,
  TableToolbarMenu,
  TableToolbarSearch,
  Tag,
  Tile,
} from '@carbon/react';
import { isDesktop, restBaseUrl, useLayoutType, useSession } from '@openmrs/esm-framework';
import { formatDisplayDate } from '../core/utils/datetimeUtils';
import { useHandleMutate } from '../utils';
import { ResourceRepresentation } from '../core/api/api';
import { type UserRoleScope } from '../core/api/types/identity/UserRoleScope';
import { type UserRoleScopeLocation } from '../core/api/types/identity/UserRoleScopeLocation';
import { useStockOperationTypes } from '../stock-lookups/stock-lookups.resource';
import AddStockUserRoleScopeActionButton from './add-stock-user-role-scope-button.component';
import EditStockUserRoleActionsMenu from './edit-stock-user-scope/edit-stock-user-scope-action-menu.component';
import StockUserScopeDeleteActionMenu from './delete-stock-user-scope/delete-stock-user-scope.component';
import useStockUserRoleScopesPage from './stock-user-role-scopes-items-table.resource';
import styles from './stock-user-role-scopes.scss';

const INLINE_OPERATION_NAME_LIMIT = 3;
const VISIBLE_LOCATION_COUNT = 3;
const LOCATION_OVERFLOW_AFTER = 4;

function operationNames(scope: UserRoleScope) {
  return scope.operationTypes?.map((operation) => operation?.operationTypeName).filter(Boolean) ?? [];
}

interface LocationChipsProps {
  locations: UserRoleScopeLocation[];
  children?: React.ReactNode;
}

function LocationChips({ locations, children }: LocationChipsProps) {
  const { t } = useTranslation();

  return (
    <div className={styles.locationChips}>
      {locations.map((location) => (
        <Tag key={location.locationUuid || location.uuid} size="sm" type="blue">
          {location.enableDescendants
            ? t('locationWithChildren', '{{locationName}} +children', { locationName: location.locationName })
            : location.locationName}
        </Tag>
      ))}
      {children}
    </div>
  );
}

interface LocationsSummaryProps {
  locations: UserRoleScopeLocation[];
  onShowMore: () => void;
}

function LocationsSummary({ locations, onShowMore }: LocationsSummaryProps) {
  const { t } = useTranslation();

  if (!locations.length) {
    return <span>{t('none', 'None')}</span>;
  }

  const visible = locations.length > LOCATION_OVERFLOW_AFTER ? locations.slice(0, VISIBLE_LOCATION_COUNT) : locations;
  const hiddenCount = locations.length - visible.length;

  return (
    <LocationChips locations={visible}>
      {hiddenCount > 0 && (
        <Button kind="ghost" size="sm" className={styles.moreLink} onClick={onShowMore}>
          {t('moreLocations', '+{{count}} more', { count: hiddenCount })}
        </Button>
      )}
    </LocationChips>
  );
}

interface OperationsSummaryProps {
  names: string[];
  totalOperationTypes: number;
  onShowMore: () => void;
}

function OperationsSummary({ names, totalOperationTypes, onShowMore }: OperationsSummaryProps) {
  const { t } = useTranslation();

  if (!names.length) {
    return <span>{t('none', 'None')}</span>;
  }

  if (names.length <= INLINE_OPERATION_NAME_LIMIT) {
    return <span>{names.join(', ')}</span>;
  }

  let label = t('selectedOperations', '{{count}} operations', { count: names.length });
  if (totalOperationTypes > 0 && names.length >= totalOperationTypes) {
    label = t('allOperations', 'All operations');
  } else if (totalOperationTypes > 0) {
    label = t('selectedOperationsOfTotal', '{{count}} of {{total}}', {
      count: names.length,
      total: totalOperationTypes,
    });
  }

  return (
    <Button kind="ghost" size="sm" className={styles.moreLink} onClick={onShowMore}>
      {label}
    </Button>
  );
}

interface ScopeDetailsProps {
  scope: UserRoleScope;
}

function displayDate(date: UserRoleScope['activeFrom']) {
  return formatDisplayDate(date) || undefined;
}

function ScopeDetails({ scope }: ScopeDetailsProps) {
  const { t } = useTranslation();
  const names = operationNames(scope);
  const locations = scope.locations ?? [];
  const notSet = t('notSet', 'Not Set');

  return (
    <div className={styles.expandedDetails}>
      <div>
        <p className={styles.expandedHeading}>{t('stockOperations', 'Stock operations')}</p>
        <p>{names.length ? names.join(', ') : t('none', 'None')}</p>
      </div>
      <div>
        <p className={styles.expandedHeading}>{t('locations', 'Locations')}</p>
        {locations.length ? <LocationChips locations={locations} /> : <p>{t('none', 'None')}</p>}
      </div>
      <div className={styles.expandedMeta}>
        <div>
          <p className={styles.expandedHeading}>{t('permanent', 'Permanent')}</p>
          <p>{scope.permanent ? t('yes', 'Yes') : t('no', 'No')}</p>
        </div>
        <div>
          <p className={styles.expandedHeading}>{t('activeFrom', 'Active From')}</p>
          <p>{displayDate(scope.activeFrom) ?? notSet}</p>
        </div>
        <div>
          <p className={styles.expandedHeading}>{t('activeTo', 'Active To')}</p>
          <p>{displayDate(scope.activeTo) ?? notSet}</p>
        </div>
      </div>
    </div>
  );
}

function StockUserRoleScopesItems() {
  const { t } = useTranslation();
  const handleMutate = useHandleMutate();
  const currentUser = useSession();
  const layout = useLayoutType();
  const { types: operationTypes } = useStockOperationTypes();
  const totalOperationTypes = operationTypes?.results?.length ?? 0;

  const handleRefresh = () => {
    handleMutate(`${restBaseUrl}/stockmanagement/userrolescope`);
  };

  const { items, totalItems, currentPage, pageSizes, goTo, currentPageSize, setPageSize, isLoading } =
    useStockUserRoleScopesPage({
      v: ResourceRepresentation.Default,
      totalCount: true,
    });

  const tableHeaders = useMemo(
    () => [
      {
        id: 0,
        header: t('user', 'User'),
        key: 'user',
      },
      {
        id: 1,
        header: t('role', 'Role'),
        key: 'role',
      },
      {
        id: 2,
        header: t('locations', 'Locations'),
        key: 'locations',
      },
      {
        id: 3,
        header: t('stockOperations', 'Stock operations'),
        key: 'stockOperations',
      },
      {
        id: 4,
        header: t('enabled', 'Enabled'),
        key: 'enabled',
      },
      {
        id: 5,
        header: t('actions', 'Actions'),
        key: 'actions',
      },
    ],
    [t],
  );

  const scopesById = useMemo(() => {
    return new Map((items ?? []).map((scope) => [scope.uuid, scope]));
  }, [items]);

  const tableRows = useMemo(() => {
    return items?.map((userRoleScope, index) => {
      const isCurrentUser = currentUser.user.uuid === userRoleScope.userUuid;
      const names = operationNames(userRoleScope);
      return {
        ...userRoleScope,
        id: userRoleScope?.uuid,
        key: `key-${userRoleScope?.uuid}`,
        uuid: `${userRoleScope?.uuid}`,
        user: `${userRoleScope?.userFamilyName} ${userRoleScope.userGivenName}`,

        roleName: userRoleScope?.role,
        locations: (userRoleScope?.locations ?? []).map((location) => location.locationName).join(', '),
        stockOperations: names.join(', '),
        enabled: userRoleScope?.enabled ? t('yes', 'Yes') : t('no', 'No'),
        actions: (
          <div className={styles.actions}>
            {!isCurrentUser && (
              <>
                <EditStockUserRoleActionsMenu data={items[index]} />
                <StockUserScopeDeleteActionMenu uuid={items[index].uuid} />
              </>
            )}
          </div>
        ),
      };
    });
  }, [currentUser.user.uuid, items, t]);

  if (isLoading) {
    return <DataTableSkeleton role="progressbar" />;
  }

  return (
    <div className={styles.tableOverride}>
      <h2 className={styles.tableHeader}>
        {t(
          'stockUserRoleScopesTableHeader',
          'To access stock management features, users must have assigned roles specifying location and stock operation type scopes.',
        )}
      </h2>
      <DataTable headers={tableHeaders} isSortable rows={tableRows ?? []} useZebraStyles>
        {({
          expandRow,
          getExpandedRowProps,
          rows,
          headers,
          getHeaderProps,
          getTableProps,
          getRowProps,
          onInputChange,
        }) => (
          <TableContainer>
            <TableToolbar
              style={{
                position: 'static',
                overflow: 'visible',
                backgroundColor: 'color',
              }}
            >
              <TableToolbarContent className={styles.toolbarContent}>
                <TableToolbarSearch persistent onChange={onInputChange} />
                <TableToolbarMenu>
                  <TableToolbarAction className={styles.toolbarAction} onClick={handleRefresh}>
                    {t('refresh', 'Refresh')}
                  </TableToolbarAction>
                </TableToolbarMenu>
                <AddStockUserRoleScopeActionButton />
              </TableToolbarContent>
            </TableToolbar>
            <Table {...getTableProps()}>
              <TableHead>
                <TableRow>
                  <TableExpandHeader />
                  {headers.map(
                    (header: any) =>
                      header.key !== 'details' && (
                        <TableHeader
                          {...getHeaderProps({
                            header,
                            isSortable: header.isSortable,
                          })}
                          className={isDesktop(layout) ? styles.desktopHeader : styles.tabletHeader}
                          key={`${header.key}`}
                        >
                          {header.header?.content ?? header.header}
                        </TableHeader>
                      ),
                  )}
                </TableRow>
              </TableHead>
              <TableBody>
                {rows.map((row: any) => {
                  const scope = scopesById.get(row.id);
                  const props = getRowProps({ row });
                  const expandedRowProps = getExpandedRowProps({ row });
                  return (
                    <React.Fragment key={row.id}>
                      <TableExpandRow className={isDesktop(layout) ? styles.desktopRow : styles.tabletRow} {...props}>
                        {row.cells.map((cell: any) => {
                          if (cell?.info?.header === 'locations' && scope) {
                            return (
                              <TableCell key={cell.id}>
                                <LocationsSummary
                                  locations={scope.locations ?? []}
                                  onShowMore={() => !row.isExpanded && expandRow(row.id)}
                                />
                              </TableCell>
                            );
                          }
                          if (cell?.info?.header === 'stockOperations' && scope) {
                            return (
                              <TableCell key={cell.id}>
                                <OperationsSummary
                                  names={operationNames(scope)}
                                  onShowMore={() => !row.isExpanded && expandRow(row.id)}
                                  totalOperationTypes={totalOperationTypes}
                                />
                              </TableCell>
                            );
                          }
                          return <TableCell key={cell.id}>{cell.value}</TableCell>;
                        })}
                      </TableExpandRow>
                      <TableExpandedRow {...expandedRowProps} colSpan={headers.length + 1}>
                        {row.isExpanded && scope ? <ScopeDetails scope={scope} /> : null}
                      </TableExpandedRow>
                    </React.Fragment>
                  );
                })}
              </TableBody>
            </Table>
            {rows.length === 0 ? (
              <div className={styles.tileContainer}>
                <Tile className={styles.tile}>
                  <div className={styles.tileContent}>
                    <p className={styles.content}>
                      {t('noStockUserRoleScopesToDisplay', 'No stock user role scopes to display')}
                    </p>
                    <p className={styles.helper}>{t('checkFilters', 'Check the filters above')}</p>
                  </div>
                </Tile>
              </div>
            ) : null}
          </TableContainer>
        )}
      </DataTable>
      <Pagination
        page={currentPage}
        pageSize={currentPageSize}
        pageSizes={pageSizes}
        totalItems={totalItems}
        onChange={({ pageSize, page }) => {
          if (pageSize !== currentPageSize) {
            setPageSize(pageSize);
          }
          if (page !== currentPage) {
            goTo(page);
          }
        }}
        className={styles.paginationOverride}
      />
    </div>
  );
}

export default StockUserRoleScopesItems;
