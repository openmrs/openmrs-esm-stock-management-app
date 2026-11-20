import { act, renderHook } from '@testing-library/react';
import useSWR from 'swr';
import { openmrsFetch } from '@openmrs/esm-framework';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useStockInventoryItems } from './stock-home-inventory-items.resource';

vi.mock('swr', () => ({ default: vi.fn() }));

const mockedUseSWR = vi.mocked(useSWR);
const mockedOpenmrsFetch = vi.mocked(openmrsFetch);

describe('useStockInventoryItems', () => {
  beforeEach(() => {
    mockedUseSWR.mockReturnValue({
      data: undefined,
      error: undefined,
      isLoading: false,
      mutate: vi.fn(),
    } as never);
  });

  it('keys the cache on the stock item URL so saves revalidate it', () => {
    renderHook(() => useStockInventoryItems());

    expect(mockedUseSWR.mock.calls.at(-1)?.[0]).toEqual([
      expect.stringContaining('/stockmanagement/stockitem'),
      'inventory',
      'default',
    ]);
  });

  it('fetches every page of stock items', async () => {
    renderHook(() => useStockInventoryItems());
    const fetcher = mockedUseSWR.mock.calls.at(-1)?.[1] as () => Promise<unknown>;
    const firstPage = Array.from({ length: 100 }, (_, index) => ({ uuid: `stock-item-${index}` }));

    mockedOpenmrsFetch
      .mockResolvedValueOnce({ data: { results: firstPage, totalCount: 101 } } as never)
      .mockResolvedValueOnce({ data: { results: [{ uuid: 'stock-item-100' }], totalCount: 101 } } as never);

    let stockItems: unknown;

    await act(async () => {
      stockItems = await fetcher();
    });

    expect(stockItems).toHaveLength(101);
    expect(mockedOpenmrsFetch).toHaveBeenNthCalledWith(1, expect.stringContaining('startIndex=0'));
    expect(mockedOpenmrsFetch).toHaveBeenNthCalledWith(1, expect.stringContaining('limit=100'));
    expect(mockedOpenmrsFetch).toHaveBeenNthCalledWith(2, expect.stringContaining('startIndex=100'));
  });
});
