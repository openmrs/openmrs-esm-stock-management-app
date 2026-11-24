import React, { useMemo, useState } from 'react';
import { MenuButton, MenuItem } from '@carbon/react';
import { Printer } from '@carbon/react/icons';
import { useTranslation } from 'react-i18next';
import { showModal, showSnackbar, useConfig } from '@openmrs/esm-framework';
import {
  fetchAllStockItemTransactions,
  type StockItemInventoryFilter,
  useStockItem,
  useStockItemTransactions,
} from '../../../stock-items.resource';
import { ResourceRepresentation } from '../../../../core/api/api';
import { type StockItemTransactionDTO } from '../../../../core/api/types/stockItem/StockItemTransaction';
import { type ConfigObject } from '../../../../config-schema';

type Props = {
  itemUuid: string;
  columns: any;
  data: any;
  locationUuid?: string | null;
  toBinCardRow: (transaction: StockItemTransactionDTO) => Record<string, unknown>;
};

const TransactionsPrintAction: React.FC<Props> = ({ columns, data, itemUuid, locationUuid, toBinCardRow }) => {
  const { t } = useTranslation();
  const [isLoadingPrintout, setIsLoadingPrintout] = useState(false);

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

  // The Transactions table and the Stock Card request hold one page each, so a card loads every page
  // before its preview opens.
  const openPreview = async (modalName: string, previewColumns: unknown, loadRows: () => Promise<Array<unknown>>) => {
    setIsLoadingPrintout(true);
    try {
      const rows = await loadRows();
      const dispose = showModal(modalName, {
        onClose: () => dispose(),
        title: stockItem.drugName || stockItem.conceptName || '',
        columns: previewColumns,
        data: rows,
      });
    } catch (error) {
      showSnackbar({
        kind: 'error',
        title: t('errorLoadingPrintout', 'Error loading the transactions to print'),
        subtitle: error?.message,
      });
    } finally {
      setIsLoadingPrintout(false);
    }
  };

  const handleBincardClick = () =>
    openPreview('transactions-print-bincard-preview-modal', columns, async () => {
      const transactions = await fetchAllStockItemTransactions({
        v: ResourceRepresentation.Default,
        stockItemUuid: itemUuid,
        locationUuid,
      });
      return transactions.map((transaction) => toBinCardRow(transaction));
    });

  const handleStockcardClick = () =>
    openPreview('transactions-print-stockcard-preview-modal', stockCardHeaders, () =>
      fetchAllStockItemTransactions(stockCardItemFilter),
    );

  // Each card is offered only when it has rows to print. The Stock Card stays listed, disabled, while its
  // transactions load so it doesn't appear in the menu afterwards.
  const showStockCard = isStockCardLoading || stockCardData?.results?.length > 0;
  const showBinCard = data?.length > 0;

  if (!enablePrintButton || (!showStockCard && !showBinCard)) {
    return null;
  }

  return (
    <MenuButton disabled={isLoadingPrintout} kind="ghost" label={t('print', 'Print')} menuAlignment="bottom-start">
      {showStockCard && (
        <MenuItem
          label={t('printStockCard', 'Print Stock Card')}
          renderIcon={(props) => <Printer size={24} {...props} />}
          onClick={handleStockcardClick}
          disabled={isStockItemLoading || isStockCardLoading}
        />
      )}
      {showBinCard && (
        <MenuItem
          label={t('printBinCard', 'Print Bin Card')}
          renderIcon={(props) => <Printer size={24} {...props} />}
          onClick={handleBincardClick}
          disabled={isStockItemLoading}
        />
      )}
    </MenuButton>
  );
};

export default TransactionsPrintAction;
