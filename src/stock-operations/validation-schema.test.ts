import { describe, expect, it } from 'vitest';
import { type ZodError } from 'zod';
import { OperationType } from '../core/api/types/stockOperation/StockOperationType';
import { getStockOperationFormSchema } from './validation-schema';

const line = {
  uuid: 'line-uuid',
  stockItemUuid: 'item-uuid',
  stockItemPackagingUOMUuid: 'uom-uuid',
  batchNo: 'B-001',
  quantity: 20,
};
const operation = (stockOperationItems: Array<Record<string, unknown>>) => ({
  operationDate: new Date(),
  sourceUuid: 'source-uuid',
  destinationUuid: 'destination-uuid',
  responsiblePersonUuid: 'person-uuid',
  operationTypeUuid: '44444444-4444-4444-4444-444444444444',
  stockOperationItems,
});

describe.each([OperationType.RECEIPT_OPERATION_TYPE, OperationType.OPENING_STOCK_OPERATION_TYPE])(
  'the %s form schema',
  (operationType) => {
    const schema = getStockOperationFormSchema(operationType);

    it("accepts a line without an expiration date when its item doesn't expire", () => {
      expect(schema.safeParse(operation([{ ...line, hasExpiration: false }])).success).toBe(true);
    });

    it('requires an expiration date when the item expires', () => {
      const { error } = schema.safeParse(operation([{ ...line, hasExpiration: true }])) as { error?: ZodError };

      expect(error?.issues).toEqual([
        expect.objectContaining({ message: 'Required', path: ['stockOperationItems', 0, 'expiration'] }),
      ]);
    });

    it('accepts a line with an expiration date when the item expires', () => {
      const result = schema.safeParse(operation([{ ...line, hasExpiration: true, expiration: new Date() }]));

      expect(result.success).toBe(true);
    });
  },
);
