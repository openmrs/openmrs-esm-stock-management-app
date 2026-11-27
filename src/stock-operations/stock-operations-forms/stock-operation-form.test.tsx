import React from 'react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { type FetchResponse, showSnackbar, useConfig, useSession } from '@openmrs/esm-framework';
import { mockWorkspace2Props, receiptOperationTypeMock, stockIssueOperationtypeMock } from '@mocks';
import { type Party } from '../../core/api/types/Party';
import { type StockOperationDTO } from '../../core/api/types/stockOperation/StockOperationDTO';
import { type StockOperationType } from '../../core/api/types/stockOperation/StockOperationType';
import { updateStockOperation, useStockOperationAndItems } from '../stock-operations.resource';
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
  updateStockOperation: vi.fn(),
}));

vi.mock('./hooks/useParties', () => ({
  default: vi.fn(),
  useParties: vi.fn(),
}));

// Stands in for the line form: it shows the party its batch picker would use, and saving fills in the
// quantity unit the saved lines are missing
vi.mock('./stock-item-form/stock-item-form.workspace', () => ({
  default: ({ stockOperationItem, sourcePartyUuid, onSave }) => (
    <>
      <span>Batches at {sourcePartyUuid}</span>
      <button type="button" onClick={() => onSave({ ...stockOperationItem, stockItemPackagingUOMUuid: 'uom-uuid' })}>
        Save line
      </button>
    </>
  ),
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

  it("opens the line form with the saved issue's source for its batch picker", async () => {
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

describe('StockOperationForm validation errors', () => {
  beforeEach(() => {
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

  it('marks the lines that are missing details instead of showing a toast', async () => {
    const user = userEvent.setup();
    mockUseStockOperationAndItems.mockReturnValue({ items: undefined, isLoading: false, error: null });
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
    await user.click(screen.getByRole('button', { name: /next/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Complete the details of the items marked below');
    // Neither saved line has a quantity unit
    expect(screen.getAllByText('Missing: Quantity unit of measurement')).toHaveLength(2);
    expect(showSnackbar).not.toHaveBeenCalled();
  });

  it('clears the marker and the alert once the lines are fixed, without clicking Next again', async () => {
    const user = userEvent.setup();
    mockUseStockOperationAndItems.mockReturnValue({ items: undefined, isLoading: false, error: null });
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
    await user.click(screen.getByRole('button', { name: /next/i }));
    expect(await screen.findAllByText('Missing: Quantity unit of measurement')).toHaveLength(2);

    // The row buttons are named only by their icon, so take Edit, the first button on the line's row
    const editLine = (index: number) =>
      user.click(within(screen.getAllByRole('row')[index + 1]).getAllByRole('button')[0]);
    await editLine(0);
    await user.click(screen.getByRole('button', { name: 'Save line' }));

    // Only the line that's still missing its unit is marked
    expect(await screen.findAllByText('Missing: Quantity unit of measurement')).toHaveLength(1);
    expect(screen.getByRole('alert')).toHaveTextContent('Complete the details of the items marked below');

    await editLine(1);
    await user.click(screen.getByRole('button', { name: 'Save line' }));

    await waitFor(() => expect(screen.queryByRole('alert')).not.toBeInTheDocument());
    expect(screen.queryByText(/^Missing:/)).not.toBeInTheDocument();
  });

  it('says to add an item when there are none, instead of showing a toast', async () => {
    const user = userEvent.setup();
    mockUseStockOperationAndItems.mockImplementation((uuid) => ({
      items: uuid === requisitionUuid ? { ...requisition, stockOperationItems: [] } : undefined,
      isLoading: false,
      error: null,
    }));
    render(
      <StockOperationForm
        {...mockWorkspace2Props({ stockOperationType: stockIssueType, stockRequisitionUuid: requisitionUuid })}
      />,
    );

    await user.click(screen.getByRole('button', { name: /next/i }));
    await user.click(await screen.findByRole('button', { name: /next/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Add at least one item');
    expect(showSnackbar).not.toHaveBeenCalled();
  });
});

describe('StockOperationForm editing a saved receipt', () => {
  const originalTimeZone = process.env.TZ;

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

  afterEach(() => {
    if (originalTimeZone === undefined) {
      delete process.env.TZ;
    } else {
      process.env.TZ = originalTimeZone;
    }
  });

  it('saves the operation type code when the type response has no UUID', async () => {
    const user = userEvent.setup();
    vi.mocked(updateStockOperation).mockResolvedValue({
      data: { uuid: 'receipt-uuid' },
    } as FetchResponse<StockOperationDTO>);
    const receipt = {
      uuid: 'receipt-uuid',
      operationType: 'receipt',
      status: 'NEW',
      permission: { canEdit: true },
      operationDate: new Date('2026-01-01T12:00:00Z'),
      sourceUuid: 'issue-source-uuid',
      destinationUuid: 'issue-destination-uuid',
      responsiblePersonUuid: 'receiver-person-uuid',
      stockOperationItems: [
        {
          uuid: 'receipt-line',
          stockItemUuid: 'item-uuid',
          stockItemPackagingUOMUuid: 'uom-uuid',
          batchNo: 'BATCH-001',
          expiration: new Date('2027-12-31T00:00:00Z'),
          quantity: 10,
        },
      ],
    } as StockOperationDTO;

    render(
      <StockOperationForm
        {...mockWorkspace2Props({
          stockOperationType: receiptOperationTypeMock as StockOperationType,
          stockOperation: receipt,
        })}
      />,
    );
    await user.click(screen.getByText('Submit/Complete'));
    await user.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() =>
      expect(updateStockOperation).toHaveBeenCalledWith(receipt, expect.objectContaining({ operationType: 'receipt' })),
    );
    expect(vi.mocked(updateStockOperation).mock.lastCall[1]).not.toHaveProperty('operationTypeUuid');
  });

  it('keeps the saved batch expiry date when the browser is behind the server', async () => {
    process.env.TZ = 'America/New_York';
    const user = userEvent.setup();
    const savedReceipt = {
      uuid: 'receipt-uuid',
      operationType: 'receipt',
      status: 'NEW',
      sourceUuid: 'issue-source-uuid',
      destinationUuid: 'issue-destination-uuid',
      responsiblePersonUuid: 'receiver-person-uuid',
      stockOperationItems: [
        {
          uuid: 'receipt-line',
          stockItemUuid: 'item-uuid',
          batchNo: 'BATCH-001',
          expiration: '2027-12-31T00:00:00.000+0000',
          quantity: 10,
        },
      ],
    } as unknown as StockOperationDTO;

    render(
      <StockOperationForm
        {...mockWorkspace2Props({
          stockOperationType: receiptOperationTypeMock as unknown as StockOperationType,
          stockOperation: savedReceipt,
        })}
      />,
    );
    await user.click(screen.getByText(/stock items/i));

    expect(screen.getByRole('row', { name: /BATCH-001/ })).toHaveTextContent('31/12/2027');
  });
});
