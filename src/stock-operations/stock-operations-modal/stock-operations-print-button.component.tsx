import React, { useState } from 'react';

import { Button, InlineLoading } from '@carbon/react';
import { Printer } from '@carbon/react/icons';
import { useTranslation } from 'react-i18next';
import { type StockItemInventory } from '../../core/api/types/stockItem/StockItemInventory';
import { type StockOperationDTO } from '../../core/api/types/stockOperation/StockOperationDTO';
import { type StockOperationItemCost } from '../../core/api/types/stockOperation/StockOperationItemCost';

import { showSnackbar, useConfig } from '@openmrs/esm-framework';
import { type ConfigObject } from '../../config-schema';
import { extractErrorMessagesFromResponse } from '../../constants';
import { ResourceRepresentation } from '../../core/api/api';
import { OperationType } from '../../core/api/types/stockOperation/StockOperationType';
import { type StockItemInventoryFilter } from '../../stock-items/stock-items.resource';
import {
  getStockItemInventory,
  getStockOperation,
  getStockOperationItemsCost,
  useStockOperationAndItems,
} from '../stock-operations.resource';
import { PrintGoodsReceivedNoteStockOperation } from '../stock-print-reports/GoodsReceivedNote';
import { PrintRequisitionStockOperation } from '../stock-print-reports/RequisitionDocument';
import { BuildStockOperationData } from '../stock-print-reports/StockOperationReport';
import { PrintTransferOutStockOperation } from '../stock-print-reports/StockTransferDocument';

interface StockOperationCancelButtonProps {
  operation: StockOperationDTO;
}

const StockOperationPrintButton: React.FC<StockOperationCancelButtonProps> = ({ operation: _operation }) => {
  const { t } = useTranslation();
  const { printBalanceOnHand, printItemCost } = useConfig<ConfigObject>();
  const { isLoading, items: operation, error } = useStockOperationAndItems(_operation.uuid);
  const [loading, setLoading] = useState(false);
  const onPrintStockOperation = async () => {
    setLoading(true);
    try {
      let parentOperation: StockOperationDTO | null | undefined;
      let itemsCost: StockOperationItemCost[] | null | undefined = null;
      let itemInventory: StockItemInventory[] | null | undefined = null;

      if (operation.requisitionStockOperationUuid) {
        // get related requisition stock operation
        const response = await getStockOperation(operation.requisitionStockOperationUuid);
        parentOperation = response.data;
        if (!parentOperation) {
          return;
        }
      }

      if (printItemCost) {
        const res = await getStockOperationItemsCost(operation.uuid);
        itemsCost = res.data?.results;
      }
      if (printBalanceOnHand) {
        const inventoryFilter: StockItemInventoryFilter = {};
        if (operation?.uuid) {
          inventoryFilter.locationUuid = operation.atLocationUuid;
          inventoryFilter.stockOperationUuid = operation.uuid;
        } else {
          inventoryFilter.locationUuid = operation.atLocationUuid;
          inventoryFilter.stockOperationUuid = operation.uuid;
        }
        inventoryFilter.v = ResourceRepresentation.Default;
        inventoryFilter.groupBy = 'LocationStockItem';
        inventoryFilter.includeStockItemName = 'true';

        inventoryFilter.date = parentOperation?.dateCreated
          ? new Date(parentOperation.dateCreated).toISOString()
          : operation?.dateCreated
          ? new Date(operation.dateCreated).toISOString()
          : null;
        // get stock item inventory
        const res = await getStockItemInventory(inventoryFilter);
        itemInventory = res.data?.results;
      }
      const data = await BuildStockOperationData(
        operation,
        operation.stockOperationItems ?? _operation?.stockOperationItems ?? [],
        parentOperation,
        itemsCost,
        itemInventory,
      );
      if (data) {
        if (operation?.operationType === OperationType.RECEIPT_OPERATION_TYPE) {
          await PrintGoodsReceivedNoteStockOperation(data);
        } else if (operation?.operationType === OperationType.TRANSFER_OUT_OPERATION_TYPE) {
          await PrintTransferOutStockOperation(data);
        } else {
          await PrintRequisitionStockOperation(data);
        }
      } else {
        console.warn(data);
      }
    } catch (e: any) {
      console.error(e);
      showSnackbar({
        kind: 'error',
        title: t('errorPrintingStockOperation', 'Error printing stock operation'),
        subtitle: extractErrorMessagesFromResponse(e).join(', '),
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      onClick={onPrintStockOperation}
      kind="tertiary"
      disabled={isLoading || loading}
      renderIcon={(props) => <Printer size={16} {...props} />}
    >
      {loading || isLoading ? (
        <InlineLoading description={t('loadingPlaceholder', 'Loading...')} iconDescription={t('loading', 'Loading')} />
      ) : (
        t('print', 'Print')
      )}
    </Button>
  );
};

export default StockOperationPrintButton;
