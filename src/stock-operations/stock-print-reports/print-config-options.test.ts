import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getConfig } from '@openmrs/esm-framework';
import { getStockOperationItemsCost } from '../stock-operations.resource';
import { FormatRequisitionDocument } from './RequisitionDocument';
import { FormatTransferDocument } from './StockTransferDocument';
import { type StockOperationPrintData } from './StockOperationReport';

const data: StockOperationPrintData = {
  items: [
    {
      itemCode: 'PCM',
      balanceOnHand: 750,
      balanceOnHandUoM: 'Tablet',
      unitCost: 5,
      unitCostUoM: 'Tablet',
      totalCost: 1000,
    },
  ],
};

const useConfigValues = (config: Record<string, boolean>) => vi.mocked(getConfig).mockResolvedValue(config);

describe('printout config options', () => {
  beforeEach(() => {
    useConfigValues({ printItemCost: false, printBalanceOnHand: false });
  });

  describe('requisition document', () => {
    it('leaves out costs and balance on hand when the options are off', async () => {
      const html = await FormatRequisitionDocument(data);

      expect(html).not.toContain('750');
      expect(html).not.toContain('5/Tablet');
      expect(html).not.toContain('1,000');
    });

    it('prints costs only when printItemCost is on', async () => {
      useConfigValues({ printItemCost: true, printBalanceOnHand: false });

      const html = await FormatRequisitionDocument(data);

      expect(html).toContain('5/Tablet');
      expect(html).toContain('1,000');
      expect(html).not.toContain('750');
    });

    it('prints balance on hand only when printBalanceOnHand is on', async () => {
      useConfigValues({ printItemCost: false, printBalanceOnHand: true });

      const html = await FormatRequisitionDocument(data);

      expect(html).toContain('750  Tablet');
      expect(html).not.toContain('5/Tablet');
    });

    it('prints a balance on hand of zero', async () => {
      useConfigValues({ printItemCost: false, printBalanceOnHand: true });

      const html = await FormatRequisitionDocument({ items: [{ balanceOnHand: 0, balanceOnHandUoM: 'Tablet' }] });

      expect(html).toContain('0  Tablet');
    });
  });

  describe('transfer document', () => {
    it('leaves out costs when printItemCost is off', async () => {
      const html = await FormatTransferDocument(data);

      expect(html).not.toContain('5/Tablet');
      expect(html).not.toContain('1,000');
    });

    it('prints costs when printItemCost is on', async () => {
      useConfigValues({ printItemCost: true });

      const html = await FormatTransferDocument(data);

      expect(html).toContain('5/Tablet');
      expect(html).toContain('1,000');
    });
  });
});

describe('getStockOperationItemsCost', () => {
  it("requests the costs by the operation's UUID", async () => {
    const { openmrsFetch } = await import('@openmrs/esm-framework');

    getStockOperationItemsCost('operation-uuid');

    expect(openmrsFetch).toHaveBeenCalledWith(
      expect.stringContaining('stockoperationitemcost?v=default&stockOperationUuid=operation-uuid'),
      expect.anything(),
    );
  });
});
