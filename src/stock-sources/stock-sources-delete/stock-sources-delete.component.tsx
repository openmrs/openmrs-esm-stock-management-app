import React, { useState } from 'react';
import { Button, InlineLoading } from '@carbon/react';
import { useTranslation } from 'react-i18next';
import { TrashCan } from '@carbon/react/icons';
import { deleteStockSource } from '../stock-sources.resource';
import { restBaseUrl, showModal, showSnackbar } from '@openmrs/esm-framework';
import { useHandleMutate } from '../../utils';

interface StockSourcesDeleteActionMenuProps {
  uuid: string;
}

const StockSourcesDeleteActionMenu: React.FC<StockSourcesDeleteActionMenuProps> = ({ uuid }) => {
  const { t } = useTranslation();
  const handleMutate = useHandleMutate();

  const [deletingSource, setDeletingSource] = useState(false);

  const handleDeleteStockSource = React.useCallback(() => {
    const close = showModal('delete-stock-modal', {
      close: () => close(),
      uuid: uuid,
      onConfirmation: () => {
        const ids = [];
        ids.push(uuid);
        deleteStockSource(ids)
          .then(
            () => {
              setDeletingSource(false);

              handleMutate(`${restBaseUrl}/stockmanagement/stocksource`);
              showSnackbar({
                isLowContrast: true,
                title: t('deletingSource', 'Delete Source'),
                kind: 'success',
                subtitle: t('stockSourceDeletedSuccessfully', 'Stock Source Deleted Successfully'),
              });
            },
            (error) => {
              setDeletingSource(false);
              showSnackbar({
                title: t('errorDeletingSource', 'Error deleting a source'),
                kind: 'error',
                isLowContrast: true,
                subtitle: error?.message,
              });
            },
          )
          .catch();
        close();
      },
    });
  }, [t, uuid, handleMutate]);

  const deleteButton = (
    <Button
      kind="ghost"
      size="md"
      onClick={handleDeleteStockSource}
      hasIconOnly
      iconDescription={t('deleteSource', 'Delete Source')}
      renderIcon={(props) => <TrashCan size={16} {...props} />}
    />
  );

  return deletingSource ? <InlineLoading /> : deleteButton;
};

export default StockSourcesDeleteActionMenu;
