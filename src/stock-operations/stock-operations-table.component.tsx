import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  DataTable,
  DataTableSkeleton,
  DatePicker,
  DatePickerInput,
  InlineLoading,
  InlineNotification,
  Link,
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
  Tile,
} from '@carbon/react';
import { ArrowRight } from '@carbon/react/icons';
import { useTranslation } from 'react-i18next';
import { isDesktop, restBaseUrl, useConfig } from '@openmrs/esm-framework';
import { type ConfigObject } from '../config-schema';
import { type StockOperationDTO } from '../core/api/types/stockOperation/StockOperationDTO';
import { DATE_PICKER_CONTROL_FORMAT, DATE_PICKER_FORMAT, StockFilters } from '../constants';
import { formatDisplayDate } from '../core/utils/datetimeUtils';
import { useHandleMutate } from '../utils';
import { ResourceRepresentation } from '../core/api/api';
import { useDebounce } from '../core/hooks/debounce-hook';
import { useStockOperationPages } from './stock-operations-table.resource';
import EditStockOperationActionMenu from './edit-stock-operation/edit-stock-operation-action-menu.component';
import StockOperationTypesSelector from './stock-operation-types-selector/stock-operation-types-selector.component';
import StockOperationsFilters from './stock-operations-filters.component';
import StockOperationExpandedRow from './add-stock-operation/stock-operations-expanded-row/stock-operation-expanded-row.component';
import styles from './stock-operations-table.scss';

interface StockOperationsTableProps {
  status?: string;
}

// The Items column names the first item of an operation and says how many more there are
function getVisibleItemNames(stockOperation: StockOperationDTO) {
  const itemNames = stockOperation?.stockOperationItems?.map((item) => item.commonName) ?? [];
  return { names: itemNames.slice(0, 1).join(', '), more: Math.max(itemNames.length - 1, 0) };
}

const StockOperations: React.FC<StockOperationsTableProps> = () => {
  const { t } = useTranslation();
  const handleMutate = useHandleMutate();
  const { stockSourceTypeUUID } = useConfig<ConfigObject>();

  const handleRefresh = () => {
    handleMutate(`${restBaseUrl}/stockmanagement/stockoperation`);
  };

  const [selectedFromDate, setSelectedFromDate] = useState(null);
  const [selectedToDate, setSelectedToDate] = useState(null);
  const [selectedSources, setSelectedSources] = useState<string[]>([]);
  const [selectedStatus, setSelectedStatus] = useState<string[]>([]);
  const [selectedOperations, setSelectedOperations] = useState<string[]>([]);
  const [searchInput, setSearchInput] = useState('');
  const [searchString, setSearchString] = useState('');

  const debouncedSearch = useDebounce((query: string) => {
    setSearchString(query);
  }, 500);

  useEffect(() => {
    debouncedSearch(searchInput);
  }, [searchInput, debouncedSearch]);

  const {
    items,
    tableHeaders,
    currentPage,
    pageSizes,
    totalItems,
    goTo,
    currentPageSize,
    setPageSize,
    isLoading,
    error,
  } = useStockOperationPages({
    v: ResourceRepresentation.Full,
    totalCount: true,
    operationDateMin: selectedFromDate?.toISOString(),
    operationDateMax: selectedToDate?.toISOString(),
    status: selectedStatus.join(','),
    sourceTypeUuid: selectedSources.join(','),
    operationTypeUuid: selectedOperations.join(','),
    q: searchString || undefined,
  });

  const filterApplied =
    searchString ||
    selectedFromDate ||
    selectedToDate ||
    selectedSources.length ||
    selectedStatus.length ||
    selectedOperations.length;

  const handleOnFilterChange = useCallback((selectedItems, filterType) => {
    if (filterType === StockFilters.SOURCES) {
      setSelectedSources(selectedItems);
    } else if (filterType === StockFilters.OPERATION) {
      setSelectedOperations(selectedItems);
    } else {
      setSelectedStatus(selectedItems);
    }
  }, []);

  const handleDateFilterChange = ([startDate, endDate]) => {
    if (startDate) {
      setSelectedFromDate(startDate);
      if (selectedToDate && startDate && selectedToDate < startDate) {
        setSelectedToDate(startDate);
      }
    }
    if (endDate) {
      setSelectedToDate(endDate);
      if (selectedFromDate && endDate && selectedFromDate > endDate) {
        setSelectedFromDate(endDate);
      }
    }
  };

  // Carbon sorts a column on its cell values and can only compare text and numbers, so every value here is
  // the text or number to sort that column by. renderCell turns the ones that need it into what the cell shows.
  const tableRows = useMemo(
    () =>
      items?.map((stockOperation) => ({
        ...stockOperation,
        id: stockOperation?.uuid,
        key: `key-${stockOperation?.uuid}`,
        operationTypeName: `${stockOperation?.operationTypeName}`,
        operationNumber: stockOperation?.operationNumber ?? '',
        stockOperationItems: getVisibleItemNames(stockOperation).names,
        status: `${stockOperation?.status}`,
        source: `${stockOperation?.sourceName ?? ''}`,
        destination: `${stockOperation?.destinationName ?? ''}`,
        location: [stockOperation?.sourceName, stockOperation?.destinationName].filter(Boolean).join(' '),
        responsiblePerson: `${
          stockOperation?.responsiblePersonFamilyName ?? stockOperation?.responsiblePersonOther ?? ''
        } ${stockOperation?.responsiblePersonGivenName ?? ''}`,
        operationDate: stockOperation?.operationDate ? new Date(stockOperation.operationDate).getTime() : 0,
        actions: '',
      })),
    [items],
  );

  const itemsById = useMemo(() => new Map((items ?? []).map((op) => [op.uuid, op])), [items]);

  const renderCell = (
    cell: { value: unknown; info: { header: string } },
    operation: StockOperationDTO | undefined,
    showAllItems: () => void,
  ) => {
    if (!operation) {
      return cell.value as React.ReactNode;
    }

    switch (cell.info.header) {
      case 'operationNumber':
        return <EditStockOperationActionMenu stockOperation={operation} showIcon={false} showprops={true} />;
      case 'stockOperationItems': {
        const { names, more } = getVisibleItemNames(operation);
        return (
          <span>
            <span>{names}</span>
            {more > 0 && <Link onClick={showAllItems}>{`...(${more} more)`}</Link>}
          </span>
        );
      }
      case 'location':
        return (
          <>
            {operation.sourceName ?? ''}
            {operation.sourceName && operation.destinationName ? (
              <ArrowRight className={styles.arrowIcon} size={12} />
            ) : (
              ''
            )}{' '}
            {operation.destinationName ?? ''}
          </>
        );
      case 'operationDate':
        return formatDisplayDate(operation.operationDate);
      case 'actions':
        return <EditStockOperationActionMenu stockOperation={operation} showIcon={true} showprops={false} />;
      default:
        return cell.value as React.ReactNode;
    }
  };

  if (isLoading && !filterApplied && !items.length) {
    return (
      <DataTableSkeleton className={styles.dataTableSkeleton} showHeader={false} rowCount={5} columnCount={5} zebra />
    );
  }

  return (
    <>
      <h2 className={styles.tableHeader}>
        {t('stockOperationsTableHeader', 'Stock operations to track movement of stock.')}
      </h2>
      {error ? (
        <InlineNotification
          kind="error"
          lowContrast
          hideCloseButton
          title={t('stockOperationsLoadError', 'Error loading stock operations')}
          subtitle={error?.message}
        />
      ) : null}
      <DataTable headers={tableHeaders} isSortable rows={error ? [] : tableRows} useZebraStyles>
        {({ expandRow, getExpandedRowProps, getHeaderProps, getRowProps, getTableProps, headers, rows }) => (
          <TableContainer>
            {/* TableToolbar doesn't accept a className. A global rule positions toolbars absolutely over the table,
                and Carbon fixes their height, so the toolbar couldn't grow to fit its wrapped controls */}
            <TableToolbar style={{ position: 'static', overflow: 'visible', blockSize: 'auto' }}>
              <TableToolbarContent className={styles.toolbarContent}>
                <TableToolbarSearch
                  className={styles.search}
                  expanded
                  labelText={t('searchStockOperations', 'Search stock operations')}
                  onChange={(e) =>
                    setSearchInput(typeof e === 'string' ? e : (e as React.ChangeEvent<HTMLInputElement>).target.value)
                  }
                  placeholder={t('searchStockOperations', 'Search stock operations')}
                />
                <div className={styles.container}>
                  <DatePicker
                    datePickerType="range"
                    dateFormat={DATE_PICKER_CONTROL_FORMAT}
                    onChange={([startDate, endDate]) => handleDateFilterChange([startDate, endDate])}
                    value={[selectedFromDate, selectedToDate]}
                  >
                    <DatePickerInput
                      id="stock-operations-start-date"
                      labelText={t('startDate', 'Start date')}
                      placeholder={DATE_PICKER_FORMAT}
                    />
                    <DatePickerInput
                      id="stock-operations-end-date"
                      labelText={t('endDate', 'End date')}
                      placeholder={DATE_PICKER_FORMAT}
                    />
                  </DatePicker>
                  <StockOperationsFilters
                    conceptUuid={stockSourceTypeUUID}
                    filterName={StockFilters.SOURCES}
                    onFilterChange={handleOnFilterChange}
                  />
                  <StockOperationsFilters filterName={StockFilters.STATUS} onFilterChange={handleOnFilterChange} />
                  <StockOperationsFilters filterName={StockFilters.OPERATION} onFilterChange={handleOnFilterChange} />
                </div>
                <TableToolbarMenu>
                  <TableToolbarAction className={styles.toolbarMenuAction} onClick={handleRefresh}>
                    {t('refresh', 'Refresh')}
                  </TableToolbarAction>
                </TableToolbarMenu>

                <StockOperationTypesSelector />
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
                {rows?.map((row: any) => {
                  const props = getRowProps({ row });
                  const expandedRowProps = getExpandedRowProps({ row });
                  const operation = itemsById.get(row.id);
                  return (
                    <React.Fragment key={row.id}>
                      <TableExpandRow className={isDesktop ? styles.desktopRow : styles.tabletRow} {...props}>
                        {row.cells.map((cell) => (
                          <TableCell key={cell.id}>{renderCell(cell, operation, () => expandRow(row.id))}</TableCell>
                        ))}
                      </TableExpandRow>
                      {row.isExpanded && operation ? (
                        <TableExpandedRow colSpan={headers.length + 2}>
                          <StockOperationExpandedRow model={operation} />
                        </TableExpandedRow>
                      ) : (
                        <TableExpandedRow className={styles.hiddenRow} colSpan={headers.length + 2} />
                      )}
                    </React.Fragment>
                  );
                })}
              </TableBody>
            </Table>
            {rows.length === 0 && !isLoading && !error ? (
              <div className={styles.tileContainer}>
                <Tile className={styles.tile}>
                  <div className={styles.tileContent}>
                    <p className={styles.content}>{t('noOperationsToDisplay', 'No stock operations to display')}</p>
                    <p className={styles.helper}>{t('checkFilters', 'Check the filters above')}</p>
                  </div>
                </Tile>
              </div>
            ) : null}
            {isLoading && (
              <div className={styles.rowLoadingContainer}>
                <InlineLoading description={t('loadingPlaceholder', 'Loading...')} />
              </div>
            )}
          </TableContainer>
        )}
      </DataTable>
      {items.length > 0 && (
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
      )}
    </>
  );
};

export default StockOperations;
