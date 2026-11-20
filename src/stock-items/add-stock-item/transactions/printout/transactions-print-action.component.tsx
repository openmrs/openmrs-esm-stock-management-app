import React, { useMemo } from 'react';
import { ComboButton, MenuItem } from '@carbon/react';
import { Printer } from '@carbon/react/icons';
import { useTranslation } from 'react-i18next';
import { showModal, useConfig } from '@openmrs/esm-framework';
import { type StockItemInventoryFilter, useStockItem, useStockItemTransactions } from '../../../stock-items.resource';
import { ResourceRepresentation } from '../../../../core/api/api';
import { type ConfigObject } from '../../../../config-schema';

type Props = {
  itemUuid: string;
  columns: any;
  data: any;
};

const TransactionsPrintAction: React.FC<Props> = ({ columns, data, itemUuid }) => {
  const { t } = useTranslation();

  const { enablePrintButton } = useConfig<ConfigObject>();

  const stockCardItemFilter = useMemo<StockItemInventoryFilter>(
    () => ({
      startIndex: 0,
      totalCount: true,
      v: ResourceRepresentation.Full,
      isPatientTransaction: 'true',
      stockItemUuid: itemUuid,
    }),
    [itemUuid],
  );

  const { item: stockItem, isLoading: isStockItemLoading } = useStockItem(itemUuid);
  const { items: stockCardData, isLoading: isStockCardLoading } = useStockItemTransactions(stockCardItemFilter);

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
      data: stockCardData?.results ?? [],
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
            disabled={isStockItemLoading || isStockCardLoading}
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
