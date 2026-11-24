import React from 'react';
import { vi, describe, it, expect, test, beforeEach } from 'vitest';
import userEvent from '@testing-library/user-event';
import { renderHook, act, render, screen, waitFor } from '@testing-library/react';
import { type StockSource } from '../core/api/types/stockOperation/StockSource';
import { type Concept } from '../core/api/types/concept/Concept';
import { useConcept } from '../stock-lookups/stock-lookups.resource';
import useStockSourcesPage from './stock-sources-items-table.resource';
import StockSourcesItems from './stock-sources-items-table.component';

const mockUseStockSourcesPage = vi.mocked(useStockSourcesPage);
const mockUseConcept = vi.mocked(useConcept);

vi.mock('./stock-sources-items-table.resource', () => ({
  default: vi.fn(),
  useStockSourcesPage: vi.fn(),
}));

vi.mock('../stock-lookups/stock-lookups.resource', () => ({
  useConcept: vi.fn(),
}));

describe('StockSourcesItems', () => {
  const mockFilter = {};
  const mockItems = {
    results: [
      {
        uuid: '1',
        name: 'Community',
        acronym: 'Community',
        sourceType: { display: 'Donation' },
        creator: null,
        dateCreated: null,
        changedBy: null,
        dateChanged: null,
        retired: false,
        dateRetired: null,
        retiredBy: null,
        retireReason: null,
      },
    ] as unknown as StockSource[],
    totalCount: 1,
  };

  beforeEach(() => {
    mockUseConcept.mockReturnValue({
      items: {
        uuid: '1',
        display: 'Source Types',
        answers: [
          { uuid: '1', display: 'Donation' },
          { uuid: '2', display: 'Internal' },
          { uuid: '3', display: 'External' },
        ] as Concept[],
      } as Concept,
      isLoading: false,
      error: null,
    });
  });

  it('should return initial values', () => {
    const mockFilter = {};
    const mockItems = {
      results: [{ name: 'Community', acronym: 'Community', sourceType: { display: 'Donation' } }],
      totalCount: 1,
    };

    mockUseStockSourcesPage.mockReturnValue({
      items: mockItems.results as unknown as StockSource[],
      isLoading: false,
      totalItems: mockItems.totalCount,
      currentPage: 1,
      pageSizes: [10, 20, 50],
      goTo: vi.fn(),
      currentPageSize: 10,
      setPageSize: vi.fn(),
      error: null,
      paginatedItems: mockItems.results as unknown as StockSource[],
      tableHeaders: [],
    });

    const { result } = renderHook(() => useStockSourcesPage(mockFilter));

    expect(result.current.items).toEqual(mockItems.results);
    expect(result.current.totalItems).toBe(mockItems.totalCount);
    expect(result.current.currentPageSize).toBe(10);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBe(null);
  });

  it('should update current page size', () => {
    let currentPageSize = 10; // Track page size with a local variable

    mockUseStockSourcesPage.mockReturnValue({
      items: mockItems.results,
      isLoading: false,
      totalItems: mockItems.totalCount,
      currentPage: 1,
      pageSizes: [10, 20, 50],
      goTo: vi.fn(),
      currentPageSize,
      setPageSize: vi.fn((size: number) => {
        currentPageSize = size;
      }),
      error: null,
      paginatedItems: mockItems.results,
      tableHeaders: [],
    });

    const { result } = renderHook(() => useStockSourcesPage(mockFilter));

    act(() => {
      result.current.setPageSize(20);
    });

    expect(currentPageSize).toBe(20); // Check the local variable instead
  });

  it('should handle loading and error states', () => {
    mockUseStockSourcesPage.mockReturnValue({
      items: [] as unknown as StockSource[],
      isLoading: true,
      error: null,
      totalItems: 0,
      currentPage: 1,
      currentPageSize: 10,
      pageSizes: [10, 20, 50],
      goTo: vi.fn(),
      setPageSize: vi.fn(),
      paginatedItems: [] as unknown as StockSource[],
      tableHeaders: [],
    });

    const { result } = renderHook(() => useStockSourcesPage(mockFilter));

    expect(result.current.isLoading).toBe(true);
    expect(result.current.error).toBe(null);
    expect(result.current.totalItems).toBe(0);
  });

  test('renders loading state when data is being fetched', () => {
    mockUseStockSourcesPage.mockReturnValue({
      items: [],
      isLoading: true,
      totalItems: 0,
      tableHeaders: [],
      currentPage: 1,
      pageSizes: [10, 20, 50],
      goTo: vi.fn(),
      currentPageSize: 10,
      setPageSize: vi.fn(),
      paginatedItems: [],
      error: null,
    });

    render(<StockSourcesItems />);

    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  test('renders data table when data is loaded', () => {
    const mockItems = [
      {
        uuid: '1234',
        name: 'Source A',
        acronym: 'SA',
        sourceType: { display: 'Internal' },
      },
    ];

    mockUseStockSourcesPage.mockReturnValue({
      items: mockItems as unknown as StockSource[],
      isLoading: false,
      totalItems: 1,
      tableHeaders: [
        { id: 0, key: 'name', header: 'Name' },
        { id: 1, key: 'sourceType', header: 'Source Type' },
      ],
      currentPage: 1,
      pageSizes: [10, 20, 50],
      goTo: vi.fn(),
      currentPageSize: 10,
      setPageSize: vi.fn(),
      paginatedItems: mockItems as unknown as StockSource[],
      error: null,
    });

    render(<StockSourcesItems />);

    expect(screen.getByText(/source a/i)).toBeInTheDocument();
    expect(screen.getByText(/internal/i)).toBeInTheDocument();
  });

  describe('source type filter', () => {
    const sources = [
      { uuid: '1234', name: 'Source A', acronym: 'SA', sourceType: { display: 'Internal' } },
      { uuid: '5678', name: 'Source B', acronym: 'SB', sourceType: { display: 'External' } },
    ] as unknown as StockSource[];

    const mockPage = (overrides = {}) => {
      const goTo = vi.fn();
      mockUseStockSourcesPage.mockReturnValue({
        items: sources,
        isLoading: false,
        totalItems: 2,
        tableHeaders: [
          { id: 0, key: 'name', header: 'Name' },
          { id: 1, key: 'sourceType', header: 'Source type' },
        ],
        currentPage: 1,
        pageSizes: [10, 20, 50],
        goTo,
        currentPageSize: 10,
        setPageSize: vi.fn(),
        paginatedItems: sources,
        error: null,
        ...overrides,
      });
      return goTo;
    };

    const getFilter = () => screen.getByRole('combobox', { name: /select source type/i });

    const selectSourceType = async (user: ReturnType<typeof userEvent.setup>, name: string) => {
      await user.click(getFilter());
      await user.click(screen.getByRole('option', { name }));
    };

    test('selects all source types by default and shows every source', () => {
      mockPage();

      render(<StockSourcesItems />);

      expect(getFilter()).toHaveTextContent('All source types');
      expect(mockUseStockSourcesPage).toHaveBeenLastCalledWith(expect.objectContaining({ sourceTypeUuid: undefined }));
      expect(screen.getByText('Source A')).toBeInTheDocument();
      expect(screen.getByText('Source B')).toBeInTheDocument();
    });

    test("sends the selected source type's UUID to the server and returns to the first page", async () => {
      const user = userEvent.setup();
      const goTo = mockPage();
      render(<StockSourcesItems />);

      await selectSourceType(user, 'Internal');

      expect(mockUseStockSourcesPage).toHaveBeenLastCalledWith(expect.objectContaining({ sourceTypeUuid: '2' }));
      expect(goTo).toHaveBeenCalledWith(1);
      expect(getFilter()).toHaveTextContent('Internal');
    });

    test('clears the source type when all source types is chosen again', async () => {
      const user = userEvent.setup();
      mockPage();
      render(<StockSourcesItems />);

      await selectSourceType(user, 'Internal');
      await selectSourceType(user, 'All source types');

      expect(mockUseStockSourcesPage).toHaveBeenLastCalledWith(expect.objectContaining({ sourceTypeUuid: undefined }));
      expect(getFilter()).toHaveTextContent('All source types');
    });

    test('keeps the filter and search while a selected source type loads', async () => {
      const user = userEvent.setup();
      mockPage();
      render(<StockSourcesItems />);
      await user.type(screen.getByRole('searchbox'), 'Source');

      mockPage({ items: [], isLoading: true });
      await selectSourceType(user, 'Internal');

      expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
      expect(getFilter()).toHaveTextContent('Internal');
      expect(screen.getByRole('searchbox')).toHaveValue('Source');
      expect(screen.queryByText(/no stock sources to display/i)).not.toBeInTheDocument();
    });

    test('does not show the empty state while a selected source type is still loading', async () => {
      const user = userEvent.setup();
      mockPage({ items: [], totalItems: 0 });
      const { rerender } = render(<StockSourcesItems />);
      await selectSourceType(user, 'Internal');
      expect(screen.getByText(/no stock sources to display/i)).toBeInTheDocument();

      mockPage({ items: [], totalItems: 0, isLoading: true });
      rerender(<StockSourcesItems />);

      expect(screen.queryByText(/no stock sources to display/i)).not.toBeInTheDocument();
      expect(screen.getByText('Loading...')).toBeInTheDocument();
    });

    test('only suggests checking the filters when a filter or search is active', async () => {
      const user = userEvent.setup();
      mockPage({ items: [], totalItems: 0 });
      render(<StockSourcesItems />);

      expect(screen.getByText(/no stock sources to display/i)).toBeInTheDocument();
      expect(screen.queryByText(/check the filters above/i)).not.toBeInTheDocument();

      await selectSourceType(user, 'Internal');
      expect(screen.getByText(/check the filters above/i)).toBeInTheDocument();

      await selectSourceType(user, 'All source types');
      expect(screen.queryByText(/check the filters above/i)).not.toBeInTheDocument();

      await user.type(screen.getByRole('searchbox'), 'Missing');
      expect(screen.getByText(/check the filters above/i)).toBeInTheDocument();

      await user.clear(screen.getByRole('searchbox'));
      expect(screen.queryByText(/check the filters above/i)).not.toBeInTheDocument();
    });
  });

  test('pagination works as expected', async () => {
    const user = userEvent.setup();

    const mockGoTo = vi.fn();
    const mockSetPageSize = vi.fn();

    mockUseStockSourcesPage.mockReturnValue({
      items: [],
      isLoading: false,
      totalItems: 20,
      tableHeaders: [],
      currentPage: 1,
      pageSizes: [10, 20, 50],
      goTo: mockGoTo,
      currentPageSize: 10,
      setPageSize: mockSetPageSize,
      paginatedItems: [],
      error: null,
    });

    render(<StockSourcesItems />);

    const nextPageButton = screen.getByLabelText(/next page/i);
    await user.click(nextPageButton);

    expect(mockGoTo).toHaveBeenCalledWith(2);
  });
});
