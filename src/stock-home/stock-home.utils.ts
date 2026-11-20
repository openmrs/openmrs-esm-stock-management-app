import { type ConfigObject } from '../config-schema';
import { type StockItemDTO } from '../core/api/types/stockItem/StockItem';
import { type StockItemInventory } from '../core/api/types/stockItem/StockItemInventory';

const MILLISECONDS_PER_DAY = 1000 * 60 * 60 * 24;
const SIX_MONTHS_IN_DAYS = 180;

export interface StockInventoryRow extends Omit<StockItemInventory, 'quantity' | 'quantityFactor'> {
  itemName: string;
  hasExpiration: boolean | null | undefined;
  expiryNotice: number | null | undefined;
  reorderLevel: number | null | undefined;
  reorderLevelUoMFactor: number | null | undefined;
  dispensingUnitName: string | null | undefined;
  quantity: number;
  quantityFactor: number;
}

export interface StockLevelSummary {
  outOfStock: StockItemDTO[];
  understocked: StockItemDTO[];
}

export type DisposalReasonCategory = 'expired' | 'poorQuality' | null;

export function getStockItemDisplayName(stockItem: StockItemDTO) {
  return stockItem.drugName || stockItem.conceptName || stockItem.commonName || stockItem.acronym || '';
}

export function buildStockInventoryRow(stockItem: StockItemDTO, inventory: StockItemInventory): StockInventoryRow {
  return {
    ...inventory,
    stockItemUuid: inventory.stockItemUuid || stockItem.uuid,
    itemName: getStockItemDisplayName(stockItem),
    hasExpiration: stockItem.hasExpiration,
    expiryNotice: stockItem.expiryNotice,
    reorderLevel: stockItem.reorderLevel,
    reorderLevelUoMFactor: stockItem.reorderLevelUoMFactor,
    dispensingUnitName: stockItem.dispensingUnitName,
    quantity: Number(inventory.quantity) || 0,
    quantityFactor: Number(inventory.quantityFactor) || 1,
  };
}

export function daysUntil(date: Date | string | null | undefined, now = new Date()) {
  if (!date) {
    return null;
  }

  return Math.ceil((new Date(date).getTime() - now.getTime()) / MILLISECONDS_PER_DAY);
}

export function isExpired(date: Date | string | null | undefined, now = new Date()) {
  if (!date) {
    return false;
  }

  return new Date(date).getTime() < now.getTime();
}

export function isExpiringStock(row: StockInventoryRow, now = new Date()) {
  if (!row.hasExpiration || !row.expiration || Number(row.quantity) <= 0) {
    return false;
  }

  const days = daysUntil(row.expiration, now);
  return days !== null && days >= 0 && days <= (Number(row.expiryNotice) || 0);
}

export function isExpiringWithinSixMonths(row: StockInventoryRow, now = new Date()) {
  if (!row.hasExpiration || !row.expiration || Number(row.quantity) <= 0) {
    return false;
  }

  const days = daysUntil(row.expiration, now);
  return days !== null && days >= 0 && days <= SIX_MONTHS_IN_DAYS;
}

function getAvailableQuantity(row: StockInventoryRow, now: Date) {
  if (isExpired(row.expiration, now)) {
    return 0;
  }

  return (Number(row.quantity) || 0) * (Number(row.quantityFactor) || 1);
}

export function getStockLevels(
  stockItems: StockItemDTO[],
  inventoryRows: StockInventoryRow[],
  now = new Date(),
): StockLevelSummary {
  const quantityByStockItem = inventoryRows.reduce((quantities, row) => {
    if (!row.stockItemUuid) {
      return quantities;
    }

    quantities.set(row.stockItemUuid, (quantities.get(row.stockItemUuid) || 0) + getAvailableQuantity(row, now));
    return quantities;
  }, new Map<string, number>());

  const outOfStock: StockItemDTO[] = [];
  const understocked: StockItemDTO[] = [];

  stockItems.forEach((stockItem) => {
    if (!stockItem.uuid) {
      return;
    }

    const quantity = quantityByStockItem.get(stockItem.uuid) || 0;
    const reorderLevel = (Number(stockItem.reorderLevel) || 0) * (Number(stockItem.reorderLevelUoMFactor) || 1);

    if (quantity <= 0) {
      outOfStock.push(stockItem);
    } else if (reorderLevel > 0 && quantity < reorderLevel) {
      understocked.push(stockItem);
    }
  });

  return { outOfStock, understocked };
}

export function getDisposalReasonCategory(
  reason: { reasonUuid?: string | null; reasonName?: string | null },
  config?: Pick<ConfigObject, 'expiredStockReasonUUIDs' | 'poorQualityStockReasonUUIDs'>,
): DisposalReasonCategory {
  const expiredReasonUuids = config?.expiredStockReasonUUIDs ?? [];
  const poorQualityReasonUuids = config?.poorQualityStockReasonUUIDs ?? [];
  const normalizedReason = reason.reasonName?.trim().toLowerCase() ?? '';
  const matches = (reasonUuids: Array<string>, reasonNames: Array<string>) =>
    reasonUuids.length > 0
      ? reason.reasonUuid != null && reasonUuids.includes(reason.reasonUuid)
      : reasonNames.some((name) => normalizedReason.includes(name));

  if (matches(expiredReasonUuids, ['expired'])) {
    return 'expired';
  }

  if (matches(poorQualityReasonUuids, ['spillage', 'poor quality'])) {
    return 'poorQuality';
  }

  return null;
}
