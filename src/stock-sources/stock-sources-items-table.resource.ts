import { useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { usePagination } from '@openmrs/esm-framework';
import { useStockSources } from './stock-sources.resource';
import { type StockOperationFilter } from '../stock-operations/stock-operations.resource';

export default function useStockSourcesPage(filter: StockOperationFilter) {
  const { t } = useTranslation();
  const pageSizes = [10, 20, 30, 40, 50];
  const [currentPageSize, setPageSize] = useState(10);
  const [serverPage, setServerPage] = useState(1);

  // A request filtered by source type is a search, which the backend pages (50 by default) while
  // counting every match, so it's paged on the server. Without a filter it returns every source and
  // ignores limit and startIndex, so that list is paged here.
  const isPagedOnServer = Boolean(filter.sourceTypeUuid);
  const { items, isLoading, error } = useStockSources(
    isPagedOnServer ? { ...filter, limit: currentPageSize, startIndex: serverPage - 1 } : filter,
  );

  const clientPages = usePagination(isPagedOnServer ? [] : items.results, currentPageSize);
  const paginatedItems = isPagedOnServer ? items.results ?? [] : clientPages.results;
  const currentPage = isPagedOnServer ? serverPage : clientPages.currentPage;
  const goTo = useCallback(
    (page: number) => {
      setServerPage(page);
      clientPages.goTo(page);
    },
    [clientPages],
  );

  const tableHeaders = useMemo(
    () => [
      {
        id: 1,
        header: t('name', 'Name'),
        key: 'name',
      },
      {
        id: 2,
        header: t('acronym', 'Acronym'),
        key: 'acronym',
      },
      {
        id: 3,
        header: t('sourceType', 'Source type'),
        key: 'sourceType',
      },
      {
        id: 4,
        header: t('actions', 'Actions'),
        key: 'actions',
      },
    ],
    [t],
  );

  return {
    items: paginatedItems,
    // The backend returns a null totalCount for an unfiltered request
    totalItems: items?.totalCount ?? items?.results?.length ?? 0,
    currentPage,
    currentPageSize,
    paginatedItems,
    goTo,
    pageSizes,
    isLoading,
    error,
    setPageSize,
    tableHeaders,
  };
}
