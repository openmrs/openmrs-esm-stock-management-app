import { renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { openmrsFetch } from '@openmrs/esm-framework';
import { useStockItemReferencesHook } from './stock-item-references.resource';

describe('useStockItemReferencesHook', () => {
  it('sends no request until the stock item UUID is known', async () => {
    vi.mocked(openmrsFetch).mockResolvedValue({ data: { results: [] } } as never);

    const { result } = renderHook(() => useStockItemReferencesHook());

    expect(openmrsFetch).not.toHaveBeenCalled();

    result.current.setStockItemUuid('stock-item-uuid');

    await waitFor(() => expect(openmrsFetch).toHaveBeenCalled());
    expect(
      vi.mocked(openmrsFetch).mock.calls.every(([url]) => String(url).includes('stockItemUuid=stock-item-uuid')),
    ).toBe(true);
  });
});
