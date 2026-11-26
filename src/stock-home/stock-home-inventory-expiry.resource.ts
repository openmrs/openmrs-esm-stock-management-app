import { useMemo } from 'react';
import useSWR from 'swr';
import { openmrsFetch, restBaseUrl } from '@openmrs/esm-framework';
import { type PageableResult } from '../core/api/types/PageableResult';
import { LocationStockItemBatchNo, type StockItemDTO } from '../core/api/types/stockItem/StockItem';
import { type StockItemInventory } from '../core/api/types/stockItem/StockItemInventory';
import { buildStockInventoryRow, type StockInventoryRow } from './stock-home.utils';
import { useStockInventoryItems } from './stock-home-inventory-items.resource';

const INVENTORY_BATCH_SIZE = 10;

async function fetchStockItemInventory(stockItemUuid: string) {
  const response = await openmrsFetch<PageableResult<StockItemInventory>>(
    `${restBaseUrl}/stockmanagement/stockiteminventory?stockItemUuid=${stockItemUuid}&v=default&includeBatchNo=true&includeStockItemName=true&groupBy=${LocationStockItemBatchNo}&excludeExpired=false`,
  );

  return response.data?.results ?? [];
}

async function fetchInventoryForStockItems(stockItemUuids: string[]) {
  const inventoryRows: StockItemInventory[] = [];

  for (let index = 0; index < stockItemUuids.length; index += INVENTORY_BATCH_SIZE) {
    const batches = await Promise.all(
      stockItemUuids.slice(index, index + INVENTORY_BATCH_SIZE).map(fetchStockItemInventory),
    );
    inventoryRows.push(...batches.flat());
  }

  return inventoryRows;
}

export function useStockInventory() {
  const { items: stockItems, isLoading: stockItemsLoading, error: stockItemsError } = useStockInventoryItems();
  const stockItemUuids = stockItems.map((stockItem) => stockItem.uuid).filter((uuid): uuid is string => Boolean(uuid));
  const { data, isLoading, error } = useSWR(
    stockItemUuids.length
      ? [`${restBaseUrl}/stockmanagement/stockitem`, 'inventoryRows', stockItemUuids.join(',')]
      : null,
    () => fetchInventoryForStockItems(stockItemUuids),
  );

  const items = useMemo(() => {
    const stockItemsByUuid = new Map<string, StockItemDTO>();
    stockItems.forEach((stockItem) => {
      if (stockItem.uuid) {
        stockItemsByUuid.set(stockItem.uuid, stockItem);
      }
    });

    return (data ?? []).reduce<StockInventoryRow[]>((rows, inventory) => {
      const stockItem = inventory.stockItemUuid ? stockItemsByUuid.get(inventory.stockItemUuid) : undefined;
      if (stockItem) {
        rows.push(buildStockInventoryRow(stockItem, inventory));
      }
      return rows;
    }, []);
  }, [data, stockItems]);

  return {
    items,
    isLoading: stockItemsLoading || isLoading,
    error: stockItemsError || error,
  };
}
