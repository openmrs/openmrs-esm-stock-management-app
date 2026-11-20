import React, { useCallback, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { ComboBox, SelectSkeleton } from '@carbon/react';
import { type StockBatchWithUoM } from '../../../core/api/types/stockItem/StockBatchDTO';
import { APP_STOCKMANAGEMENT_STOCKITEMS, formatForDatePicker } from '../../../constants';
import { useStockItemBatchInformationHook } from '../../../stock-items/add-stock-item/batch-information/batch-information.resource';
import { useStockManagementSession } from '../../../stock-lookups/stock-lookups.resource';
import { useStockItemBatchNumbers } from '../hooks/useStockItemBatchNumbers';

interface BatchNoSelectorProps {
  stockItemUuid: string;
  /** The party the stock is drawn from. Only batches with stock there are listed. */
  partyUuid?: string;
  /** Also list batches with no stock at the party, for operations that correct a recorded balance. */
  includeEmptyBatches?: boolean;
  initialValue?: string;
  onValueChange?: (value: string) => void;
  error?: string;
}

const BatchNoSelector: React.FC<BatchNoSelectorProps> = ({
  stockItemUuid,
  partyUuid,
  includeEmptyBatches = false,
  error,
  initialValue,
  onValueChange,
}) => {
  // Inventory leaves out expired batches, so an expired batch would show here with no stock at all.
  const {
    isLoading,
    stockItemBatchNos,
    error: batchesError,
  } = useStockItemBatchNumbers(stockItemUuid, includeEmptyBatches);
  const { t } = useTranslation();
  const {
    items,
    setStockItemUuid,
    setPartyUuid,
    isLoading: isLoadingBatchinfo,
    error: inventoryError,
  } = useStockItemBatchInformationHook({ partyUuid });

  useEffect(() => {
    setStockItemUuid(stockItemUuid);
  }, [stockItemUuid, setStockItemUuid]);

  useEffect(() => {
    setPartyUuid(partyUuid);
  }, [partyUuid, setPartyUuid]);

  // Inventory leaves out stock the user can't see, so only call a batch empty where they can see the stock.
  const { privilegeScopes } = useStockManagementSession();
  const canSeeStock = privilegeScopes?.some(
    (scope) => scope.partyUuid === partyUuid && scope.privilege === APP_STOCKMANAGEMENT_STOCKITEMS,
  );

  const stockItemBatchesInfo = useMemo(() => {
    // Without the inventory every quantity is unknown, so list no batches rather than show them as empty.
    if (!stockItemBatchNos || inventoryError) return [];

    return stockItemBatchNos.map((item) => {
      const matchingBatch = items?.find((batch) => batch.stockBatchUuid === item.uuid);

      if (matchingBatch) {
        return {
          ...item,
          ...matchingBatch,
          quantity: String(matchingBatch.quantity),
        } as StockBatchWithUoM;
      }

      return (includeEmptyBatches && canSeeStock ? { ...item, quantity: '0' } : item) as StockBatchWithUoM;
    });
  }, [stockItemBatchNos, items, includeEmptyBatches, inventoryError, canSeeStock]);

  const filteredBatches = useMemo(() => {
    if (!stockItemBatchesInfo) return [];
    if (includeEmptyBatches) return stockItemBatchesInfo;

    return stockItemBatchesInfo.filter((batch) => {
      const quantity = typeof batch.quantity === 'string' ? parseFloat(batch.quantity) : batch.quantity;

      return !isNaN(quantity) && quantity > 0;
    });
  }, [stockItemBatchesInfo, includeEmptyBatches]);

  const initialSelectedItem = useMemo(
    () => filteredBatches.find((batch) => batch.uuid === initialValue) ?? null,
    [filteredBatches, initialValue],
  );

  const formatQuantityDisplay = useCallback(
    (batch: StockBatchWithUoM): string => {
      if (batch.quantity === undefined) return t('unknown', 'Unknown');

      const quantity = typeof batch.quantity === 'string' ? parseFloat(batch.quantity) : batch.quantity;

      if (isNaN(quantity)) return t('unknown', 'Unknown');

      const baseQuantity = quantity.toString();

      if (!batch.quantityUoM) return baseQuantity;

      const withUnit = `${baseQuantity} ${batch.quantityUoM}`;

      if (!batch.quantityFactor) return withUnit;

      const factor = parseFloat(batch.quantityFactor);
      return !isNaN(factor) && factor > 1 ? `${withUnit} (${factor} units each)` : withUnit;
    },
    [t],
  );

  const itemToString = useCallback(
    (batch: StockBatchWithUoM | null): string => {
      if (!batch?.batchNo) return '';

      const quantityDisplay = formatQuantityDisplay(batch);
      const expiryDate = batch.expiration ? formatForDatePicker(batch.expiration) : t('noExpiry', 'No expiry');

      return `${batch.batchNo} | Qty: ${quantityDisplay} | Expiry: ${expiryDate}`;
    },
    [formatQuantityDisplay, t],
  );

  const handleChange = useCallback(
    (data: { selectedItem?: StockBatchWithUoM | null }) => {
      onValueChange?.(data.selectedItem?.uuid ?? '');
    },
    [onValueChange],
  );

  if (isLoading || isLoadingBatchinfo) {
    return <SelectSkeleton role="progressbar" />;
  }

  return (
    <ComboBox
      id="stockBatchUuid"
      invalid={!!error || !!batchesError || !!inventoryError}
      invalidText={
        error ||
        (batchesError
          ? t('batchesLoadError', "Couldn't load this item's batches")
          : t('batchQuantitiesLoadError', "Couldn't load the stock held at this location"))
      }
      items={filteredBatches}
      itemToString={itemToString}
      name="stockBatchUuid"
      onChange={handleChange}
      placeholder={t('filterPlaceholder', 'Filter...')}
      selectedItem={initialSelectedItem}
      style={{ flexGrow: 1 }}
      titleText={t('batchNo', 'Batch number')}
    />
  );
};

export default BatchNoSelector;
