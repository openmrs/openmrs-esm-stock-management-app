import React from 'react';
import { useTranslation } from 'react-i18next';
import { ActionableNotification, Button } from '@carbon/react';
import { Delivery } from '@carbon/react/icons';
import { restBaseUrl, showModal } from '@openmrs/esm-framework';
import { ResourceRepresentation } from '../core/api/api';
import { useStockReceiving } from './stock-home-receiving.resource';
import styles from './stock-home-detail-card.scss';
import { useHandleMutate } from '../utils';

const StockHomeReceivingCard = () => {
  const { t } = useTranslation();

  const handleMutate = useHandleMutate();
  const { items, isLoading, error } = useStockReceiving({
    v: ResourceRepresentation.Full,
    totalCount: true,
  });

  if (isLoading) {
    return null;
  }

  // Checked before the data, which SWR keeps from an earlier load when a reload fails.
  if (error) {
    return (
      <ActionableNotification
        actionButtonLabel={t('tryAgain', 'Try again')}
        closeOnEscape={false}
        hasFocus={false}
        hideCloseButton
        inline
        kind="error"
        lowContrast
        // The trailing "?" keeps the retry to the operations list
        onActionButtonClick={() => handleMutate(`${restBaseUrl}/stockmanagement/stockoperation?`)}
        role="alert"
        title={t('receivedStockLoadError', "Couldn't load received stock")}
      />
    );
  }

  if (items?.length === 0) {
    return <p className={styles.content}>{t('noReceivedStock', 'No received stock to display')}</p>;
  }

  const launchReceivingStockModal = () => {
    const dispose = showModal('receiving-stock-modal', {
      closeModal: () => dispose(),
      receivingStock: items,
    });
  };

  return (
    <>
      {items?.map((item, index) =>
        item?.stockOperationItems.map((stock) => (
          <div className={styles.card} key={index}>
            <div className={styles.colorLineBlue} />
            <div className={styles.icon}>
              <Delivery size={40} color={'#0F62FE'} />
            </div>
            <div className={styles.cardText}>
              <p>
                {item?.status} · {item?.sourceName} · {item?.destinationName}
              </p>
              <p>
                <strong>{stock?.stockItemName}</strong> {stock?.stockItemPackagingUOMName}, {stock?.quantity}
              </p>
            </div>
          </div>
        )),
      )}
      <Button kind="ghost" onClick={launchReceivingStockModal} size="sm">
        {t('viewAll', 'View All')}
      </Button>
    </>
  );
};

export default StockHomeReceivingCard;
