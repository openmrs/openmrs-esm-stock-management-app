import { openmrsFetch, restBaseUrl, type FetchResponse } from '@openmrs/esm-framework';
import { describe, expect, it, vi } from 'vitest';
import { deleteStockItemPackagingUnit, updateStockItem, fetchAllStockItemTransactions } from './stock-items.resource';
import { type StockItemFormData } from './validationSchema';

describe('deleteStockItemPackagingUnit', () => {
  it('sends the void reason as a query parameter', () => {
    deleteStockItemPackagingUnit('packaging-uuid', 'No longer used');

    expect(openmrsFetch).toHaveBeenCalledWith(
      `${restBaseUrl}/stockmanagement/stockitempackaginguom/packaging-uuid?reason=No%20longer%20used`,
      expect.objectContaining({ method: 'DELETE' }),
    );
  });
});

describe('updateStockItem', () => {
  // An item as it is loaded for editing, with every packaging unit assigned
  const loadedItem = {
    uuid: 'item-uuid',
    isDrug: true,
    drugUuid: 'drug-uuid',
    drugName: 'Advil 200mg',
    conceptUuid: 'concept-uuid',
    conceptName: 'Ibuprofen',
    commonName: 'IBUPROFEN',
    acronym: 'IBU',
    hasExpiration: true,
    expiryNotice: 180,
    preferredVendorUuid: 'vendor-uuid',
    preferredVendorName: 'National Medical Stores',
    purchasePrice: 1000,
    purchasePriceUoMUuid: 'box-uuid',
    purchasePriceUoMName: 'Box',
    categoryUuid: null,
    categoryName: null,
    dispensingUnitUuid: 'tablet-concept-uuid',
    dispensingUnitName: 'Tablet',
    dispensingUnitPackagingUoMUuid: 'box-uuid',
    dispensingUnitPackagingUoMName: 'Box',
    defaultStockOperationsUoMUuid: 'box-uuid',
    defaultStockOperationsUoMName: 'Box',
    reorderLevel: 10,
    reorderLevelUoMUuid: 'box-uuid',
    reorderLevelUoMName: 'Box',
    dateCreated: new Date('2026-10-01'),
    creatorGivenName: 'Super',
    creatorFamilyName: 'User',
    voided: false,
  } as StockItemFormData;

  it('sends only the properties the backend accepts on update', () => {
    updateStockItem('item-uuid', loadedItem);

    const [url, init] = vi.mocked(openmrsFetch).mock.lastCall;
    expect(url).toContain('/stockmanagement/stockitem/item-uuid');
    expect(init.body).toEqual({
      hasExpiration: true,
      preferredVendorUuid: 'vendor-uuid',
      purchasePrice: 1000,
      purchasePriceUoMUuid: 'box-uuid',
      dispensingUnitUuid: 'tablet-concept-uuid',
      dispensingUnitPackagingUoMUuid: 'box-uuid',
      defaultStockOperationsUoMUuid: 'box-uuid',
      categoryUuid: null,
      commonName: 'IBUPROFEN',
      acronym: 'IBU',
      reorderLevel: 10,
      reorderLevelUoMUuid: 'box-uuid',
      expiryNotice: 180,
    });
  });

  it('keeps null values so a cleared field is saved as cleared', () => {
    updateStockItem('item-uuid', { ...loadedItem, reorderLevel: null, reorderLevelUoMUuid: null });

    expect(vi.mocked(openmrsFetch).mock.lastCall[1].body).toMatchObject({
      reorderLevel: null,
      reorderLevelUoMUuid: null,
    });
  });

  it('does not change the form values it is given', () => {
    const item = { ...loadedItem };

    updateStockItem('item-uuid', item);

    expect(item).toEqual(loadedItem);
  });
});

describe('fetchAllStockItemTransactions', () => {
  const transactions = (count: number, from = 0) =>
    Array.from({ length: count }, (_, index) => ({ uuid: `transaction-${from + index}` }));

  it('requests 100-row pages by page number until it has every transaction', async () => {
    vi.mocked(openmrsFetch)
      .mockResolvedValueOnce({ data: { results: transactions(100), totalCount: 130 } } as FetchResponse)
      .mockResolvedValueOnce({ data: { results: transactions(30, 100), totalCount: 130 } } as FetchResponse);

    const result = await fetchAllStockItemTransactions({ stockItemUuid: 'item-uuid', locationUuid: 'location-uuid' });

    expect(result).toHaveLength(130);
    expect(result.at(-1)).toEqual({ uuid: 'transaction-129' });
    expect(vi.mocked(openmrsFetch)).toHaveBeenCalledTimes(2);
    const secondUrl = vi.mocked(openmrsFetch).mock.calls[1][0];
    expect(secondUrl).toContain('stockItemUuid=item-uuid');
    expect(secondUrl).toContain('locationUuid=location-uuid');
    expect(secondUrl).toContain('startIndex=1');
    expect(secondUrl).toContain('limit=100');
  });

  it('stops after one request when everything fits on the first page', async () => {
    vi.mocked(openmrsFetch).mockResolvedValueOnce({
      data: { results: transactions(3), totalCount: 3 },
    } as FetchResponse);

    const result = await fetchAllStockItemTransactions({ stockItemUuid: 'item-uuid' });

    expect(result).toHaveLength(3);
    expect(vi.mocked(openmrsFetch)).toHaveBeenCalledTimes(1);
  });
});
