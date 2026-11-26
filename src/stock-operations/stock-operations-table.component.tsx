import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  DataTable,
  DataTableSkeleton,
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
import { isDesktop, OpenmrsDatePicker, restBaseUrl, useConfig } from '@openmrs/esm-framework';
import { type ConfigObject } from '../config-schema';
import { StockFilters } from '../constants';
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

type DateRange = [Date | null, Date | null];

// While a year is typed or deleted, the date pickers report each partial year (2, 20, 202) as a date
const hasFullYear = (date: Date | null) => !!date && date.getFullYear() >= 1000;

const hasIncompleteDate = (input: HTMLDivElement | null) => {
  const segments = Array.from(input?.querySelectorAll('[data-type]:not([data-readonly])') ?? []);
  const emptySegments = segments.filter((segment) => segment.hasAttribute('data-placeholder')).length;
  return emptySegments > 0 && emptySegments < segments.length;
};

const StockOperations: React.FC<StockOperationsTableProps> = () => {
  const { t } = useTranslation();
  const handleMutate = useHandleMutate();
  const { stockSourceTypeUUID } = useConfig<ConfigObject>();

  const handleRefresh = () => {
    handleMutate(`${restBaseUrl}/stockmanagement/stockoperation`);
  };

  const [dateRange, setDateRange] = useState<DateRange>([null, null]);
  const [[selectedFromDate, selectedToDate], setDateFilter] = useState<DateRange>([null, null]);
  const startDateInputRef = useRef<HTMLDivElement>(null);
  const endDateInputRef = useRef<HTMLDivElement>(null);
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

  // The date pickers report a date whenever every segment has a value, so changing the day from 23 to 25 reports
  // day 2 first. The range is checked once the typing stops: a partial year or an end date before the start date is
  // still being typed or deleted, so the last valid filter stays.
  const debouncedDateFilter = useDebounce(([startDate, endDate]: DateRange) => {
    // React Aria keeps partially cleared segments as draft text without calling onChange. Check the
    // displayed inputs when the timer fires, so a date queued before a second Backspace cannot be applied.
    if (hasIncompleteDate(startDateInputRef.current) || hasIncompleteDate(endDateInputRef.current)) {
      return;
    }
    const isPartialYear = [startDate, endDate].some((date) => date && !hasFullYear(date));
    if (!isPartialYear && !(startDate && endDate && startDate > endDate)) {
      setDateFilter([startDate, endDate]);
    }
  }, 500);

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

  useEffect(() => {
    // onChange also stays silent when an incomplete date is restored to its last complete value.
    // Observe the picker's segment placeholders to restart filtering for that edit (including paste
    // and mobile input), without changing the shared date picker's value or callback semantics.
    const observer = new MutationObserver(() => debouncedDateFilter(dateRange));
    for (const input of [startDateInputRef.current, endDateInputRef.current]) {
      if (input) {
        observer.observe(input, { subtree: true, attributes: true, attributeFilter: ['data-placeholder'] });
      }
    }
    return () => observer.disconnect();
  }, [dateRange, debouncedDateFilter]);

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

  const handleDateRangeChange = (range: DateRange) => {
    setDateRange(range);
    debouncedDateFilter(range);
  };

  const tableRows = useMemo(
    () =>
      items?.map((stockOperation, index) => {
        const threshHold = 1;
        const itemCountGreaterThanThreshhold = (stockOperation?.stockOperationItems?.length ?? 0) > threshHold;
        const commonNames =
          stockOperation?.stockOperationItems
            ?.slice(0, itemCountGreaterThanThreshhold ? threshHold : undefined)
            .map((item) => item.commonName)
            .join(', ') ?? '';

        return {
          ...stockOperation,
          id: stockOperation?.uuid,
          key: `key-${stockOperation?.uuid}`,
          operationTypeName: `${stockOperation?.operationTypeName}`,
          operationNumber: (
            <EditStockOperationActionMenu stockOperation={stockOperation} showIcon={false} showprops={true} />
          ),
          stockOperationItems: {
            commonNames,
            more: itemCountGreaterThanThreshhold ? stockOperation?.stockOperationItems?.length - threshHold : 0,
          },
          status: `${stockOperation?.status}`,
          source: `${stockOperation?.sourceName ?? ''}`,
          destination: `${stockOperation?.destinationName ?? ''}`,
          location: (
            <>
              {stockOperation?.sourceName ?? ''}
              {stockOperation?.sourceName && stockOperation?.destinationName ? (
                <ArrowRight className={styles.arrowIcon} key={`${index}-0`} size={12} />
              ) : (
                ''
              )}{' '}
              {stockOperation?.destinationName ?? ''}
            </>
          ),
          responsiblePerson: `${
            stockOperation?.responsiblePersonFamilyName ?? stockOperation?.responsiblePersonOther ?? ''
          } ${stockOperation?.responsiblePersonGivenName ?? ''}`,
          operationDate: formatDisplayDate(stockOperation?.operationDate),
          actions: <EditStockOperationActionMenu stockOperation={stockOperation} showIcon={true} showprops={false} />,
        };
      }),
    [items],
  );

  const itemsById = useMemo(() => new Map((items ?? []).map((op) => [op.uuid, op])), [items]);

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
                  <div ref={startDateInputRef}>
                    <OpenmrsDatePicker
                      className={styles.datePicker}
                      labelText={t('startDate', 'Start date')}
                      maxDate={hasFullYear(dateRange[1]) ? dateRange[1] : undefined}
                      onChange={(date) => handleDateRangeChange([date ?? null, dateRange[1]])}
                      value={dateRange[0]}
                    />
                  </div>
                  <div ref={endDateInputRef}>
                    <OpenmrsDatePicker
                      className={styles.datePicker}
                      labelText={t('endDate', 'End date')}
                      minDate={hasFullYear(dateRange[0]) ? dateRange[0] : undefined}
                      onChange={(date) => handleDateRangeChange([dateRange[0], date ?? null])}
                      value={dateRange[1]}
                    />
                  </div>

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
                          <TableCell key={cell.id}>
                            {cell?.info?.header === 'stockOperationItems' ? (
                              <span>
                                <span>{cell.value.commonNames}</span>
                                {cell.value.more > 0 && (
                                  <Link onClick={() => expandRow(row.id)}>{`...(${cell.value.more} more)`}</Link>
                                )}
                              </span>
                            ) : (
                              cell.value
                            )}
                          </TableCell>
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
