import { InlineLoading } from '@carbon/react';
import { showSnackbar } from '@openmrs/esm-framework';
import React, { useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { ResourceRepresentation } from '../../../core/api/api';
import { type StockItemInventoryFilter, useStockItemInventory } from '../../../stock-items/stock-items.resource';
import styles from './stock-operation-items-form-step.scc.scss';
const StockAvailability: React.FC<{ stockItemUuid: string; sourceUuid?: string | null }> = ({
  stockItemUuid,
  sourceUuid,
}) => {
  const { t } = useTranslation();

  const filter = useMemo<StockItemInventoryFilter>(
    () => ({
      v: ResourceRepresentation.Default,
      stockItemUuid,
      partyUuid: sourceUuid || undefined,
      groupBy: sourceUuid ? 'LocationStockItem' : 'StockItemOnly',
    }),
    [stockItemUuid, sourceUuid],
  );

  const { items, isLoading, error } = useStockItemInventory(filter);

  const row = items?.results?.[0];
  const totalQuantity = Number(row?.quantity) || 0;
  const uom = row?.quantityUoM ?? '';

  useEffect(() => {
    if (error) {
      showSnackbar({
        kind: 'error',
        title: t('stockAvailabilityError', 'Error loading stock availability'),
        subtitle: error?.message,
      });
    }
  }, [error, t]);

  if (isLoading) return <InlineLoading status="active" iconDescription="Loading" />;
  if (error) return <>--</>;

  return (
    <div className={styles.availability}>
      {totalQuantity > 0 ? (
        <span>
          Available: {totalQuantity.toLocaleString()} {uom}
        </span>
      ) : (
        <span className={styles.outOfStock}>Out of Stock</span>
      )}
    </div>
  );
};

export default StockAvailability;
