import { describe, expect, it } from 'vitest';
import { type StockItemDTO } from '../core/api/types/stockItem/StockItem';
import {
  buildStockInventoryRow,
  getDisposalReasonCategory,
  getStockLevels,
  isExpiringStock,
  isExpiringWithinSixMonths,
  type StockInventoryRow,
} from './stock-home.utils';
import { type StockItemInventory } from '../core/api/types/stockItem/StockItemInventory';

const now = new Date('2026-01-01T00:00:00.000Z');

function makeStockItem(overrides: Partial<StockItemDTO> = {}) {
  return {
    uuid: 'stock-item',
    reorderLevel: 10,
    reorderLevelUoMFactor: 1,
    ...overrides,
  } as StockItemDTO;
}

function makeInventoryRow(overrides: Partial<StockInventoryRow> = {}) {
  return {
    stockItemUuid: 'stock-item',
    stockBatchUuid: 'stock-batch',
    partyUuid: 'party',
    partyName: 'Main Pharmacy',
    batchNumber: 'B1',
    quantity: 0,
    quantityUoM: 'Tablet',
    quantityFactor: 1,
    expiration: new Date('2026-12-31T00:00:00.000Z'),
    itemName: 'Paracetamol',
    hasExpiration: true,
    expiryNotice: 30,
    reorderLevel: 10,
    reorderLevelUoMFactor: 1,
    dispensingUnitName: 'Tablet',
    ...overrides,
  } as StockInventoryRow;
}

const inventoryRow: StockItemInventory = {
  stockItemUuid: 'stock-item',
  stockBatchUuid: 'stock-batch',
  partyUuid: 'party',
  partyName: 'Main Pharmacy',
  batchNumber: 'B1',
  quantity: 5,
  quantityUoM: 'Tablet',
  quantityFactor: '1',
  expiration: new Date('2026-01-01T00:00:00.000Z'),
};

describe('buildStockInventoryRow', () => {
  it('names a drug item from the drug name', () => {
    const row = buildStockInventoryRow(makeStockItem({ drugName: 'Paracetamol' }), inventoryRow);

    expect(row.itemName).toBe('Paracetamol');
  });

  it('names a non-drug item from the concept name', () => {
    const row = buildStockInventoryRow(makeStockItem({ drugName: null, conceptName: 'Surgical gloves' }), inventoryRow);

    expect(row.itemName).toBe('Surgical gloves');
  });
});

describe('getStockLevels', () => {
  it('counts only non-expired inventory and applies unit factors to the reorder level', () => {
    const stockItems = [
      makeStockItem({ uuid: 'a', reorderLevel: 1, reorderLevelUoMFactor: 10 }),
      makeStockItem({ uuid: 'b', reorderLevel: 10 }),
      makeStockItem({ uuid: 'c', reorderLevel: 5 }),
      makeStockItem({ uuid: 'd', reorderLevel: 1 }),
    ];
    const inventoryRows = [
      makeInventoryRow({ stockItemUuid: 'a', quantity: 4 }),
      makeInventoryRow({ stockItemUuid: 'a', quantity: 100, expiration: new Date('2025-12-01T00:00:00.000Z') }),
      makeInventoryRow({ stockItemUuid: 'b', quantity: 10 }),
      makeInventoryRow({ stockItemUuid: 'd', quantity: 3, expiration: new Date('2025-12-01T00:00:00.000Z') }),
    ];

    const { outOfStock, understocked } = getStockLevels(stockItems, inventoryRows, now);

    expect(outOfStock.map((item) => item.uuid)).toEqual(['c', 'd']);
    expect(understocked.map((item) => item.uuid)).toEqual(['a']);
  });

  it('does not mark an item understocked when it has no reorder level', () => {
    const stockItems = [makeStockItem({ uuid: 'a', reorderLevel: null, reorderLevelUoMFactor: null })];
    const inventoryRows = [makeInventoryRow({ stockItemUuid: 'a', quantity: 1 })];

    const { outOfStock, understocked } = getStockLevels(stockItems, inventoryRows, now);

    expect(outOfStock).toHaveLength(0);
    expect(understocked).toHaveLength(0);
  });
});

describe('expiry helpers', () => {
  it('includes stock inside the expiry notice period', () => {
    expect(
      isExpiringStock(makeInventoryRow({ quantity: 5, expiration: new Date('2026-01-15T00:00:00.000Z') }), now),
    ).toBe(true);
  });

  it('excludes already-expired stock', () => {
    expect(
      isExpiringStock(makeInventoryRow({ quantity: 5, expiration: new Date('2025-12-20T00:00:00.000Z') }), now),
    ).toBe(false);
  });

  it('excludes zero-quantity, non-expiring, and stock outside the expiry notice period', () => {
    expect(
      isExpiringStock(makeInventoryRow({ quantity: 0, expiration: new Date('2026-01-15T00:00:00.000Z') }), now),
    ).toBe(false);
    expect(isExpiringStock(makeInventoryRow({ hasExpiration: false }), now)).toBe(false);
    expect(
      isExpiringStock(makeInventoryRow({ quantity: 5, expiration: new Date('2026-03-01T00:00:00.000Z') }), now),
    ).toBe(false);
  });

  it('limits the six-month count to 180 days', () => {
    expect(
      isExpiringWithinSixMonths(
        makeInventoryRow({ quantity: 5, expiration: new Date('2026-06-30T00:00:00.000Z') }),
        now,
      ),
    ).toBe(true);
    expect(
      isExpiringWithinSixMonths(
        makeInventoryRow({ quantity: 5, expiration: new Date('2026-07-01T00:00:00.000Z') }),
        now,
      ),
    ).toBe(false);
  });

  it('counts stock expiring within six months regardless of the expiry notice', () => {
    expect(
      isExpiringWithinSixMonths(
        makeInventoryRow({ quantity: 5, expiryNotice: 30, expiration: new Date('2026-03-01T00:00:00.000Z') }),
        now,
      ),
    ).toBe(true);
  });

  it('excludes already-expired stock from the six-month count', () => {
    expect(
      isExpiringWithinSixMonths(
        makeInventoryRow({ quantity: 5, expiration: new Date('2025-12-20T00:00:00.000Z') }),
        now,
      ),
    ).toBe(false);
  });
});

describe('getDisposalReasonCategory', () => {
  it.each([
    ['Medication expired', 'expired'],
    ['Drug not available due to expired medication', 'expired'],
    ['Medication spillage', 'poorQuality'],
    ['Poor Quality', 'poorQuality'],
    ['Miscellaneous', null],
    [null, null],
  ])('categorizes %s as %s', (reasonName, category) => {
    expect(getDisposalReasonCategory(reasonName)).toBe(category);
  });
});
