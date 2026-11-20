import { renderHook } from '@testing-library/react';
import useSWR from 'swr';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useStockInventoryItems } from './stock-home-inventory-items.resource';
import { useStockInventory } from './stock-home-inventory-expiry.resource';

vi.mock('swr', () => ({ default: vi.fn() }));
vi.mock('./stock-home-inventory-items.resource', () => ({ useStockInventoryItems: vi.fn() }));

const mockedUseSWR = vi.mocked(useSWR);
const mockedUseStockInventoryItems = vi.mocked(useStockInventoryItems);

function makeStockItem(overrides: Record<string, unknown> = {}) {
  return {
    uuid: 'item-1',
    drugName: 'Paracetamol',
    hasExpiration: true,
    expiryNotice: 30,
    reorderLevel: 10,
    reorderLevelUoMFactor: 1,
    dispensingUnitName: 'Tablet',
    ...overrides,
  };
}

const rawInventory = {
  stockItemUuid: 'item-1',
  stockBatchUuid: 'batch-1',
  batchNumber: 'B1',
  partyUuid: 'party',
  partyName: 'Main Pharmacy',
  quantity: 5,
  quantityUoM: 'Tablet',
  quantityFactor: '1',
  expiration: new Date('2026-06-01T00:00:00.000Z'),
};

describe('useStockInventory', () => {
  beforeEach(() => {
    mockedUseSWR.mockReturnValue({
      data: [rawInventory],
      isLoading: false,
      error: undefined,
    } as never);
    mockedUseStockInventoryItems.mockReturnValue({
      items: [makeStockItem()],
      isLoading: false,
      error: undefined,
    } as never);
  });

  it('rebuilds copied stock item fields when stock item details change', () => {
    const { result, rerender } = renderHook(() => useStockInventory());

    expect(result.current.items[0].expiryNotice).toBe(30);

    mockedUseStockInventoryItems.mockReturnValue({
      items: [makeStockItem({ expiryNotice: 90 })],
      isLoading: false,
      error: undefined,
    } as never);

    rerender();

    expect(result.current.items[0].expiryNotice).toBe(90);
  });
});
