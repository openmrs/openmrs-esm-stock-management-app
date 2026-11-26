import useSWR from 'swr';
import { openmrsFetch, restBaseUrl } from '@openmrs/esm-framework';
import { ResourceRepresentation } from '../core/api/api';
import { type PageableResult } from '../core/api/types/PageableResult';
import { type StockItemDTO } from '../core/api/types/stockItem/StockItem';

const PAGE_SIZE = 100;

async function fetchAllStockItems(v: ResourceRepresentation) {
  const stockItems: StockItemDTO[] = [];

  for (let startIndex = 0; ; startIndex += PAGE_SIZE) {
    const response = await openmrsFetch<PageableResult<StockItemDTO>>(
      `${restBaseUrl}/stockmanagement/stockitem?v=${v}&totalCount=true&limit=${PAGE_SIZE}&startIndex=${startIndex}`,
    );
    const page = response.data?.results ?? [];
    stockItems.push(...page);

    if (
      page.length < PAGE_SIZE ||
      (response.data?.totalCount != null && stockItems.length >= response.data.totalCount)
    ) {
      break;
    }
  }

  return stockItems;
}

export function useStockInventoryItems(v?: ResourceRepresentation) {
  const representation = v ?? ResourceRepresentation.Default;
  const { data, isLoading, error } = useSWR(
    [`${restBaseUrl}/stockmanagement/stockitem`, 'inventory', representation],
    () => fetchAllStockItems(representation),
  );

  return {
    items: data ?? [],
    isLoading,
    error,
  };
}
