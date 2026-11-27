import React from 'react';
import { useTranslation } from 'react-i18next';
import { ActionableNotification, Button } from '@carbon/react';
import { ResourceRepresentation } from '../core/api/api';
import { DocumentExport } from '@carbon/react/icons';
import { restBaseUrl, showModal } from '@openmrs/esm-framework';
import { useStockIssuing } from './stock-home-issuing.resource';
import StockOperationStatusTag from '../stock-operations/stock-operation-status-tag/stock-operation-status-tag.component';
import styles from './stock-home-detail-card.scss';
import { useHandleMutate } from '../utils';

const StockHomeIssuingCard = () => {
  const { t } = useTranslation();

  const handleMutate = useHandleMutate();
  const { items, isLoading, error } = useStockIssuing({
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
        title={t('issuedStockLoadError', "Couldn't load issued stock")}
      />
    );
  }

  if (items?.length === 0) {
    return <p className={styles.content}>{t('noIssuedStock', 'No issued stock to display')}</p>;
  }

  const itemsToDisplay = items?.map((item, index) => {
    // Assuming you are using 'stockOperationItems' from each 'item'
    const stockItems = item?.stockOperationItems || [];

    // Assuming you are using some properties from 'stock' in your code
    const formattedStockItems = stockItems.map((stock, stockIndex) => ({
      status: item?.status,
      sourceName: item?.sourceName,
      destinationName: item?.destinationName,
      stockItemName: stock?.stockItemName,
      stockItemPackagingUOMName: stock?.stockItemPackagingUOMName,
      quantity: stock?.quantity,
      key: `${index}-${stockIndex}`,
    }));

    return formattedStockItems;
  });

  const flattenedItemsToDisplay = itemsToDisplay?.flat().slice(0, 10);

  const launchIssuingStockModal = () => {
    const dispose = showModal('issuing-stock-modal', {
      closeModal: () => dispose(),
      issuingStock: items,
    });
  };

  return (
    <>
      {flattenedItemsToDisplay?.map((item, index) => (
        <div className={styles.card} key={index}>
          <div className={styles.colorLineGreen} />
          <div className={styles.icon}>
            <DocumentExport size={40} color={'#198038'} />
          </div>
          <div className={styles.cardText}>
            <div className={styles.statusLine}>
              <StockOperationStatusTag status={item?.status} />
              <span>
                {item?.sourceName} · {item?.destinationName}
              </span>
            </div>
            <p>
              <strong>{item?.stockItemName}</strong> {item?.stockItemPackagingUOMName}, {item?.quantity}
            </p>
          </div>
        </div>
      ))}
      <Button kind="ghost" onClick={launchIssuingStockModal} size="sm">
        {t('viewAll', 'View All')}
      </Button>
    </>
  );
};

export default StockHomeIssuingCard;
