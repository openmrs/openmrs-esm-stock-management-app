import React from 'react';
import { SWRConfig } from 'swr';
import { renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { openmrsFetch } from '@openmrs/esm-framework';
import { useStockSources } from './stock-sources.resource';

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <SWRConfig value={{ provider: () => new Map(), dedupingInterval: 0 }}>{children}</SWRConfig>
);

describe('useStockSources', () => {
  it('keeps the current page while the next one loads', async () => {
    const firstPage = { results: [{ uuid: 'other-1', name: 'Other 1' }], totalCount: 11 };
    // The first page is sent without a startIndex; the second never finishes loading
    vi.mocked(openmrsFetch).mockImplementation((url: string) =>
      url.includes('startIndex') ? new Promise(() => {}) : Promise.resolve({ data: firstPage } as never),
    );

    const { result, rerender } = renderHook(({ startIndex }) => useStockSources({ limit: 10, startIndex }), {
      initialProps: { startIndex: 0 },
      wrapper,
    });
    await waitFor(() => expect(result.current.items).toEqual(firstPage));

    rerender({ startIndex: 1 });

    expect(result.current.items).toEqual(firstPage);
  });
});
