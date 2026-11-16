import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { launchWorkspace2 } from '@openmrs/esm-framework';
import { type StockOperationDTO } from '../core/api/types/stockOperation/StockOperationDTO';
import { useStockOperationAndItems, useStockOperations } from '../stock-operations/stock-operations.resource';
import StockHomeIssuingCard from './stock-home-issuing-card.component';
import StockHomeReceivingCard from './stock-home-receiving-card.component';

vi.mock('../stock-operations/stock-operations.resource', () => ({
  useStockOperations: vi.fn(),
  useStockOperationAndItems: vi.fn(),
}));
vi.mock('../stock-operations/stock-operations-forms/hooks/useFilteredOperationTypesByRoles', () => ({
  default: () => ({
    isLoading: false,
    error: null,
    operationTypes: [
      { uuid: 'receipt-type', name: 'Receipt', operationType: 'receipt' },
      { uuid: 'issue-type', name: 'Stock Issue', operationType: 'stockissue' },
    ],
  }),
}));

const statuses = ['NEW', 'SUBMITTED', 'RETURNED', 'DISPATCHED', 'COMPLETED', 'CANCELLED', 'REJECTED'];
const operationsOfType = (operationType: string, prefix: string, operationTypeUuid: string) =>
  statuses.map(
    (status, index) =>
      ({
        uuid: `${prefix}-${status}`,
        operationNumber: `${prefix}-000${index + 1}`,
        operationType,
        operationTypeUuid,
        status,
        sourceName: 'Main Store',
        destinationName: 'Main Pharmacy',
        stockOperationItems: [{ stockItemName: `Item of ${status}`, stockItemPackagingUOMName: 'Tablet', quantity: 5 }],
      } as unknown as StockOperationDTO),
  );
const operations = [
  ...operationsOfType('receipt', 'RCPT', 'receipt-type'),
  ...operationsOfType('stockissue', 'SIS', 'issue-type'),
];

describe('Overview Receiving and Issuing cards', () => {
  beforeEach(() => {
    vi.mocked(useStockOperations).mockReturnValue({
      items: { results: operations },
      isLoading: false,
      error: null,
    } as never);
    vi.mocked(useStockOperationAndItems).mockImplementation(
      (uuid) => ({ items: operations.find((o) => o.uuid === uuid), isLoading: false, error: null } as never),
    );
  });

  it('lists only receipts that are still in progress', () => {
    render(<StockHomeReceivingCard />);

    expect(screen.getByText('Item of NEW')).toBeInTheDocument();
    expect(screen.getByText('Item of SUBMITTED')).toBeInTheDocument();
    expect(screen.getByText('Item of RETURNED')).toBeInTheDocument();
    for (const status of ['DISPATCHED', 'COMPLETED', 'CANCELLED', 'REJECTED']) {
      expect(screen.queryByText(`Item of ${status}`)).not.toBeInTheDocument();
    }
  });

  it('lists only stock issues that are still in progress, dispatched ones included', () => {
    render(<StockHomeIssuingCard />);

    for (const status of ['NEW', 'SUBMITTED', 'RETURNED', 'DISPATCHED']) {
      expect(screen.getByText(`Item of ${status}`)).toBeInTheDocument();
    }
    for (const status of ['COMPLETED', 'CANCELLED', 'REJECTED']) {
      expect(screen.queryByText(`Item of ${status}`)).not.toBeInTheDocument();
    }
  });

  it.each([
    ['Receiving', StockHomeReceivingCard, 'RCPT-0002', 'RCPT-SUBMITTED'],
    ['Issuing', StockHomeIssuingCard, 'SIS-0004', 'SIS-DISPATCHED'],
  ])('opens an operation from the %s card by its number', async (_, Card, operationNumber, uuid) => {
    const user = userEvent.setup();
    render(<Card />);

    await user.click(screen.getByRole('button', { name: operationNumber }));

    expect(launchWorkspace2).toHaveBeenCalledWith(
      'stock-operation-form-workspace',
      expect.objectContaining({ stockOperation: expect.objectContaining({ uuid }) }),
    );
  });
});
