import { afterEach, describe, expect, it, vi } from 'vitest';
import { type z } from 'zod';
import { OperationType } from '../core/api/types/stockOperation/StockOperationType';
import { getStockOperationFormSchema } from './validation-schema';

const futureDateMessage = 'Operation date must not be in the future';

const operationDateIssues = (operationType: OperationType, operationDate: Date) => {
  const result = getStockOperationFormSchema(operationType).safeParse({ operationDate });
  if (result.success) {
    return [];
  }
  return (result as z.SafeParseError<unknown>).error.issues.filter((issue) => issue.path[0] === 'operationDate');
};

describe('stock operation form schema: operation date', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it.each(Object.values(OperationType))('rejects a date after today for %s', (operationType) => {
    vi.useFakeTimers({ now: new Date(2026, 10, 10, 9, 0) });

    expect(operationDateIssues(operationType, new Date(2026, 10, 11))).toEqual([
      expect.objectContaining({ message: futureDateMessage }),
    ]);
  });

  it('accepts today and earlier dates', () => {
    vi.useFakeTimers({ now: new Date(2026, 10, 10, 9, 0) });

    expect(operationDateIssues(OperationType.RECEIPT_OPERATION_TYPE, new Date(2026, 10, 10))).toEqual([]);
    expect(operationDateIssues(OperationType.RECEIPT_OPERATION_TYPE, new Date(2026, 10, 10, 23, 59))).toEqual([]);
    expect(operationDateIssues(OperationType.RECEIPT_OPERATION_TYPE, new Date(2025, 0, 1))).toEqual([]);
  });

  it('allows the new day once midnight has passed', () => {
    const tomorrow = new Date(2026, 10, 11);
    vi.useFakeTimers({ now: new Date(2026, 10, 10, 23, 59) });
    expect(operationDateIssues(OperationType.RECEIPT_OPERATION_TYPE, tomorrow)).not.toEqual([]);

    vi.setSystemTime(new Date(2026, 10, 11, 0, 1));
    expect(operationDateIssues(OperationType.RECEIPT_OPERATION_TYPE, tomorrow)).toEqual([]);
  });
});
