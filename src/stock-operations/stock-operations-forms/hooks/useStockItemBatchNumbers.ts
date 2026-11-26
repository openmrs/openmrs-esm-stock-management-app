import { useEffect, useState } from 'react';
import { ResourceRepresentation } from '../../../core/api/api';
import { type StockBatchFilter, useStockBatches } from '../../../stock-items/stock-items.resource';

export function useStockItemBatchNumbers(stockItemUuid: string, excludeExpired = false) {
  const [conceptFilter, setConceptFilter] = useState<StockBatchFilter>({
    v: ResourceRepresentation.Default,
    limit: 10,
    startIndex: 0,
    stockItemUuid,
    excludeExpired: excludeExpired || undefined,
  });

  const {
    items: { results: stockItemBatchNos },
    isLoading,
    error,
  } = useStockBatches(conceptFilter);

  const [searchString, setSearchString] = useState(null);

  // Drug filter type
  const [limit, setLimit] = useState(10);
  const [representation, setRepresentation] = useState(ResourceRepresentation.Default);

  useEffect(() => {
    setConceptFilter({
      startIndex: 0,
      v: representation,
      limit: limit,
      q: searchString,
      stockItemUuid,
      excludeExpired: excludeExpired || undefined,
    });
  }, [searchString, limit, representation, stockItemUuid, excludeExpired]);

  return {
    stockItemBatchNos,
    setLimit,
    setRepresentation,
    setSearchString,
    isLoading,
    error,
  };
}
