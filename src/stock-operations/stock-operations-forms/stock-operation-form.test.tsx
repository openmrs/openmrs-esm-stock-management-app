import React from 'react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
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
  useConcept: vi.fn().mockReturnValue({ items: { answers: [] }, isLoading: false, error: null }),
}));

vi.mock('../stock-operations.resource', () => ({
  getStockOperationLinks: vi.fn(),
  operationStatusColor: vi.fn(() => 'some-color'),
  useStockOperations: vi.fn().mockReturnValue({ items: { results: [] }, isLoading: false, error: null }),
  useStockOperation: vi.fn().mockReturnValue({ items: undefined, isLoading: false, error: null }),
  useStockOperationAndItems: vi.fn(),
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
});

describe('StockOperationForm for an operation the user cannot edit', () => {
  const cancelledIssue = {
    ...savedIssue,
    operationNumber: 'SIS-0142',
    operationTypeName: 'Stock Issue',
    status: 'CANCELLED',
    approvalRequired: false,
    permission: { canView: true, canEdit: false },
  } as StockOperationDTO;

  beforeEach(() => {
    mockUseStockOperationAndItems.mockReturnValue({ items: undefined, isLoading: false, error: null });
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

  const renderForm = (stockOperation: StockOperationDTO) =>
    render(<StockOperationForm {...mockWorkspace2Props({ stockOperationType: stockIssueType, stockOperation })} />);

  it('opens as a read-only view of the operation', async () => {
    const user = userEvent.setup();
    renderForm(cancelledIssue);

    expect(screen.getByRole('heading', { name: 'View Stock Issue' })).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: /source/i })).toHaveAttribute('readonly');
    expect(screen.getByRole('combobox', { name: /destination/i })).toHaveAttribute('readonly');
    expect(screen.getByRole('textbox', { name: /remarks/i })).toHaveAttribute('readonly');

    await user.click(screen.getByRole('button', { name: /next/i }));

    // The lines can be read but not changed
    expect(screen.getAllByRole('row').slice(1)).toHaveLength(2);
    expect(screen.queryByRole('searchbox')).not.toBeInTheDocument();
    expect(screen.queryByRole('columnheader', { name: /actions/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /edit/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /delete/i })).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /next/i }));

    expect(screen.getByText("This operation can't be edited")).toBeInTheDocument();
    expect(screen.getByText('Its status is CANCELLED.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /save/i })).not.toBeInTheDocument();
  });

  it('lets the user page through an incomplete operation without validating it', async () => {
    const user = userEvent.setup();
    renderForm({ ...cancelledIssue, responsiblePersonUuid: undefined, stockOperationItems: [] } as StockOperationDTO);

    await user.click(screen.getByRole('button', { name: /next/i }));
    await user.click(screen.getByRole('button', { name: /next/i }));

    expect(screen.getByText("This operation can't be edited")).toBeInTheDocument();
  });

  it('still opens an editable operation for editing', async () => {
    const user = userEvent.setup();
    renderForm({ ...cancelledIssue, status: 'NEW', permission: { canView: true, canEdit: true } } as StockOperationDTO);

    expect(screen.getByRole('heading', { name: 'Edit Stock Issue' })).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: /source/i })).not.toHaveAttribute('readonly');

    await user.click(screen.getByText(/stock items/i));

    expect(screen.getByRole('searchbox')).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: /actions/i })).toBeInTheDocument();
    expect(screen.queryByText("This operation can't be edited")).not.toBeInTheDocument();
  });
});
