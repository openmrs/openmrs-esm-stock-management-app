import { describe, expect, it, vi } from 'vitest';
import { openmrsFetch } from '@openmrs/esm-framework';
import { type StockItemFormData } from './validationSchema';
import { updateStockItem } from './stock-items.resource';

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
