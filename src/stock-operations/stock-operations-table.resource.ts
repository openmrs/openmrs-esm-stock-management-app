import { type StockOperationFilter, useStockOperations } from './stock-operations.resource';
import { useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

export function useStockOperationPages(filter: StockOperationFilter) {
  const pageSizes = [10, 20, 30, 40, 50];
  const [currentPageSize, setPageSize] = useState(10);
  const [pageState, setPageState] = useState({ page: 1, key: '' });

  const filterKey = JSON.stringify({ ...filter, pageSize: currentPageSize });
  const currentPage = pageState.key === filterKey ? pageState.page : 1;
  const goTo = useCallback((page: number) => setPageState({ page, key: filterKey }), [filterKey]);

  const { items, isLoading, error } = useStockOperations({
    ...filter,
    limit: currentPageSize,
    startIndex: currentPage - 1,
  });

  const { t } = useTranslation();

  const tableHeaders = useMemo(
    () => [
      {
        id: 0,
        header: t('type', 'Type'),
        key: 'operationTypeName',
      },
      {
        id: 1,
        header: t('number', 'Number'),
        key: 'operationNumber',
      },
      {
        id: 2,
        header: t('stockOperationItemsTableHeader', 'Items'),
        key: 'stockOperationItems',
      },
      {
        id: 3,
        header: t('status', 'Status'),
        key: 'status',
      },
      {
        id: 4,
        header: t('location', 'Location'),
        key: 'location',
      },
      {
        id: 5,
        header: t('responsiblePerson', 'Responsible Person'),
        key: 'responsiblePerson',
      },
      {
        id: 6,
        header: t('date', 'Date'),
        key: 'operationDate',
      },
      {
        id: 7,
        key: 'details',
        header: '',
      },
      { key: 'actions', header: '' },
    ],
    [t],
  );

  return {
    items: items.results ?? [],
    totalItems: items?.totalCount,
    currentPage,
    currentPageSize,
    goTo,
    pageSizes,
    isLoading,
    error,
    setPageSize,
    tableHeaders,
  };
}
