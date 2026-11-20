import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { FormProvider, useForm } from 'react-hook-form';
import {
  receiptOperationTypeMock,
  requisitionOperationTypeMock,
  stockIssueOperationtypeMock,
  stockTakeOperationTypeMock,
} from '@mocks';
import { APP_STOCKMANAGEMENT_STOCKITEMS, TASK_STOCKMANAGEMENT_STOCKOPERATIONS_MUTATE } from '../../../constants';
import { type PrivilegeScope } from '../../../core/api/types/identity/PriviledgeScope';
import { type StockOperationType } from '../../../core/api/types/stockOperation/StockOperationType';
import { useStockManagementSession } from '../../../stock-lookups/stock-lookups.resource';
import { type StockOperationItemDtoSchema } from '../../validation-schema';
import StockOperationItemsFormStep from './stock-operation-items-form-step.component';

vi.mock('./stock-availability-cell.component', () => ({
  default: ({ partyUuid }: { partyUuid?: string }) => <span>Available at {partyUuid}</span>,
}));
vi.mock('./stock-operation-item-cell.component', () => ({ default: () => <span>Item</span> }));
vi.mock('./stock-operation-item-batch-no-cell.component', () => ({ default: () => <span>Batch</span> }));
vi.mock('./stock-operation-item-expiry-cell.component', () => ({ default: () => <span>Expiry</span> }));
vi.mock('./quantity-uom-cell.component', () => ({ default: () => <span>Unit</span> }));
vi.mock('../input-components/stock-item-search.component', () => ({ default: () => null }));
vi.mock('../../../stock-lookups/stock-lookups.resource', () => ({ useStockManagementSession: vi.fn() }));

const mockUseStockManagementSession = vi.mocked(useStockManagementSession);

function mockStockScopes(scopes: Array<Pick<PrivilegeScope, 'partyUuid' | 'privilege'>>) {
  mockUseStockManagementSession.mockReturnValue({
    privilegeScopes: scopes as Array<PrivilegeScope>,
    isLoading: false,
    error: undefined,
  });
}

const ItemsStepWithForm = ({ stockOperationType }: { stockOperationType: StockOperationType }) => {
  const form = useForm<StockOperationItemDtoSchema>({
    defaultValues: {
      sourceUuid: 'source-party-uuid',
      destinationUuid: 'destination-party-uuid',
      stockOperationItems: [{ uuid: 'line-uuid', stockItemUuid: 'item-uuid', quantity: 1 }],
    } as StockOperationItemDtoSchema,
  });

  return (
    <FormProvider {...form}>
      <StockOperationItemsFormStep stockOperationType={stockOperationType} />
    </FormProvider>
  );
};

describe('StockOperationItemsFormStep', () => {
  beforeEach(() => {
    mockStockScopes([
      { partyUuid: 'source-party-uuid', privilege: APP_STOCKMANAGEMENT_STOCKITEMS },
      { partyUuid: 'destination-party-uuid', privilege: APP_STOCKMANAGEMENT_STOCKITEMS },
    ]);
  });

  it.each([
    { name: 'stock issue', type: stockIssueOperationtypeMock, party: 'source-party-uuid' },
    { name: 'stock take', type: stockTakeOperationTypeMock, party: 'source-party-uuid' },
    // A requisition's source is the location asking for stock.
    { name: 'requisition', type: requisitionOperationTypeMock, party: 'source-party-uuid' },
    // A receipt's source is a supplier.
    { name: 'receipt', type: receiptOperationTypeMock, party: 'destination-party-uuid' },
  ])('shows stock availability for a $name at the party it draws from', ({ type, party }) => {
    render(<ItemsStepWithForm stockOperationType={type as unknown as StockOperationType} />);

    expect(screen.getByText(`Available at ${party}`)).toBeInTheDocument();
  });

  it("shows no availability when the user can't see stock at that party", () => {
    mockStockScopes([
      { partyUuid: 'source-party-uuid', privilege: TASK_STOCKMANAGEMENT_STOCKOPERATIONS_MUTATE },
      { partyUuid: 'destination-party-uuid', privilege: APP_STOCKMANAGEMENT_STOCKITEMS },
    ]);

    render(<ItemsStepWithForm stockOperationType={stockIssueOperationtypeMock as unknown as StockOperationType} />);

    expect(screen.queryByText(/Available at/)).not.toBeInTheDocument();
  });
});
