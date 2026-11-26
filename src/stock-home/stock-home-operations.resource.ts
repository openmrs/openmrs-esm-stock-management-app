import useSWR from 'swr';
import { type FetchResponse, openmrsFetch, restBaseUrl } from '@openmrs/esm-framework';
import { ResourceRepresentation, toQueryParams } from '../core/api/api';
import { type PageableResult } from '../core/api/types/PageableResult';
import { type StockOperationDTO } from '../core/api/types/stockOperation/StockOperationDTO';
import { type OperationType } from '../core/api/types/stockOperation/StockOperationType';
import { type StockOperationFilter } from '../stock-operations/stock-operations.resource';
import { useStockOperationTypes } from '../stock-lookups/stock-lookups.resource';

const PAGE_SIZE = 100;
type StockOperationResponse = FetchResponse<PageableResult<StockOperationDTO>> | StockOperationDTO[];

async function fetchAllStockOperations(filter: StockOperationFilter) {
  const stockOperations: StockOperationDTO[] = [];

  for (let startIndex = 0; ; startIndex += PAGE_SIZE) {
    const response = await openmrsFetch<PageableResult<StockOperationDTO>>(
      `${restBaseUrl}/stockmanagement/stockoperation${toQueryParams({
        ...filter,
        totalCount: true,
        limit: PAGE_SIZE,
        startIndex,
      })}`,
    );
    const page = response.data?.results ?? [];
    stockOperations.push(...page);

    if (
      page.length < PAGE_SIZE ||
      (response.data?.totalCount != null && stockOperations.length >= response.data.totalCount)
    ) {
      break;
    }
  }

  return stockOperations;
}

export function useStockOperationsByType(
  filter: StockOperationFilter,
  operationType: OperationType,
  status?: string,
  fetchAll = false,
) {
  const { types, isLoading: operationTypesLoading, error: operationTypesError } = useStockOperationTypes();
  const operationTypeUuid = types.results?.find((type) => type.operationType === operationType)?.uuid;
  const effectiveFilter: StockOperationFilter = {
    ...filter,
    v: filter.v ?? ResourceRepresentation.Full,
    totalCount: true,
    operationTypeUuid,
    status: status ?? filter.status,
  };
  const url = operationTypeUuid
    ? `${restBaseUrl}/stockmanagement/stockoperation${toQueryParams(effectiveFilter)}`
    : null;
  const swrKey = url ? (fetchAll ? `all:${url}` : url) : null;
  const fetcher = url
    ? () => (fetchAll ? fetchAllStockOperations(effectiveFilter) : openmrsFetch<PageableResult<StockOperationDTO>>(url))
    : null;
  const { data, error, isLoading } = useSWR<StockOperationResponse>(swrKey, fetcher);
  const items = Array.isArray(data) ? data : data?.data?.results ?? [];
  const totalCount = Array.isArray(data) ? data.length : data?.data?.totalCount ?? 0;

  return {
    items,
    totalCount,
    isLoading: operationTypesLoading || isLoading,
    error: operationTypesError || error,
  };
}
