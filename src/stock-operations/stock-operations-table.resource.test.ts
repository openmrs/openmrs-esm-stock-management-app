import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useStockOperationPages } from './stock-operations-table.resource';
import { useStockOperations } from './stock-operations.resource';

vi.mock('./stock-operations.resource', () => ({
  useStockOperations: vi.fn(),
}));

const mockUseStockOperations = vi.mocked(useStockOperations);

beforeEach(() => {
  mockUseStockOperations.mockReset();
  mockUseStockOperations.mockReturnValue({
    items: { results: [], totalCount: 59 },
    isLoading: false,
    error: undefined,
  } as any);
});

describe('useStockOperationPages', () => {
  it('asks the server for the first page only', () => {
    renderHook(() => useStockOperationPages({}));

    expect(mockUseStockOperations).toHaveBeenLastCalledWith(expect.objectContaining({ limit: 10, startIndex: 0 }));
  });

  it('sends the page index (page - 1) when the page changes', () => {
    const { result } = renderHook(() => useStockOperationPages({}));

    act(() => result.current.goTo(3));

    expect(result.current.currentPage).toBe(3);
    expect(mockUseStockOperations).toHaveBeenLastCalledWith(expect.objectContaining({ limit: 10, startIndex: 2 }));
  });

  it('uses the server total for the pager', () => {
    const { result } = renderHook(() => useStockOperationPages({}));

    expect(result.current.totalItems).toBe(59);
  });

  it('returns to page 1 when the search text changes', () => {
    const { result, rerender } = renderHook(({ q }) => useStockOperationPages({ q }), {
      initialProps: { q: undefined as string | undefined },
    });

    act(() => result.current.goTo(3));
    rerender({ q: 'RCPT-0049' });

    expect(result.current.currentPage).toBe(1);
    expect(mockUseStockOperations).toHaveBeenLastCalledWith(expect.objectContaining({ q: 'RCPT-0049', startIndex: 0 }));
  });

  it('returns to page 1 when the page size changes', () => {
    const { result } = renderHook(() => useStockOperationPages({}));

    act(() => result.current.goTo(3));
    act(() => result.current.setPageSize(20));

    expect(result.current.currentPage).toBe(1);
    expect(mockUseStockOperations).toHaveBeenLastCalledWith(expect.objectContaining({ limit: 20, startIndex: 0 }));
  });

  it('does not restore an old page when a filter is cleared', () => {
    const { result, rerender } = renderHook(({ q }) => useStockOperationPages({ q }), {
      initialProps: { q: undefined as string | undefined },
    });

    act(() => result.current.goTo(3));
    rerender({ q: 'RCPT-0049' });
    rerender({ q: undefined });

    expect(result.current.currentPage).toBe(1);
    expect(mockUseStockOperations).toHaveBeenLastCalledWith(expect.objectContaining({ startIndex: 0 }));
  });

  it('moves back to the last page when the server total shrinks', () => {
    const { result, rerender } = renderHook(() => useStockOperationPages({}));

    act(() => result.current.goTo(6));
    mockUseStockOperations.mockReturnValue({
      items: { results: [], totalCount: 49 },
      isLoading: false,
      error: undefined,
    } as any);
    rerender();

    expect(result.current.currentPage).toBe(5);
  });
});
