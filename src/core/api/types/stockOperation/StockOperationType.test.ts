import { describe, expect, it } from 'vitest';
import { OperationType, StockOperationTypeTakesStockFromSource } from './StockOperationType';

describe('StockOperationTypeTakesStockFromSource', () => {
  it.each([
    OperationType.TRANSFER_OUT_OPERATION_TYPE,
    OperationType.STOCK_ISSUE_OPERATION_TYPE,
    OperationType.DISPOSED_OPERATION_TYPE,
    OperationType.ADJUSTMENT_OPERATION_TYPE,
    OperationType.STOCK_TAKE_OPERATION_TYPE,
  ])('scopes availability to the source for %s', (type) => {
    expect(StockOperationTypeTakesStockFromSource(type)).toBe(true);
  });

  it.each([
    OperationType.RECEIPT_OPERATION_TYPE,
    OperationType.OPENING_STOCK_OPERATION_TYPE,
    OperationType.REQUISITION_OPERATION_TYPE,
    OperationType.RETURN_OPERATION_TYPE,
    undefined,
  ])('does not scope availability to the source for %s', (type) => {
    expect(StockOperationTypeTakesStockFromSource(type)).toBe(false);
  });
});
