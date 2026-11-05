import { beforeEach, describe, expect, it, vi } from 'vitest';
import { openmrsFetch } from '@openmrs/esm-framework';
import { type StockRule } from '../../../core/api/types/stockItem/StockRule';
import { createOrUpdateStockRule } from './stock-rules.resource';

vi.mock('@openmrs/esm-framework', () => ({
  openmrsFetch: vi.fn(),
  restBaseUrl: '/ws/rest/v1',
}));

describe('createOrUpdateStockRule', () => {
  beforeEach(() => {
    vi.mocked(openmrsFetch).mockResolvedValue({} as any);
  });

  it('sends only updatable properties when editing a stock rule', async () => {
    const rule = {
      uuid: 'rule-uuid',
      stockItemUuid: 'item-uuid',
      name: 'Updated rule',
      description: 'Description',
      locationUuid: 'location-uuid',
      locationName: 'Location',
      quantity: 5,
      stockItemPackagingUOMUuid: 'packaging-uom-uuid',
      packagingUomName: 'Box',
      enabled: true,
      evaluationFrequency: 60,
      lastEvaluation: new Date('2025-01-01T00:00:00Z'),
      nextEvaluation: new Date('2025-01-02T00:00:00Z'),
      lastActionDate: new Date('2025-01-01T00:00:00Z'),
      actionFrequency: 120,
      alertRole: 'Pharmacist',
      mailRole: 'Manager',
      permission: { canView: true, canEdit: true },
      enableDescendants: false,
      dateCreated: new Date('2024-01-01T00:00:00Z'),
      nextActionDate: new Date('2025-01-03T00:00:00Z'),
    } as StockRule;

    await createOrUpdateStockRule(rule);

    expect(openmrsFetch).toHaveBeenCalledWith(
      '/ws/rest/v1/stockmanagement/stockrule/rule-uuid',
      expect.objectContaining({
        method: 'POST',
        body: {
          name: 'Updated rule',
          description: 'Description',
          quantity: 5,
          stockItemPackagingUOMUuid: 'packaging-uom-uuid',
          enabled: true,
          evaluationFrequency: 60,
          actionFrequency: 120,
          alertRole: 'Pharmacist',
          mailRole: 'Manager',
          enableDescendants: false,
        },
      }),
    );
  });
});
