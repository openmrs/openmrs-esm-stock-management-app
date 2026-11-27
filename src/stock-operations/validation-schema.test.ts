import { describe, expect, it } from 'vitest';
import { OperationType } from '../core/api/types/stockOperation/StockOperationType';
import { stockOperationItemDtoSchema } from './validation-schema';

const operationTypeSchema = stockOperationItemDtoSchema.pick({ operationType: true });

describe('operation type validation', () => {
  it.each(Object.values(OperationType))('accepts the backend code %s', (operationType) => {
    expect(operationTypeSchema.parse({ operationType })).toEqual({ operationType });
  });

  it.each(['', 'unknown', 'RECEIPT', '44444444-4444-4444-4444-444444444444'])(
    'rejects an invalid operation type [%s]',
    (operationType) => {
      expect(operationTypeSchema.safeParse({ operationType }).success).toBe(false);
    },
  );

  it('requires a code instead of an operation type UUID', () => {
    expect(operationTypeSchema.safeParse({ operationTypeUuid: '44444444-4444-4444-4444-444444444444' }).success).toBe(
      false,
    );
  });
});
