import React from 'react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import userEvent from '@testing-library/user-event';
import { render, screen } from '@testing-library/react';
import { type StockOperationDTO } from '../../core/api/types/stockOperation/StockOperationDTO';
import { type StockOperationType } from '../../core/api/types/stockOperation/StockOperationType';
import { launchStockoperationAddOrEditWorkSpace } from '../stock-operation.utils';
import { useStockOperationAndItems } from '../stock-operations.resource';
import useFilteredOperationTypesByRoles from '../stock-operations-forms/hooks/useFilteredOperationTypesByRoles';
import EditStockOperationActionMenu from './edit-stock-operation-action-menu.component';

vi.mock('../stock-operation.utils', () => ({
  launchStockoperationAddOrEditWorkSpace: vi.fn(),
}));

vi.mock('../stock-operations.resource', () => ({
  useStockOperationAndItems: vi.fn(),
}));

vi.mock('../stock-operations-forms/hooks/useFilteredOperationTypesByRoles', () => ({
  default: vi.fn(),
}));

const mockUseStockOperationAndItems = vi.mocked(useStockOperationAndItems);
const mockUseFilteredOperationTypesByRoles = vi.mocked(useFilteredOperationTypesByRoles);
const mockLaunchWorkspace = vi.mocked(launchStockoperationAddOrEditWorkSpace);

const receiptType = { uuid: 'receipt-type-uuid', name: 'Receipt' } as StockOperationType;
const stockOperation = {
  uuid: 'operation-uuid',
  operationNumber: 'RCPT-0001',
  operationTypeUuid: 'receipt-type-uuid',
} as StockOperationDTO;

describe('EditStockOperationActionMenu', () => {
  beforeEach(() => {
    mockUseFilteredOperationTypesByRoles.mockReturnValue({
      operationTypes: [receiptType],
      isLoading: false,
      error: null,
    });
    mockUseStockOperationAndItems.mockReturnValue({
      items: stockOperation,
      isLoading: false,
      error: null,
    });
  });

  it('gives the icon-only edit button an accessible name', async () => {
    const user = userEvent.setup();
    render(<EditStockOperationActionMenu stockOperation={stockOperation} showIcon showprops={false} />);

    await user.click(screen.getByRole('button', { name: /edit stock operation/i }));

    expect(mockLaunchWorkspace).toHaveBeenCalledWith(receiptType, stockOperation, undefined);
  });

  it('names the operation number button by its number', () => {
    render(<EditStockOperationActionMenu stockOperation={stockOperation} showIcon={false} showprops />);

    expect(screen.getByRole('button', { name: 'RCPT-0001' })).toBeInTheDocument();
  });
});
