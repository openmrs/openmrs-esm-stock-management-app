import { renderHook } from '@testing-library/react';
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
});
