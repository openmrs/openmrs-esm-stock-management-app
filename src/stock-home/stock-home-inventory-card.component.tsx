import React from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@carbon/react';
import { WarningHex } from '@carbon/react/icons';
import { showModal } from '@openmrs/esm-framework';
import { useStockInventory } from './stock-home-inventory-expiry.resource';
import { daysUntil, isExpiringStock } from './stock-home.utils';
import styles from './stock-home-detail-card.scss';

const StockHomeInventoryCard = () => {
  const { t } = useTranslation();
  const { items, isLoading } = useStockInventory();

  if (isLoading) {
    return null;
  }

  const now = new Date();
  const expiringItems = items
    .filter((item) => isExpiringStock(item, now))
    .sort((a, b) => (daysUntil(a.expiration, now) ?? 0) - (daysUntil(b.expiration, now) ?? 0));

  if (expiringItems.length === 0) {
    return <p className={styles.content}>{t('noInventoryAlerts', 'No inventory alerts to display')}</p>;
  }

  const itemsToDisplay = expiringItems.slice(0, 5);

  const launchExpiredStockModal = () => {
    const dispose = showModal('expired-stock-modal', {
      closeModal: () => dispose(),
      expiredStock: expiringItems,
    });
  };

  return (
    <>
      {itemsToDisplay.map((item, index) => (
        <div className={styles.card} key={`${item.stockItemUuid}-${item.stockBatchUuid}-${index}`}>
          <div className={styles.colorLineRed} />
          <div className={styles.icon}>
            <WarningHex size={40} color={'#DA1E28'} />
          </div>
          <div className={styles.cardText}>
            <p>{t('expiringStock', 'Expiring stock')}</p>
            <p>
              <strong>{item.itemName}</strong> {t('batchNumberLabel', 'Batch number:')} {item.batchNumber}{' '}
              {t('quantityLabel', 'Quantity:')} {item.quantity} {item.quantityUoM || item.dispensingUnitName}
            </p>
          </div>
        </div>
      ))}
      <Button kind="ghost" onClick={launchExpiredStockModal} size="sm">
        {t('viewAll', 'View All')}
      </Button>
    </>
  );
};

export default StockHomeInventoryCard;
