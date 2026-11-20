import { StockOperationStatusCompleted } from '../core/api/types/stockOperation/StockOperationStatus';
import { OperationType } from '../core/api/types/stockOperation/StockOperationType';
import { type StockOperationFilter } from '../stock-operations/stock-operations.resource';
import { useStockOperationsByType } from './stock-home-operations.resource';

export function useDisposalList(filter: StockOperationFilter) {
  return useStockOperationsByType(filter, OperationType.DISPOSED_OPERATION_TYPE, StockOperationStatusCompleted, true);
}
