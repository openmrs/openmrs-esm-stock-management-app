import { useCallback } from 'react';
import { useSWRConfig } from 'swr';

/**
 * Returns a function that revalidates every SWR cache entry whose key starts with the given URL.
 * String keys are matched directly; array keys are matched on their first element, so resources
 * keyed like `[url, ...]` are refreshed too. It uses the cache from the nearest `SWRConfig` (the
 * one the framework provides to each component), so it must be called from a component rendered
 * inside that provider.
 */
export const useHandleMutate = () => {
  const { mutate } = useSWRConfig();

  return useCallback(
    (url: string) =>
      mutate(
        (key) =>
          (typeof key === 'string' && key.startsWith(url)) ||
          (Array.isArray(key) && typeof key[0] === 'string' && key[0].startsWith(url)),
        undefined,
      ),
    [mutate],
  );
};
