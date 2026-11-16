import { type StockOperationFilter, useStockOperations } from '../stock-operations/stock-operations.resource';

// A stock issue is still in progress until it's completed, cancelled or rejected. A dispatched issue
// hasn't been received yet.
const IN_PROGRESS_STATUSES = ['NEW', 'SUBMITTED', 'RETURNED', 'DISPATCHED'];

export function useStockIssuing(filter: StockOperationFilter) {
  const { items, isLoading, error } = useStockOperations(filter);

  const receivedItems = items?.results?.filter(
    (item) => item?.operationType === 'stockissue' && IN_PROGRESS_STATUSES.includes(item?.status),
  );
  return {
    items: receivedItems,
    isLoading,
    error,
  };
}
