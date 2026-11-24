import React, { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@carbon/react';
import { TrashCan } from '@carbon/react/icons';
import { showModal } from '@openmrs/esm-framework';
import { type StockItemPackagingUOMDTO } from '../../../core/api/types/stockItem/StockItemPackagingUOM';

interface DeletePackagingUnitActionButtonProps {
  row?: StockItemPackagingUOMDTO;
  /** Called after the unit was deleted, so list owners can refresh their data. */
  onDeleted?: () => void;
}

const DeletePackagingUnitActionButton: React.FC<DeletePackagingUnitActionButtonProps> = ({ row, onDeleted }) => {
  const { t } = useTranslation();
  const launchDeleteModal = useCallback(() => {
    const dispose = showModal('delete-packaging-unit-modal', {
      closeModal: () => dispose(),
      row,
      onDeleted,
    });
  }, [row, onDeleted]);

  return (
    <Button
      type="button"
      size="sm"
      className="submitButton clear-padding-margin"
      iconDescription={t('delete', 'Delete')}
      hasIconOnly
      kind="ghost"
      renderIcon={TrashCan}
      onClick={launchDeleteModal}
    />
  );
};

export default DeletePackagingUnitActionButton;
