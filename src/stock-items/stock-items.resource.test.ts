import { describe, expect, it, vi } from 'vitest';
import { type FetchResponse, openmrsFetch } from '@openmrs/esm-framework';
import { renderHook } from '@testing-library/react';
import { type StockItemFormData } from './validationSchema';
import {
  createStockItemPackagingUomReference,
  fetchAllStockItemTransactions,
  updateStockItem,
  updateStockItemPackagingUomReference,
  useStockItemPackagingUomReferences,
  voidStockItemPackagingUomReference,
} from './stock-items.resource';

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

describe('stock item packaging UOM reference API', () => {
  const referencePayload = {
    stockItemPackagingUomUuid: 'uom-uuid',
    stockSourceUuid: 'source-uuid',
    referenceCode: 'M221680001EP30T',
    name: 'UNHTS packaging reference',
    description: 'Code for the 30-unit pack',
  };

  it('createStockItemPackagingUomReference posts the create payload to the collection resource', () => {
    createStockItemPackagingUomReference(referencePayload);

    const [url, init] = vi.mocked(openmrsFetch).mock.lastCall;
    expect(url).toBe('/ws/rest/v1/stockmanagement/stockitempackaginguomreference');
    expect(init.method).toBe('POST');
    expect(init.body).toEqual(referencePayload);
  });

  it('updateStockItemPackagingUomReference posts only the updatable properties', () => {
    updateStockItemPackagingUomReference('reference-uuid', {
      referenceCode: 'M221680001EP30T',
      name: 'Renamed',
      description: null,
    });

    const [url, init] = vi.mocked(openmrsFetch).mock.lastCall;
    expect(url).toBe('/ws/rest/v1/stockmanagement/stockitempackaginguomreference/reference-uuid');
    expect(init.method).toBe('POST');
    // the uuid, the stock source and the packaging UOM must never be sent on an update
    expect(init.body).toEqual({
      referenceCode: 'M221680001EP30T',
      name: 'Renamed',
      description: null,
    });
    expect(init.body).not.toHaveProperty('uuid');
    expect(init.body).not.toHaveProperty('stockSourceUuid');
    expect(init.body).not.toHaveProperty('stockItemPackagingUomUuid');
  });

  it('voidStockItemPackagingUomReference DELETEs with the url-encoded reason', () => {
    voidStockItemPackagingUomReference('reference-uuid', 'Superseded by new code & reused');

    const [url, init] = vi.mocked(openmrsFetch).mock.lastCall;
    expect(url).toBe(
      '/ws/rest/v1/stockmanagement/stockitempackaginguomreference/reference-uuid?reason=' +
        encodeURIComponent('Superseded by new code & reused'),
    );
    expect(init.method).toBe('DELETE');
  });
});

describe('useStockItemPackagingUomReferences', () => {
  it('requests the default representation so name, description and voided are present', () => {
    renderHook(() => useStockItemPackagingUomReferences({ stockItemPackagingUomUuid: 'uom-uuid' }));

    const [url] = vi.mocked(openmrsFetch).mock.calls[0];
    // without a v parameter the REST layer serves the ref representation, which omits
    // name, description, stockSourceUuid and voided
    expect(url).toContain('v=default');
    expect(url).toContain('stockItemPackagingUomUuid=uom-uuid');
  });

  it('passes includeAll through when voided references are requested', () => {
    renderHook(() => useStockItemPackagingUomReferences({ stockItemPackagingUomUuid: 'uom-uuid', includeAll: true }));

    const [url] = vi.mocked(openmrsFetch).mock.calls[0];
    expect(url).toContain('includeAll=true');
    expect(url).toContain('v=default');
  });
});
