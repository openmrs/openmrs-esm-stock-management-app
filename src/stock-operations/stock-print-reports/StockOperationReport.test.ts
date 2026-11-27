import { afterEach, describe, expect, it, vi } from 'vitest';
import { getConfig } from '@openmrs/esm-framework';
import { type StockOperationDTO } from '../../core/api/types/stockOperation/StockOperationDTO';
import { FormatGoodsReceivedDocument } from './GoodsReceivedNote';
import { BuildStockOperationData } from './StockOperationReport';
import { FormatTransferDocument } from './StockTransferDocument';

describe('BuildStockOperationData', () => {
  const originalTimeZone = process.env.TZ;

  afterEach(() => {
    if (originalTimeZone === undefined) {
      delete process.env.TZ;
    } else {
      process.env.TZ = originalTimeZone;
    }
  });

  it('uses the configured facility name as the organization name', async () => {
    vi.mocked(getConfig).mockResolvedValue({ facilityName: 'Mosoriot Sub-County Hospital' });

    const data = await BuildStockOperationData({ operationTypeName: 'Requisition' } as StockOperationDTO, []);

    expect(getConfig).toHaveBeenCalledWith('@openmrs/esm-stock-management-app');
    expect(data?.organizationName).toBe('Mosoriot Sub-County Hospital');
  });

  it('preserves batch expiry dates on printed GRN and transfer documents behind the server timezone', async () => {
    process.env.TZ = 'America/New_York';
    vi.mocked(getConfig).mockResolvedValue({
      facilityName: 'Mosoriot Sub-County Hospital',
      printItemCost: false,
      printBalanceOnHand: false,
    });

    const data = await BuildStockOperationData(
      { operationTypeName: 'Receipt', operationNumber: 'OP-1' } as StockOperationDTO,
      [
        {
          stockItemName: 'Paracetamol',
          batchNo: 'BATCH-001',
          expiration: '2027-12-31T00:00:00.000+0000' as unknown as Date,
          quantity: 10,
        },
      ] as StockOperationDTO['stockOperationItems'],
    );

    const grnHtml = await FormatGoodsReceivedDocument(data);
    const transferHtml = await FormatTransferDocument(data);

    expect(grnHtml).toContain('31-Dec-2027');
    expect(transferHtml).toContain('31-Dec-2027');
  });
});
