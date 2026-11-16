import { type StockOperationFilter, useStockOperations } from '../stock-operations/stock-operations.resource';

// A receipt is still in progress until it's completed, cancelled or rejected
const IN_PROGRESS_STATUSES = ['NEW', 'SUBMITTED', 'RETURNED'];

export function useStockReceiving(filter: StockOperationFilter) {
  const { items, isLoading, error } = useStockOperations(filter);

  const receivedItems = items?.results?.filter(
    (item) => item?.operationType === 'receipt' && IN_PROGRESS_STATUSES.includes(item?.status),
  );
  return {
    items: receivedItems,
    isLoading,
    error,
  };
}
