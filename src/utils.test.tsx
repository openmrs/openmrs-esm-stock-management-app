import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { act, render, waitFor } from '@testing-library/react';
import useSWR, { SWRConfig } from 'swr';
import { useHandleMutate } from './utils';

describe('useHandleMutate', () => {
  it('revalidates matching keys in the cache provided by SWRConfig', async () => {
    const fetcher = vi.fn((key: string) => Promise.resolve(key));
    let handleMutate: ReturnType<typeof useHandleMutate>;

    const TestComponent = () => {
      useSWR('/ws/rest/v1/stockmanagement/stocksource?v=default', fetcher);
      useSWR('/ws/rest/v1/stockmanagement/stockitem?v=default', fetcher);
      handleMutate = useHandleMutate();
      return null;
    };

    render(
      <SWRConfig value={{ provider: () => new Map() }}>
        <TestComponent />
      </SWRConfig>,
    );

    await waitFor(() => expect(fetcher).toHaveBeenCalledTimes(2));

    await act(() => handleMutate('/ws/rest/v1/stockmanagement/stocksource'));

    expect(fetcher).toHaveBeenCalledTimes(3);
    expect(fetcher).toHaveBeenLastCalledWith('/ws/rest/v1/stockmanagement/stocksource?v=default');
  });

  it('a prefix ending in ? stops before sibling keys that merely share the leading text', async () => {
    // pins the discriminator for cache-prefix scoping: a trailing ? matches only keys
    // that actually carry it, not siblings sharing the leading resource text
    const fetcher = vi.fn((key: string) => Promise.resolve(key));
    let handleMutate: ReturnType<typeof useHandleMutate>;

    const TestComponent = () => {
      useSWR('/ws/rest/v1/stockmanagement/stockitempackaginguom?startIndex=0&v=default', fetcher);
      useSWR('/ws/rest/v1/stockmanagement/stockitempackaginguomreference?v=default&x=1', fetcher);
      handleMutate = useHandleMutate();
      return null;
    };

    render(
      <SWRConfig value={{ provider: () => new Map() }}>
        <TestComponent />
      </SWRConfig>,
    );

    await waitFor(() => expect(fetcher).toHaveBeenCalledTimes(2));

    await act(() => handleMutate('/ws/rest/v1/stockmanagement/stockitempackaginguom?'));

    expect(fetcher).toHaveBeenCalledTimes(3);
    expect(fetcher).toHaveBeenLastCalledWith(
      '/ws/rest/v1/stockmanagement/stockitempackaginguom?startIndex=0&v=default',
    );
  });
});
