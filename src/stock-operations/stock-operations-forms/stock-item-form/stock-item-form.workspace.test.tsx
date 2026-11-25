import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render } from '@testing-library/react';
import { type StockOperationType } from '../../../core/api/types/stockOperation/StockOperationType';
import { type BaseStockOperationItemFormData } from '../../validation-schema';
import BatchNoSelector from '../input-components/batch-no-selector.component';
import StockItemForm from './stock-item-form.workspace';

vi.mock('../input-components/batch-no-selector.component', () => ({ default: vi.fn(() => null) }));
vi.mock('../input-components/quantity-uom-selector.component', () => ({ default: vi.fn(() => null) }));
vi.mock('../../../stock-items/stock-items.resource', () => ({
  useStockItem: vi.fn(() => ({ item: { drugName: 'Paracetamol' }, isLoading: false })),
}));

const operationType = (operationType: string, allowExpiredBatchNumbers: boolean) =>
  ({
    uuid: `${operationType}-uuid`,
    name: operationType,
    operationType,
    allowExpiredBatchNumbers,
  } as StockOperationType);

const item = { uuid: 'line-1', stockItemUuid: 'item-1' } as BaseStockOperationItemFormData;

describe('StockItemForm batch picker', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('lets a disposal pick expired batches', () => {
    render(<StockItemForm stockOperationType={operationType('disposed', true)} stockOperationItem={item} />);

    expect(vi.mocked(BatchNoSelector).mock.lastCall[0]).toEqual(
      expect.objectContaining({ stockItemUuid: 'item-1', includeExpiredBatches: true }),
    );
  });

  it('keeps expired batches out of a stock issue', () => {
    render(<StockItemForm stockOperationType={operationType('stockissue', false)} stockOperationItem={item} />);

    expect(vi.mocked(BatchNoSelector).mock.lastCall[0]).toEqual(
      expect.objectContaining({ stockItemUuid: 'item-1', includeExpiredBatches: false }),
    );
  });
});
