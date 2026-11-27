import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import userEvent from '@testing-library/user-event';
import { render, screen, waitFor } from '@testing-library/react';
import { type FetchResponse, showSnackbar, useConfig, useSession } from '@openmrs/esm-framework';
import { mockWorkspace2Props, requisitionOperationTypeMock } from '@mocks';
import { type Party } from '../../core/api/types/Party';
import { type User } from '../../core/api/types/identity/User';
import { type StockItemDTO } from '../../core/api/types/stockItem/StockItem';
import { type StockOperationDTO } from '../../core/api/types/stockOperation/StockOperationDTO';
import { type StockOperationType } from '../../core/api/types/stockOperation/StockOperationType';
import { useStockItem } from '../../stock-items/stock-items.resource';
import { useUser } from '../../stock-lookups/stock-lookups.resource';
import { createStockOperation, useStockOperationAndItems } from '../stock-operations.resource';
import { useFilterableStockItems } from './hooks/useFilterableStockItems';
import useParties from './hooks/useParties';
import useSearchUser from './hooks/useSearchUser';
import StockOperationForm from './stock-operation-form.component';

vi.mock('../../stock-lookups/stock-lookups.resource', () => ({
  useUser: vi.fn(),
  useConcept: vi.fn().mockReturnValue({ items: { answers: [] }, isLoading: false, error: null }),
}));
vi.mock('../stock-operations.resource', () => ({
  useStockOperationAndItems: vi.fn(),
  createStockOperation: vi.fn(),
  updateStockOperation: vi.fn(),
  deleteStockOperationItem: vi.fn(),
}));
vi.mock('../../stock-items/stock-items.resource', () => ({
  useStockItem: vi.fn(),
}));
vi.mock('../../stock-items/add-stock-item/batch-information/batch-information.resource', () => ({
  useStockItemBatchInformationHook: vi.fn().mockReturnValue({ items: [], isLoading: false, error: null }),
}));
vi.mock('./hooks/useParties', () => ({ default: vi.fn() }));
vi.mock('./hooks/useSearchUser', () => ({ default: vi.fn() }));
vi.mock('./hooks/useFilterableStockItems', () => ({ useFilterableStockItems: vi.fn() }));
vi.mock('./hooks/useStockItemBatchNumbers', () => ({
  useStockItemBatchNumbers: vi.fn().mockReturnValue({ isLoading: false, stockItemBatchNos: [] }),
}));
vi.mock('../../utils', () => ({ useHandleMutate: () => vi.fn() }));

const mockCreateStockOperation = vi.mocked(createStockOperation);
const mockUseStockOperationAndItems = vi.mocked(useStockOperationAndItems);
const mockUseStockItem = vi.mocked(useStockItem);
const mockUseUser = vi.mocked(useUser);
const mockUseParties = vi.mocked(useParties);
const mockUseSearchUser = vi.mocked(useSearchUser);
const mockUseFilterableStockItems = vi.mocked(useFilterableStockItems);
const mockUseConfig = vi.mocked(useConfig);
const mockUseSession = vi.mocked(useSession);
const mockShowSnackbar = vi.mocked(showSnackbar);

const requisitionType = requisitionOperationTypeMock as unknown as StockOperationType;

const parties = [
  { uuid: 'party-main-store', name: 'Main Store' },
  { uuid: 'party-dispensary', name: 'Dispensary' },
] as Party[];

const storeKeeper = { uuid: 'user-store-keeper', person: { display: 'Grace Achieng' } } as User;

const amoxicillin = {
  uuid: 'stock-item-amoxicillin',
  drugName: 'Amoxicillin 250mg',
  hasExpiration: true,
  packagingUnits: [
    { uuid: 'uom-tablet', packagingUomName: 'Tablet', factor: 1 },
    { uuid: 'uom-box', packagingUomName: 'Box', factor: 100 },
  ],
} as unknown as StockItemDTO;

async function selectComboBoxItem(user: ReturnType<typeof userEvent.setup>, name: RegExp, item: string) {
  await user.click(screen.getByRole('combobox', { name }));
  await user.click(await screen.findByText(item));
}

describe('StockOperationForm: new requisition', () => {
  beforeEach(() => {
    mockUseConfig.mockReturnValue({ autoPopulateResponsiblePerson: false, useItemCommonNameAsDisplay: false });
    mockUseSession.mockReturnValue({ user: { uuid: 'session-user' } } as ReturnType<typeof useSession>);
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
    mockUseSearchUser.mockReturnValue({
      userList: [storeKeeper],
      isLoading: false,
      setSearchString: vi.fn(),
    } as unknown as ReturnType<typeof useSearchUser>);
    mockUseUser.mockImplementation(
      (uuid) =>
        ({
          data: uuid === storeKeeper.uuid ? storeKeeper : undefined,
          isLoading: false,
          error: null,
        } as ReturnType<typeof useUser>),
    );
    mockUseFilterableStockItems.mockReturnValue({
      stockItemsList: [amoxicillin],
      isLoading: false,
      setSearchString: vi.fn(),
    } as unknown as ReturnType<typeof useFilterableStockItems>);
    mockUseStockItem.mockReturnValue({
      item: amoxicillin,
      isLoading: false,
      error: null,
    } as ReturnType<typeof useStockItem>);
    mockCreateStockOperation.mockImplementation((operation) =>
      Promise.resolve({ data: { ...operation, uuid: 'new-operation' } } as unknown as FetchResponse<StockOperationDTO>),
    );
  });

  it('validates each step, then saves the filled requisition', async () => {
    const user = userEvent.setup();
    const props = mockWorkspace2Props({ stockOperationType: requisitionType });
    render(<StockOperationForm {...props} />);

    // Step 1: operation details
    await user.click(screen.getByRole('button', { name: /next/i }));

    expect(await screen.findByText('Source Required')).toBeInTheDocument();
    expect(screen.getByText('Location Required')).toBeInTheDocument();
    expect(screen.getByText('Responsible Person Required')).toBeInTheDocument();

    await selectComboBoxItem(user, /^from$/i, 'Dispensary');
    await selectComboBoxItem(user, /^to$/i, 'Main Store');
    await selectComboBoxItem(user, /responsible person/i, 'Grace Achieng');
    await user.type(screen.getByRole('textbox', { name: /remarks/i }), 'Monthly top-up');

    await waitFor(() => expect(screen.queryByText('Source Required')).not.toBeInTheDocument());
    await user.click(screen.getByRole('button', { name: /next/i }));

    // Step 2: stock items
    expect(await screen.findByRole('heading', { name: /stock operation items/i })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /next/i }));
    expect(mockShowSnackbar).toHaveBeenCalledWith(
      expect.objectContaining({ kind: 'error', subtitle: 'You must add atleast one item' }),
    );

    await user.type(screen.getByRole('searchbox'), 'amox');
    await user.click(await screen.findByText('Amoxicillin 250mg'));

    // Line item form
    await user.click(await screen.findByRole('button', { name: /save/i }));
    await waitFor(() => expect(screen.getByRole('spinbutton', { name: /quantity/i })).toBeInvalid());

    await user.type(screen.getByRole('spinbutton', { name: /quantity/i }), '20');
    await selectComboBoxItem(user, /quantity unit of measurement/i, 'Box - 100');
    await user.click(screen.getByRole('button', { name: /save/i }));

    // Back on step 2 with the new line
    expect(await screen.findByRole('heading', { name: /stock operation items/i })).toBeInTheDocument();
    expect(screen.getByRole('cell', { name: '20' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /next/i }));

    // Step 3: submission
    await user.click(await screen.findByRole('radio', { name: 'No' }));
    await user.click(screen.getByRole('button', { name: /^save$/i }));

    await waitFor(() => expect(mockCreateStockOperation).toHaveBeenCalledTimes(1));
    expect(mockCreateStockOperation).toHaveBeenCalledWith({
      operationDate: expect.any(Date),
      operationTypeUuid: requisitionType.uuid,
      sourceUuid: 'party-dispensary',
      destinationUuid: 'party-main-store',
      responsiblePersonUuid: storeKeeper.uuid,
      responsiblePersonOther: '',
      remarks: 'Monthly top-up',
      approvalRequired: false,
      stockOperationItems: [
        {
          uuid: undefined,
          stockItemUuid: amoxicillin.uuid,
          stockItemPackagingUOMUuid: 'uom-box',
          quantity: 20,
          hasExpiration: true,
        },
      ],
    });
    expect(props.closeWorkspace).toHaveBeenCalled();
    expect(mockShowSnackbar).toHaveBeenCalledWith(expect.objectContaining({ kind: 'success' }));
  });
});
