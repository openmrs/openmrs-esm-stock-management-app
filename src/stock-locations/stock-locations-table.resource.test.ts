import { renderHook } from '@testing-library/react';
import { beforeEach, expect, it, vi } from 'vitest';
import { getDefaultsFromConfigSchema, useConfig, useFhirFetchAll } from '@openmrs/esm-framework';
import { configSchema } from '../config-schema';
import { useStockLocationPages } from './stock-locations-table.resource';

beforeEach(() => {
  vi.mocked(useConfig).mockReturnValue(getDefaultsFromConfigSchema(configSchema));
});

it('exposes the FHIR list mutator through the location pagination hook', async () => {
  const mutate = vi.fn();
  vi.mocked(useFhirFetchAll).mockReturnValue({
    data: [],
    error: undefined,
    isLoading: false,
    mutate,
    totalCount: 0,
    hasMore: false,
    loadMore: vi.fn(),
    isValidating: false,
    nextUri: null,
  });
  const { result } = renderHook(() => useStockLocationPages({}));
  expect(useFhirFetchAll).toHaveBeenCalledWith(expect.stringContaining('/Location?_summary=data&_tag='));
  await result.current.mutate();
  expect(mutate).toHaveBeenCalledOnce();
});

it('fetches locations with the default RefApp stock location tags', () => {
  vi.mocked(useFhirFetchAll).mockReturnValue({ data: [], isLoading: false } as never);
  renderHook(() => useStockLocationPages({}));
  expect(useFhirFetchAll).toHaveBeenCalledWith(
    expect.stringMatching(/\/Location\?_summary=data&_tag=Main%20Store,Main%20Pharmacy,Dispensary$/),
  );
});

it('fetches locations with the configured stock location tags', () => {
  vi.mocked(useConfig).mockReturnValue({ stockLocationTags: ['Central Store', 'Ward'] });
  vi.mocked(useFhirFetchAll).mockReturnValue({ data: [], isLoading: false } as never);
  renderHook(() => useStockLocationPages({}));
  expect(useFhirFetchAll).toHaveBeenCalledWith(
    expect.stringMatching(/\/Location\?_summary=data&_tag=Central%20Store,Ward$/),
  );
});
