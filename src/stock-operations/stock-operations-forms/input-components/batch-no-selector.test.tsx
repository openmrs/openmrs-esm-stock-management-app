import React from 'react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import userEvent from '@testing-library/user-event';
import { render, screen } from '@testing-library/react';
import { type StockBatchDTO } from '../../../core/api/types/stockItem/StockBatchDTO';
import { type StockItemInventory } from '../../../core/api/types/stockItem/StockItemInventory';
import { APP_STOCKMANAGEMENT_STOCKITEMS, formatForDatePicker } from '../../../constants';
import { type PrivilegeScope } from '../../../core/api/types/identity/PriviledgeScope';
import { useStockItemBatchInformationHook } from '../../../stock-items/add-stock-item/batch-information/batch-information.resource';
import { useStockManagementSession } from '../../../stock-lookups/stock-lookups.resource';
import { useStockItemBatchNumbers } from '../hooks/useStockItemBatchNumbers';
import BatchNoSelector from './batch-no-selector.component';

vi.mock('../hooks/useStockItemBatchNumbers', () => ({
  useStockItemBatchNumbers: vi.fn(),
}));

vi.mock('../../../stock-items/add-stock-item/batch-information/batch-information.resource', () => ({
  useStockItemBatchInformationHook: vi.fn(),
}));

vi.mock('../../../stock-lookups/stock-lookups.resource', () => ({
  useStockManagementSession: vi.fn(),
}));

const mockUseStockItemBatchNumbers = vi.mocked(useStockItemBatchNumbers);
const mockUseStockManagementSession = vi.mocked(useStockManagementSession);
const mockUseStockItemBatchInformationHook = vi.mocked(useStockItemBatchInformationHook);

describe('BatchNoSelector', () => {
  const mockOnValueChange = vi.fn();
  const mockStockItemUuid = 'test-uuid';
  const mockExpiration = new Date();

  beforeEach(() => {
    mockUseStockManagementSession.mockReturnValue({
      privilegeScopes: [
        { partyUuid: 'main-store', privilege: APP_STOCKMANAGEMENT_STOCKITEMS },
      ] as Array<PrivilegeScope>,
      isLoading: false,
      error: undefined,
    });
    mockUseStockItemBatchNumbers.mockReturnValue({
      isLoading: false,
      stockItemBatchNos: [
        {
          uuid: '1',
          batchNo: 'BATCH-001',
          quantity: '10',
          expiration: mockExpiration,
          stockItemUuid: 'item1',
          voided: false,
        },
        {
          uuid: '2',
          batchNo: 'BATCH-002',
          quantity: '20',
          expiration: mockExpiration,
          stockItemUuid: 'item2',
          voided: false,
        },
      ],
      setLimit: vi.fn(),
      setRepresentation: vi.fn(),
      setSearchString: vi.fn(),
      error: null,
    });

    mockUseStockItemBatchInformationHook.mockReturnValue({
      items: [
        { stockBatchUuid: '1', batchNumber: 'BATCH-001', quantity: 10 },
        { stockBatchUuid: '2', batchNumber: 'BATCH-002', quantity: 20 },
      ] as StockItemInventory[],
      totalCount: 2,
      currentPage: 1,
      currentPageSize: 10,
      setCurrentPage: vi.fn(),
      setStockBatchUuid: vi.fn(),
      setStockItemUuid: vi.fn(),
      setPageSize: vi.fn(),
      pageSizes: [10, 20, 50],
      isLoading: false,
      error: null,
      setLocationUuid: vi.fn(),
      setPartyUuid: vi.fn(),
      setSearchString: vi.fn(),
    });
  });

  it('should render a loading skeleton when "isLoading" is true', () => {
    mockUseStockItemBatchNumbers.mockReturnValue({
      isLoading: true,
      stockItemBatchNos: [] as StockBatchDTO[],
      setLimit: vi.fn(),
      setRepresentation: vi.fn(),
      setSearchString: vi.fn(),
      error: null,
    });

    mockUseStockItemBatchInformationHook.mockReturnValue({
      isLoading: true,
      items: [],
      setStockItemUuid: vi.fn(),
      totalCount: 0,
      currentPage: 1,
      currentPageSize: 10,
      setCurrentPage: vi.fn(),
      setStockBatchUuid: vi.fn(),
      setPageSize: vi.fn(),
      pageSizes: [10, 20, 50],
      error: null,
      setLocationUuid: vi.fn(),
      setPartyUuid: vi.fn(),
      setSearchString: vi.fn(),
    });

    render(<BatchNoSelector stockItemUuid={mockStockItemUuid} onValueChange={mockOnValueChange} />);

    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  it('should render a combobox with batch numbers', async () => {
    render(<BatchNoSelector stockItemUuid={mockStockItemUuid} onValueChange={mockOnValueChange} />);

    expect(screen.getByRole('combobox')).toBeInTheDocument();
    expect(screen.getByText(/batch number/i)).toBeInTheDocument();
  });

  it('should handle batch selection', async () => {
    const user = userEvent.setup();

    render(<BatchNoSelector stockItemUuid={mockStockItemUuid} onValueChange={mockOnValueChange} />);

    const combobox = screen.getByRole('combobox');
    await user.click(combobox);
    await user.type(combobox, 'BATCH-001');

    const option = screen.getByText(`BATCH-001 | Qty: 10 | Expiry: ${formatForDatePicker(mockExpiration)}`);

    await user.click(option);

    expect(mockOnValueChange).toHaveBeenCalledWith('1');
  });

  it('should display error message when error prop is provided', () => {
    const errorMessage = 'This is an error';
    render(
      <BatchNoSelector stockItemUuid={mockStockItemUuid} onValueChange={mockOnValueChange} error={errorMessage} />,
    );
    expect(screen.getByText(errorMessage)).toBeInTheDocument();
  });

  it("shows the quantity at the operation's source when another location holds the same batch", async () => {
    const user = userEvent.setup();
    const inventory = [
      { partyUuid: 'main-pharmacy', stockBatchUuid: '1', batchNumber: 'BATCH-001', quantity: 20 },
      { partyUuid: 'main-store', stockBatchUuid: '1', batchNumber: 'BATCH-001', quantity: 500 },
    ] as StockItemInventory[];
    mockUseStockItemBatchInformationHook.mockImplementation((filter) => ({
      items: inventory.filter((row) => !filter?.partyUuid || row.partyUuid === filter.partyUuid),
      totalCount: 1,
      currentPage: 1,
      currentPageSize: 10,
      setCurrentPage: vi.fn(),
      setStockBatchUuid: vi.fn(),
      setStockItemUuid: vi.fn(),
      setPageSize: vi.fn(),
      pageSizes: [10, 20, 50],
      isLoading: false,
      error: null,
      setLocationUuid: vi.fn(),
      setPartyUuid: vi.fn(),
      setSearchString: vi.fn(),
    }));

    render(
      <BatchNoSelector stockItemUuid={mockStockItemUuid} partyUuid="main-store" onValueChange={mockOnValueChange} />,
    );

    await user.click(screen.getByRole('combobox'));

    expect(
      screen.getByText(`BATCH-001 | Qty: 500 | Expiry: ${formatForDatePicker(mockExpiration)}`),
    ).toBeInTheDocument();
  });

  it('lists batches with no stock at the party only when includeEmptyBatches is set', async () => {
    const user = userEvent.setup();
    mockUseStockItemBatchNumbers.mockReturnValue({
      isLoading: false,
      stockItemBatchNos: [
        {
          uuid: '1',
          batchNo: 'BATCH-001',
          quantity: undefined,
          expiration: mockExpiration,
          stockItemUuid: 'item1',
          voided: false,
        },
        {
          uuid: '2',
          batchNo: 'BATCH-002',
          quantity: undefined,
          expiration: mockExpiration,
          stockItemUuid: 'item1',
          voided: false,
        },
      ],
      setLimit: vi.fn(),
      setRepresentation: vi.fn(),
      setSearchString: vi.fn(),
      error: null,
    });
    mockUseStockItemBatchInformationHook.mockReturnValue({
      items: [
        { partyUuid: 'main-store', stockBatchUuid: '1', batchNumber: 'BATCH-001', quantity: 500 },
      ] as StockItemInventory[],
      totalCount: 1,
      currentPage: 1,
      currentPageSize: 10,
      setCurrentPage: vi.fn(),
      setStockBatchUuid: vi.fn(),
      setStockItemUuid: vi.fn(),
      setPageSize: vi.fn(),
      pageSizes: [10, 20, 50],
      isLoading: false,
      error: null,
      setLocationUuid: vi.fn(),
      setPartyUuid: vi.fn(),
      setSearchString: vi.fn(),
    });
    const emptyBatchOption = `BATCH-002 | Qty: 0 | Expiry: ${formatForDatePicker(mockExpiration)}`;

    const { unmount } = render(
      <BatchNoSelector stockItemUuid={mockStockItemUuid} partyUuid="main-store" onValueChange={mockOnValueChange} />,
    );
    await user.click(screen.getByRole('combobox'));
    expect(screen.queryByText(/BATCH-002/)).not.toBeInTheDocument();
    unmount();

    render(
      <BatchNoSelector
        stockItemUuid={mockStockItemUuid}
        partyUuid="main-store"
        includeEmptyBatches
        onValueChange={mockOnValueChange}
      />,
    );
    await user.click(screen.getByRole('combobox'));
    expect(screen.getByText(emptyBatchOption)).toBeInTheDocument();
    // Expired batches have no inventory row, so the batch list must leave them out instead of showing them empty.
    expect(mockUseStockItemBatchNumbers).toHaveBeenLastCalledWith(mockStockItemUuid, true);
  });

  it("doesn't call a batch empty where the user can't see the party's stock", async () => {
    const user = userEvent.setup();
    // Inventory comes back empty for a party outside the user's stock scopes.
    mockUseStockManagementSession.mockReturnValue({ privilegeScopes: [], isLoading: false, error: undefined });
    mockUseStockItemBatchNumbers.mockReturnValue({
      isLoading: false,
      stockItemBatchNos: [
        {
          uuid: '1',
          batchNo: 'BATCH-001',
          quantity: undefined,
          expiration: mockExpiration,
          stockItemUuid: 'item1',
          voided: false,
        },
      ],
      setLimit: vi.fn(),
      setRepresentation: vi.fn(),
      setSearchString: vi.fn(),
      error: null,
    });
    mockUseStockItemBatchInformationHook.mockReturnValue({
      items: [] as StockItemInventory[],
      totalCount: 0,
      currentPage: 1,
      currentPageSize: 10,
      setCurrentPage: vi.fn(),
      setStockBatchUuid: vi.fn(),
      setStockItemUuid: vi.fn(),
      setPageSize: vi.fn(),
      pageSizes: [10, 20, 50],
      isLoading: false,
      error: null,
      setLocationUuid: vi.fn(),
      setPartyUuid: vi.fn(),
      setSearchString: vi.fn(),
    });

    render(
      <BatchNoSelector
        stockItemUuid={mockStockItemUuid}
        partyUuid="main-store"
        includeEmptyBatches
        onValueChange={mockOnValueChange}
      />,
    );
    await user.click(screen.getByRole('combobox'));

    expect(
      screen.getByText(`BATCH-001 | Qty: Unknown | Expiry: ${formatForDatePicker(mockExpiration)}`),
    ).toBeInTheDocument();
    expect(screen.queryByText(/Qty: 0/)).not.toBeInTheDocument();
  });

  it('keeps the batch list unfiltered by expiry when empty batches are hidden', () => {
    render(<BatchNoSelector stockItemUuid={mockStockItemUuid} onValueChange={mockOnValueChange} />);

    expect(mockUseStockItemBatchNumbers).toHaveBeenLastCalledWith(mockStockItemUuid, false);
  });

  it('offers no batches and shows an error when the inventory fails to load', async () => {
    const user = userEvent.setup();
    mockUseStockItemBatchInformationHook.mockReturnValue({
      items: [],
      totalCount: 0,
      currentPage: 1,
      currentPageSize: 10,
      setCurrentPage: vi.fn(),
      setStockBatchUuid: vi.fn(),
      setStockItemUuid: vi.fn(),
      setPageSize: vi.fn(),
      pageSizes: [10, 20, 50],
      isLoading: false,
      error: new Error('Forbidden'),
      setLocationUuid: vi.fn(),
      setPartyUuid: vi.fn(),
      setSearchString: vi.fn(),
    });

    render(
      <BatchNoSelector
        stockItemUuid={mockStockItemUuid}
        partyUuid="main-store"
        includeEmptyBatches
        onValueChange={mockOnValueChange}
      />,
    );
    await user.click(screen.getByRole('combobox'));

    expect(screen.queryAllByRole('option')).toHaveLength(0);
    expect(screen.getByText("Couldn't load the stock held at this location")).toBeInTheDocument();
  });

  it('offers no batches and shows an error when the batch list fails to load', async () => {
    const user = userEvent.setup();
    mockUseStockItemBatchNumbers.mockReturnValue({
      isLoading: false,
      stockItemBatchNos: undefined,
      error: new Error('Forbidden'),
      setLimit: vi.fn(),
      setRepresentation: vi.fn(),
      setSearchString: vi.fn(),
    });

    render(
      <BatchNoSelector stockItemUuid={mockStockItemUuid} partyUuid="main-store" onValueChange={mockOnValueChange} />,
    );
    await user.click(screen.getByRole('combobox'));

    expect(screen.queryAllByRole('option')).toHaveLength(0);
    expect(screen.getByText("Couldn't load this item's batches")).toBeInTheDocument();
  });

  it('matches each batch to its own inventory row when two batches share a number', async () => {
    const user = userEvent.setup();
    const laterExpiration = new Date(mockExpiration.getTime() + 365 * 24 * 60 * 60 * 1000);
    mockUseStockItemBatchNumbers.mockReturnValue({
      isLoading: false,
      stockItemBatchNos: [
        {
          uuid: '1',
          batchNo: 'BATCH-001',
          quantity: undefined,
          expiration: mockExpiration,
          stockItemUuid: 'item1',
          voided: false,
        },
        {
          uuid: '2',
          batchNo: 'BATCH-001',
          quantity: undefined,
          expiration: laterExpiration,
          stockItemUuid: 'item1',
          voided: false,
        },
      ],
      setLimit: vi.fn(),
      setRepresentation: vi.fn(),
      setSearchString: vi.fn(),
      error: null,
    });
    mockUseStockItemBatchInformationHook.mockReturnValue({
      items: [
        { stockBatchUuid: '1', batchNumber: 'BATCH-001', quantity: 10, expiration: mockExpiration },
        { stockBatchUuid: '2', batchNumber: 'BATCH-001', quantity: 5, expiration: laterExpiration },
      ] as StockItemInventory[],
      totalCount: 2,
      currentPage: 1,
      currentPageSize: 10,
      setCurrentPage: vi.fn(),
      setStockBatchUuid: vi.fn(),
      setStockItemUuid: vi.fn(),
      setPageSize: vi.fn(),
      pageSizes: [10, 20, 50],
      isLoading: false,
      error: null,
      setLocationUuid: vi.fn(),
      setPartyUuid: vi.fn(),
      setSearchString: vi.fn(),
    });

    render(<BatchNoSelector stockItemUuid={mockStockItemUuid} onValueChange={mockOnValueChange} />);
    await user.click(screen.getByRole('combobox'));

    expect(
      screen.getByText(`BATCH-001 | Qty: 10 | Expiry: ${formatForDatePicker(mockExpiration)}`),
    ).toBeInTheDocument();
    expect(
      screen.getByText(`BATCH-001 | Qty: 5 | Expiry: ${formatForDatePicker(laterExpiration)}`),
    ).toBeInTheDocument();
  });

  it('should filter out batches with zero or undefined quantity', async () => {
    const user = userEvent.setup();

    mockUseStockItemBatchNumbers.mockReturnValue({
      isLoading: false,
      stockItemBatchNos: [
        {
          uuid: '1',
          batchNo: 'BATCH-001',
          quantity: '10',
          expiration: mockExpiration,
          stockItemUuid: 'item1',
          voided: false,
        },
        {
          uuid: '2',
          batchNo: 'BATCH-002',
          quantity: '0',
          expiration: mockExpiration,
          stockItemUuid: 'item2',
          voided: false,
        },
        {
          uuid: '3',
          batchNo: 'BATCH-003',
          quantity: undefined,
          expiration: mockExpiration,
          stockItemUuid: 'item3',
          voided: false,
        },
      ],
      setLimit: vi.fn(),
      setRepresentation: vi.fn(),
      setSearchString: vi.fn(),
      error: null,
    });

    render(<BatchNoSelector stockItemUuid={mockStockItemUuid} onValueChange={mockOnValueChange} />);

    const combobox = screen.getByRole('combobox');
    await user.click(combobox);

    expect(screen.queryByText('BATCH-002')).not.toBeInTheDocument();
    expect(screen.queryByText('BATCH-003')).not.toBeInTheDocument();
  });
});
