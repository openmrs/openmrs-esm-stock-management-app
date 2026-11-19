import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { mockWorkspace2Props } from '@mocks';

vi.mock('./stock-rules.resource', () => ({ createOrUpdateStockRule: vi.fn() }));
vi.mock('../../stock-items.resource', () => ({
  useStockItemPackagingUOMs: () => ({ items: { results: [] } }),
}));
vi.mock('../../../stock-lookups/stock-lookups.resource', () => ({
  useRoles: () => ({ items: { results: [] } }),
  useStockTagLocations: () => ({ stockLocations: [{ id: 'location-uuid', name: 'Main pharmacy' }] }),
}));
vi.mock('../../../utils', () => ({ useHandleMutate: () => vi.fn() }));

import StockRulesAddOrUpdate from './add-stock-rules.component';

describe('StockRulesAddOrUpdate', () => {
  it('disables location changes while editing a stock rule', () => {
    render(
      <StockRulesAddOrUpdate
        {...mockWorkspace2Props({
          model: {
            uuid: 'rule-uuid',
            stockItemUuid: 'item-uuid',
            name: 'Low stock alert',
            description: '',
            locationUuid: 'location-uuid',
            locationName: 'Main pharmacy',
            enabled: true,
            stockItemPackagingUOMUuid: 'packaging-uom-uuid',
            packagingUomName: 'Box',
            lastEvaluation: new Date('2025-01-01T00:00:00Z'),
            nextEvaluation: new Date('2025-01-02T00:00:00Z'),
            lastActionDate: new Date('2025-01-01T00:00:00Z'),
            permission: {
              canView: true,
              canEdit: true,
              canApprove: false,
              canReceiveItems: false,
              canDisplayReceivedItems: false,
              isRequisitionAndCanIssueStock: false,
              canUpdateBatchInformation: false,
            },
            enableDescendants: false,
          },
        })}
      />,
    );

    expect(screen.getByRole('combobox', { name: /location/i })).toBeDisabled();
  });
});
