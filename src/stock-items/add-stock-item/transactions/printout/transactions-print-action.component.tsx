import React, { useMemo } from 'react';
import { ComboButton, MenuItem } from '@carbon/react';
import { Printer } from '@carbon/react/icons';
import { useTranslation } from 'react-i18next';
import { useStockItem, useStockItemInventory } from '../../../stock-items.resource';
import { showModal, useConfig } from '@openmrs/esm-framework';
import { type StockItemInventoryFilter, useStockItemTransactions } from '../../../stock-items.resource';
import { ResourceRepresentation } from '../../../../core/api/api';
import { type ConfigObject } from '../../../../config-schema';

type Props = {
  itemUuid: string;
  columns: any;
  data: any;
  filter?: StockItemInventoryFilter;
};

const TransactionsPrintAction: React.FC<Props> = ({ columns, data, itemUuid, filter }) => {
  const { t } = useTranslation();

  const { enablePrintButton } = useConfig<ConfigObject>();

  const stockCardItemFilter = useMemo<StockItemInventoryFilter>(
    () => ({
      startIndex: 0,
      totalCount: true,
      v: ResourceRepresentation.Full,
      isPatientTransaction: 'true',
      stockItemUuid: itemUuid,
      locationUuid: filter?.locationUuid,
    }),
    [filter?.locationUuid, itemUuid],
  );

  const stockItemFilter = useMemo<StockItemInventoryFilter>(
    () => ({
      startIndex: 0,
      v: filter?.v || ResourceRepresentation.Default,
      limit: 10,
      q: filter?.q,
      totalCount: true,
      stockItemUuid: itemUuid,
      locationUuid: filter?.locationUuid,
    }),
    [filter?.v, filter?.q, filter?.locationUuid, itemUuid],
  );

  const { item: stockItem, isLoading: isStockItemLoading } = useStockItem(itemUuid);
  const { items: stockCardData, isLoading: isStockCardLoading } = useStockItemTransactions(stockCardItemFilter);
  const { items: inventoryBalance, isLoading: isInventoryLoading } = useStockItemInventory(stockItemFilter);

  const stockCardWithBalance = useMemo(() => {
    const balance = inventoryBalance?.total ?? '';
    return (
      stockCardData?.results?.map((transaction) => ({
        ...transaction,
        balance: `${balance} ${transaction.packagingUomName ?? ''}`,
      })) ?? []
    );
  }, [stockCardData?.results, inventoryBalance?.total]);

  const stockCardHeaders = useMemo(
    () => [
      {
        key: 'patientId',
        header: 'Patient ID',
      },
      {
        key: 'patientName',
        header: 'Patient Name',
      },
      {
        key: 'patientIdentifier',
        header: 'Patient Identifier',
      },
      {
        key: 'date',
        header: 'Date',
      },
      {
        key: 'location',
        header: 'Location',
      },
      {
        key: 'transaction',
        header: 'Transaction',
      },
      {
        key: 'balance',
        header: 'Balance',
      },
      {
        key: 'totalout',
        header: 'OUT',
      },
      {
        key: 'batch',
        header: 'Batch',
      },
    ],
    [],
  );

  const handleBincardClick = () => {
    const dispose = showModal('transactions-print-bincard-preview-modal', {
      onClose: () => dispose(),
      title: stockItem.drugName || stockItem.conceptName || '',
      columns,
      data,
    });
  };

  const handleStockcardClick = () => {
    const dispose = showModal('transactions-print-stockcard-preview-modal', {
      onClose: () => dispose(),
      title: stockItem.drugName || stockItem.conceptName || '',
      columns: stockCardHeaders,
      data: stockCardWithBalance,
    });
  };

  return (
    <>
      {enablePrintButton && (
        <ComboButton label="Print">
          <MenuItem
            label={t('printStockCard', 'Print Stock Card')}
            renderIcon={(props) => <Printer size={24} {...props} />}
            onClick={handleStockcardClick}
            disabled={isStockItemLoading || isStockCardLoading || isInventoryLoading}
          />
          <MenuItem
            label={t('printBinCard', 'Print Bin Card')}
            renderIcon={(props) => <Printer size={24} {...props} />}
            onClick={handleBincardClick}
            disabled={isStockItemLoading}
          />
        </ComboButton>
      )}
    </>
  );
};

export default TransactionsPrintAction;
