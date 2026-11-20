import {
  StockOperationStatusDispatched,
  StockOperationStatusNew,
  StockOperationStatusReturned,
  StockOperationStatusSubmitted,
} from '../core/api/types/stockOperation/StockOperationStatus';
import { OperationType } from '../core/api/types/stockOperation/StockOperationType';
import { type StockOperationFilter } from '../stock-operations/stock-operations.resource';
import { useStockOperationsByType } from './stock-home-operations.resource';

const OPEN_STOCK_OPERATION_STATUSES = [
  StockOperationStatusNew,
  StockOperationStatusSubmitted,
  StockOperationStatusDispatched,
  StockOperationStatusReturned,
].join(',');

export function useStockReceiving(filter: StockOperationFilter) {
  return useStockOperationsByType(filter, OperationType.RECEIPT_OPERATION_TYPE, OPEN_STOCK_OPERATION_STATUSES);
}
