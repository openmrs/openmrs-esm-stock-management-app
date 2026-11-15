import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { useStockSources } from './stock-sources.resource';
import useStockSourcesPage from './stock-sources-items-table.resource';

vi.mock('./stock-sources.resource', () => ({ useStockSources: vi.fn() }));

const source = { uuid: 'source-uuid', name: 'Community' };

describe('useStockSourcesPage', () => {
  it('uses the number of results as the total when the backend returns a null totalCount', () => {
    vi.mocked(useStockSources).mockReturnValue({
      items: { results: [source], totalCount: null },
      isLoading: false,
    } as never);

    const { result } = renderHook(() => useStockSourcesPage({}));

    expect(result.current.totalItems).toBe(1);
  });

  it('uses the totalCount from the backend when there is one', () => {
    vi.mocked(useStockSources).mockReturnValue({
      items: { results: [source], totalCount: 12 },
      isLoading: false,
    } as never);

    const { result } = renderHook(() => useStockSourcesPage({}));

    expect(result.current.totalItems).toBe(12);
  });

  it('returns a total of zero before the sources have loaded', () => {
    vi.mocked(useStockSources).mockReturnValue({ items: {}, isLoading: true } as never);

    const { result } = renderHook(() => useStockSourcesPage({}));

    expect(result.current.totalItems).toBe(0);
  });

  describe('filtered by source type', () => {
    const lastFilter = () => vi.mocked(useStockSources).mock.lastCall[0];
    // The backend pages a filtered request itself, so it returns only the page that was asked for.
    const serverPage = Array.from({ length: 10 }, (_, i) => ({ uuid: `other-${i + 41}`, name: `Other ${i + 41}` }));

    it('asks the server for the page the pager is on', () => {
      vi.mocked(useStockSources).mockReturnValue({
        items: { results: serverPage, totalCount: 51 },
        isLoading: false,
      } as never);

      const { result } = renderHook(() => useStockSourcesPage({ sourceTypeUuid: 'other-uuid' }));
      expect(lastFilter()).toEqual(expect.objectContaining({ sourceTypeUuid: 'other-uuid', limit: 10, startIndex: 0 }));

      act(() => result.current.goTo(5));
      expect(lastFilter()).toEqual(expect.objectContaining({ limit: 10, startIndex: 4 }));
      act(() => result.current.goTo(6));
      expect(lastFilter()).toEqual(expect.objectContaining({ limit: 10, startIndex: 5 }));

      expect(result.current.currentPage).toBe(6);
      expect(result.current.totalItems).toBe(51);
      // The server's page is shown as it is, not sliced again
      expect(result.current.items).toEqual(serverPage);
    });

    it('asks the server for pages of the chosen size', () => {
      vi.mocked(useStockSources).mockReturnValue({
        items: { results: serverPage, totalCount: 51 },
        isLoading: false,
      } as never);

      const { result } = renderHook(() => useStockSourcesPage({ sourceTypeUuid: 'other-uuid' }));
      act(() => result.current.setPageSize(20));

      expect(lastFilter()).toEqual(expect.objectContaining({ limit: 20, startIndex: 0 }));
    });

    it('pages in the browser when no source type is chosen, as the backend then returns every source', () => {
      const all = Array.from({ length: 15 }, (_, i) => ({ uuid: `s-${i}`, name: `Source ${i}` }));
      vi.mocked(useStockSources).mockReturnValue({
        items: { results: all, totalCount: null },
        isLoading: false,
      } as never);

      const { result } = renderHook(() => useStockSourcesPage({}));
      act(() => result.current.goTo(2));

      expect(lastFilter().limit).toBeUndefined();
      expect(lastFilter().startIndex).toBeUndefined();
      expect(result.current.items).toEqual(all.slice(10));
    });
  });
});
