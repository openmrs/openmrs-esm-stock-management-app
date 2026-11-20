import React from 'react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useConfig, useSession } from '@openmrs/esm-framework';
import { mockWorkspace2Props, stockIssueOperationtypeMock } from '@mocks';
import { type Party } from '../../core/api/types/Party';
import { type StockOperationDTO } from '../../core/api/types/stockOperation/StockOperationDTO';
import { type StockOperationType } from '../../core/api/types/stockOperation/StockOperationType';
import { useStockOperationAndItems } from '../stock-operations.resource';
import useParties from './hooks/useParties';
import StockOperationForm from './stock-operation-form.component';

const mockUseStockOperationAndItems = vi.mocked(useStockOperationAndItems);
const mockUseParties = vi.mocked(useParties);
const mockUseConfig = vi.mocked(useConfig);
const mockUseSession = vi.mocked(useSession);

vi.mock('../../stock-lookups/stock-lookups.resource', () => ({
  useStockOperationTypes: vi.fn().mockReturnValue({ types: { results: [] }, isLoading: false, error: null }),
  useUsers: vi.fn().mockReturnValue({ items: { results: [] }, isLoading: false }),
  useUser: vi.fn().mockReturnValue({ data: { display: 'Test User' }, isLoading: false, error: null }),
  useStockManagementSession: vi.fn().mockReturnValue({ privilegeScopes: [], isLoading: false, error: undefined }),
  useConcept: vi.fn().mockReturnValue({ items: { answers: [] }, isLoading: false, error: null }),
}));

vi.mock('../stock-operations.resource', () => ({
  getStockOperationLinks: vi.fn(),
  operationStatusColor: vi.fn(() => 'some-color'),
  useStockOperations: vi.fn().mockReturnValue({ items: { results: [] }, isLoading: false, error: null }),
  useStockOperation: vi.fn().mockReturnValue({ items: undefined, isLoading: false, error: null }),
  useStockOperationAndItems: vi.fn(),
}));

vi.mock('./input-components/batch-no-selector.component', () => ({
  default: ({ partyUuid }: { partyUuid?: string }) => <span>Batches at {partyUuid}</span>,
}));

vi.mock('./hooks/useParties', () => ({
  default: vi.fn(),
  useParties: vi.fn(),
}));

const requisitionUuid = 'requisition-uuid';
const stockIssueType = stockIssueOperationtypeMock as unknown as StockOperationType;

const parties = [
  { uuid: 'issue-source-uuid', name: 'Issue Source Store' },
  { uuid: 'issue-destination-uuid', name: 'Issue Destination Ward' },
  { uuid: 'requisition-source-uuid', name: 'Requisition Pharmacy' },
  { uuid: 'requisition-destination-uuid', name: 'Requisition Store' },
] as Party[];

const requisition = {
  uuid: requisitionUuid,
  sourceUuid: 'requisition-source-uuid',
  destinationUuid: 'requisition-destination-uuid',
  responsiblePersonUuid: 'requisition-person-uuid',
  stockOperationItems: [{ uuid: 'requisition-line', stockItemUuid: 'item-uuid', quantity: 30 }],
} as StockOperationDTO;

const savedIssue = {
  uuid: 'issue-uuid',
  operationTypeUuid: stockIssueOperationtypeMock.uuid,
  operationType: 'stockissue',
  status: 'NEW',
  sourceUuid: 'issue-source-uuid',
  destinationUuid: 'issue-destination-uuid',
  responsiblePersonUuid: 'issuer-person-uuid',
  remarks: 'Issue remarks',
  requisitionStockOperationUuid: requisitionUuid,
  stockOperationItems: [
    { uuid: 'issue-line-1', stockItemUuid: 'item-uuid', stockBatchUuid: 'batch-b2', quantity: 12 },
    { uuid: 'issue-line-2', stockItemUuid: 'item-uuid', stockBatchUuid: 'batch-bulk', quantity: 4 },
  ],
} as StockOperationDTO;

describe('StockOperationForm with a linked requisition', () => {
  beforeEach(() => {
    mockUseStockOperationAndItems.mockImplementation((uuid) => ({
      items: uuid === requisitionUuid ? requisition : undefined,
      isLoading: false,
      error: null,
    }));
    mockUseParties.mockReturnValue({
      destinationParties: parties,
      destinationPartiesFilter: () => true,
      destinationTags: [],
      error: undefined,
      isLoading: false,
      mutate: vi.fn(),
      parties,
      sourceParties: parties,
      sourcePartiesFilter: () => true,
      sourceTags: [],
    });
    mockUseConfig.mockReturnValue({ autoPopulateResponsiblePerson: false });
    mockUseSession.mockReturnValue({
      authenticated: true,
      sessionId: 'test-session-id',
      user: { uuid: 'test-user-uuid' },
    } as ReturnType<typeof useSession>);
  });

  it("shows a saved issue's own details and lines instead of the requisition's", async () => {
    const user = userEvent.setup();
    render(
      <StockOperationForm
        {...mockWorkspace2Props({
          stockOperationType: stockIssueType,
          stockOperation: savedIssue,
          stockRequisitionUuid: requisitionUuid,
        })}
      />,
    );

    expect(screen.getByRole('combobox', { name: /source/i })).toHaveValue('Issue Source Store');
    expect(screen.getByRole('combobox', { name: /destination/i })).toHaveValue('Issue Destination Ward');
    expect(mockUseStockOperationAndItems).not.toHaveBeenCalledWith(requisitionUuid);

    await user.click(screen.getByText(/stock items/i));

    const lines = screen.getAllByRole('row').slice(1);
    expect(lines).toHaveLength(2);
  });

  it('prefills a new issue from the requisition', () => {
    render(
      <StockOperationForm
        {...mockWorkspace2Props({
          stockOperationType: stockIssueType,
          stockRequisitionUuid: requisitionUuid,
        })}
      />,
    );

    expect(screen.getByRole('combobox', { name: /source/i })).toHaveValue('Requisition Store');
    expect(screen.getByRole('combobox', { name: /destination/i })).toHaveValue('Requisition Pharmacy');
  });

  it("opens the batch picker at the saved issue's source", async () => {
    const user = userEvent.setup();
    render(
      <StockOperationForm
        {...mockWorkspace2Props({
          stockOperationType: stockIssueType,
          stockOperation: savedIssue,
          stockRequisitionUuid: requisitionUuid,
        })}
      />,
    );

    await user.click(screen.getByText(/stock items/i));
    await user.click(within(screen.getAllByRole('row')[1]).getAllByRole('button')[0]);

    expect(screen.getByText('Batches at issue-source-uuid')).toBeInTheDocument();
  });
});
