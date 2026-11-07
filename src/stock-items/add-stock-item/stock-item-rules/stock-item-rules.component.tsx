import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  DataTable,
  DataTableSkeleton,
  Pagination,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableHeader,
  TableRow,
  TableToolbar,
  TableToolbarAction,
  TableToolbarContent,
  TableToolbarMenu,
  TableToolbarSearch,
  Tile,
} from '@carbon/react';
import { isDesktop, restBaseUrl } from '@openmrs/esm-framework';
import { formatDisplayDate } from '../../../core/utils/datetimeUtils';
import { ResourceRepresentation } from '../../../core/api/api';
import { useHandleMutate } from '../../../utils';
import { type StockRule } from '../../../core/api/types/stockItem/StockRule';
import { useStockItemRules } from './stock-item-rules.resource';
import AddStockRuleActionButton from './add-stock-rule-button.component';
import EditStockRuleActionsMenu from './edit-stock-rule.component';
import StockRulesDeleteActionMenu from './stock-rules-delete.component';
import StockRulesFilter, { type StockRuleStatusFilter } from './stock-rules-filter.component';
import styles from '../../stock-items-table.scss';

interface StockItemRulesProps {
  onSubmit?: () => void;
  stockItemUuid: string;
  model?: StockRule;
  canEdit?: boolean;
}

const StockItemRules: React.FC<StockItemRulesProps> = ({ stockItemUuid, model, canEdit = true }) => {
  const { t } = useTranslation();
  const handleMutate = useHandleMutate();
  const [selectedLocationUuid, setSelectedLocationUuid] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<StockRuleStatusFilter>('all');
  const { isLoading, items, tableHeaders, currentPage, currentPageSize, pageSizes, totalItems, setPageSize, goTo } =
    useStockItemRules({
      v: ResourceRepresentation.Default,
      totalCount: true,
      stockItemUuid: stockItemUuid,
      locationUuid: selectedLocationUuid || undefined,
    });

  const handleRefresh = () => {
    handleMutate(`${restBaseUrl}/stockmanagement/stockrule`);
  };

  const tableRows = useMemo(() => {
    const rules =
      selectedStatus === 'all' ? items : items?.filter((rule) => rule.enabled === (selectedStatus === 'enabled'));
    return rules?.map((stockRule, index) => ({
      ...stockRule,
      id: `${stockRule?.id}-${index}`,
      key: `key-${stockRule?.uuid}`,
      uuid: `${stockRule?.uuid}`,
      dateCreated: formatDisplayDate(stockRule?.dateCreated),
      location: stockRule?.locationName,
      quantity: `${stockRule?.quantity?.toLocaleString()} ${stockRule?.packagingUomName ?? ''}`,
      name: `${stockRule?.name}`,
      description: `${stockRule?.description}`,
      evaluationFrequency: `${stockRule?.evaluationFrequency} minutes`,
      actionFrequency: `${stockRule?.actionFrequency} minutes`,
      lastActionDate: formatDisplayDate(stockRule?.lastActionDate),
      nextActionDate: formatDisplayDate(stockRule?.nextActionDate),
      enabled: stockRule.enabled ? 'Yes' : 'No',
      actions: (
        <>
          <EditStockRuleActionsMenu data={stockRule} stockItemUuid={stockRule.stockItemUuid} />
          <StockRulesDeleteActionMenu uuid={stockRule.uuid} name={stockRule.name} />
        </>
      ),
    }));
  }, [items, selectedStatus]);

  // Keep the table mounted while a location filter loads, so the filters keep their values
  if (isLoading && !selectedLocationUuid) {
    return <DataTableSkeleton role="progressbar" />;
  }

  return (
    <div className={styles.tableOverride}>
      <DataTable rows={tableRows ?? []} headers={tableHeaders} isSortable useZebraStyles>
        {({ rows, headers, getHeaderProps, getTableProps, getRowProps, onInputChange }) => (
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
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                  }}
                >
                  <StockRulesFilter
                    stockItemUuid={stockItemUuid}
                    selectedLocationUuid={selectedLocationUuid}
                    selectedStatus={selectedStatus}
                    onLocationChange={(locationUuid) => {
                      setSelectedLocationUuid(locationUuid);
                      goTo(1);
                    }}
                    onStatusChange={(status) => {
                      setSelectedStatus(status);
                      goTo(1);
                    }}
                  />
                </div>
                <TableToolbarMenu>
                  <TableToolbarAction className={styles.toolbarMenuAction} onClick={handleRefresh}>
                    {t('refresh', 'Refresh')}
                  </TableToolbarAction>
                </TableToolbarMenu>
                <AddStockRuleActionButton stockItemUuid={stockItemUuid} />
              </TableToolbarContent>
            </TableToolbar>
            <Table {...getTableProps()}>
              <TableHead>
                <TableRow>
                  {headers.map(
                    (header: any) =>
                      header.key !== 'details' && (
                        <TableHeader
                          {...getHeaderProps({
                            header,
                            isSortable: header.isSortable,
                          })}
                          className={isDesktop ? styles.desktopHeader : styles.tabletHeader}
                          key={`${header.key}`}
                        >
                          {header.header?.content ?? header.header}
                        </TableHeader>
                      ),
                  )}
                  <TableHeader></TableHeader>
                </TableRow>
              </TableHead>
              <TableBody>
                {rows.map((row: any) => {
                  return (
                    <React.Fragment key={row.id}>
                      <TableRow className={isDesktop ? styles.desktopRow : styles.tabletRow} {...getRowProps({ row })}>
                        {row.cells.map(
                          (cell: any) =>
                            cell?.info?.header !== 'details' && <TableCell key={cell.id}>{cell.value}</TableCell>,
                        )}
                      </TableRow>
                    </React.Fragment>
                  );
                })}
              </TableBody>
            </Table>
            {rows.length === 0 ? (
              <div className={styles.tileContainer}>
                <Tile className={styles.tile}>
                  <div className={styles.tileContent}>
                    <p className={styles.content}>{t('noRulesToDisplay', 'No Stock rules to display')}</p>
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
};

export default StockItemRules;
