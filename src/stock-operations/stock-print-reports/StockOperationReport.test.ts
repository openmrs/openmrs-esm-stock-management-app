import { describe, expect, it, vi } from 'vitest';
import { getConfig } from '@openmrs/esm-framework';
import { type StockOperationDTO } from '../../core/api/types/stockOperation/StockOperationDTO';
import { BuildStockOperationData } from './StockOperationReport';

describe('BuildStockOperationData', () => {
  it('uses the configured facility name as the organization name', async () => {
    vi.mocked(getConfig).mockResolvedValue({ facilityName: 'Mosoriot Sub-County Hospital' });

    const data = await BuildStockOperationData({ operationTypeName: 'Requisition' } as StockOperationDTO, []);

    expect(getConfig).toHaveBeenCalledWith('@openmrs/esm-stock-management-app');
    expect(data?.organizationName).toBe('Mosoriot Sub-County Hospital');
  });
});
