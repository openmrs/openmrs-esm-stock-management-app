import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import {
  adjustmentOpeationTypeMock,
  disposalOperationTypeMock,
  stockIssueOperationtypeMock,
  stockTakeOperationTypeMock,
} from '@mocks';
import { type StockOperationType } from '../../../core/api/types/stockOperation/StockOperationType';
import { type BaseStockOperationItemFormData } from '../../validation-schema';
import StockItemForm from './stock-item-form.workspace';

vi.mock('../input-components/batch-no-selector.component', () => ({
  default: ({ partyUuid, includeEmptyBatches }: { partyUuid?: string; includeEmptyBatches?: boolean }) => (
    <span>
      Batches at {partyUuid}
      {includeEmptyBatches ? ', including empty ones' : ''}
    </span>
  ),
}));
vi.mock('../input-components/quantity-uom-selector.component', () => ({ default: () => null }));
vi.mock('../../../stock-items/stock-items.resource', () => ({
  useStockItem: vi.fn().mockReturnValue({ item: undefined }),
}));

const stockOperationItem = { uuid: 'line-uuid', stockItemUuid: 'item-uuid' } as BaseStockOperationItemFormData;

function renderItemForm(stockOperationType: object) {
  render(
    <StockItemForm
      stockOperationType={stockOperationType as unknown as StockOperationType}
      stockOperationItem={stockOperationItem}
      sourcePartyUuid="source-party-uuid"
    />,
  );
}

describe('StockItemForm batch picker', () => {
  it.each([
    { name: 'stock take', type: stockTakeOperationTypeMock },
    { name: 'adjustment', type: adjustmentOpeationTypeMock },
  ])('lets a $name pick batches with no stock at the source', ({ type }) => {
    renderItemForm(type);

    expect(screen.getByText('Batches at source-party-uuid, including empty ones')).toBeInTheDocument();
  });

  it.each([
    { name: 'stock issue', type: stockIssueOperationtypeMock },
    { name: 'disposal', type: disposalOperationTypeMock },
  ])('only offers a $name batches with stock at the source', ({ type }) => {
    renderItemForm(type);

    expect(screen.getByText('Batches at source-party-uuid')).toBeInTheDocument();
  });
});
