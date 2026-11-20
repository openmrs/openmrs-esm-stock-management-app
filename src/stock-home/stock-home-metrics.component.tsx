import React from 'react';
import { useTranslation } from 'react-i18next';
import { ErrorState, useConfig } from '@openmrs/esm-framework';
import { ResourceRepresentation } from '../core/api/api';
import { type ConfigObject } from '../config-schema';
import { useDisposalList } from './useDisposalList';
import { useStockInventory } from './stock-home-inventory-expiry.resource';
import { useStockInventoryItems } from './stock-home-inventory-items.resource';
import MetricsCard from '../core/components/card/metrics-card-component';
import {
  getDisposalReasonCategory,
  getStockLevels,
  isExpiringStock,
  isExpiringWithinSixMonths,
} from './stock-home.utils';
import styles from './stock-home.scss';

const StockManagementMetrics: React.FC = () => {
  const { t } = useTranslation();
  const config = useConfig<ConfigObject>();
  const { items: inventoryItems, error: inventoryError } = useStockInventory();
  const { items: stockItems, error: stockItemsError } = useStockInventoryItems();
  const { items: disposedItems, error: disposedError } = useDisposalList({
    v: ResourceRepresentation.Full,
    totalCount: true,
  });
  const now = new Date();
  const expiringItems = inventoryItems.filter((item) => isExpiringStock(item, now));
  const sixMonthsExpiryStocks = inventoryItems.filter((item) => isExpiringWithinSixMonths(item, now));
  const { outOfStock, understocked } = getStockLevels(stockItems, inventoryItems, now);
  const expiredItems = disposedItems.filter((item) => getDisposalReasonCategory(item, config) === 'expired');
  const poorQualityItems = disposedItems.filter((item) => getDisposalReasonCategory(item, config) === 'poorQuality');
  const error = inventoryError || stockItemsError || disposedError;

  if (error) {
    return <ErrorState headerTitle={t('errorStockMetric', 'Error fetching stock metrics')} error={error} />;
  }

  return (
    <div className={styles.cardContainer}>
      <MetricsCard
        count={{
          expiry6months: sixMonthsExpiryStocks,
        }}
        headerLabel={t('expiringStock', 'Expiring stock')}
        label={t('expiringStock', 'Expiring stock')}
        value={expiringItems.length}
      />
      <MetricsCard
        label={t('outOfStock', 'Out of stock')}
        headerLabel={t('outOfStock', 'Out of stock')}
        outOfStockCount={{
          itemsBelowMin: understocked,
        }}
        value={outOfStock.length}
      />
      <MetricsCard
        disposedCount={{
          expired: expiredItems,
          poorQuality: poorQualityItems,
        }}
        headerLabel={t('disposedStock', 'Disposed stock')}
        label={t('disposedStock', 'Disposed stock')}
        value={disposedItems.length}
      />
    </div>
  );
};
export default StockManagementMetrics;
