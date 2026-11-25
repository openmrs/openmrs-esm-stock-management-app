import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useStockItemInventory } from '../../stock-items.resource';
import { useStockItemBatchInformationHook } from './batch-information.resource';

vi.mock('../../stock-items.resource', () => ({
  useStockItemInventory: vi.fn(() => ({ items: {}, isLoading: false, error: undefined })),
}));

const lastFilter = () => vi.mocked(useStockItemInventory).mock.lastCall[0];

describe('useStockItemBatchInformationHook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('asks the server for expired batches too when told not to exclude them', () => {
    const { result } = renderHook(() => useStockItemBatchInformationHook({ excludeExpired: false }));

    act(() => result.current.setStockItemUuid('item-1'));

    expect(lastFilter()).toEqual(expect.objectContaining({ stockItemUuid: 'item-1', excludeExpired: false }));
  });

  it("leaves expired batches to the server's default otherwise", () => {
    const { result } = renderHook(() => useStockItemBatchInformationHook());

    act(() => result.current.setStockItemUuid('item-1'));

    expect(lastFilter()).toEqual(expect.objectContaining({ stockItemUuid: 'item-1' }));
    expect(lastFilter().excludeExpired).toBeUndefined();
  });
});
