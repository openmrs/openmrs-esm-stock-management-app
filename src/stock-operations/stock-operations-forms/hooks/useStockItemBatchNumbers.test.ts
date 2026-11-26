import { describe, expect, it, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useStockBatches } from '../../../stock-items/stock-items.resource';
import { useStockItemBatchNumbers } from './useStockItemBatchNumbers';

vi.mock('../../../stock-items/stock-items.resource', () => ({
  useStockBatches: vi.fn().mockReturnValue({ items: { results: [] }, isLoading: false, error: null }),
}));

const mockUseStockBatches = vi.mocked(useStockBatches);

describe('useStockItemBatchNumbers', () => {
  it('asks stockbatch to leave out expired batches when told to', () => {
    renderHook(() => useStockItemBatchNumbers('item-uuid', true));

    expect(mockUseStockBatches).toHaveBeenLastCalledWith(
      expect.objectContaining({ stockItemUuid: 'item-uuid', excludeExpired: true }),
    );
  });

  it("returns the batch request's error", () => {
    const error = new Error('Forbidden');
    mockUseStockBatches.mockReturnValue({ items: {}, isLoading: false, error } as ReturnType<typeof useStockBatches>);

    const { result } = renderHook(() => useStockItemBatchNumbers('item-uuid'));

    expect(result.current.error).toBe(error);
  });
});
