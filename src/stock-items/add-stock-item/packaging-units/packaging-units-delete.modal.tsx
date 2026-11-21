import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button, ModalHeader, ModalBody, ModalFooter, TextArea } from '@carbon/react';
import { showSnackbar } from '@openmrs/esm-framework';
import { type StockItemPackagingUOMDTO } from '../../../core/api/types/stockItem/StockItemPackagingUOM';
import { deleteStockItemPackagingUnit } from '../../stock-items.resource';
import styles from '../packaging-units/packaging-units.scss';

interface DeletePackagingUnitModalProps {
  row?: StockItemPackagingUOMDTO;
  closeModal: () => void;
  /** Called after the unit was deleted, so list owners can refresh their data. */
  onDeleted?: () => void;
}

const DeletePackagingUnitModal: React.FC<DeletePackagingUnitModalProps> = ({ row, closeModal, onDeleted }) => {
  const { t } = useTranslation();
  const [reason, setReason] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  const handleReasonChange = (e) => {
    setReason(e.target.value);
  };

  const handleDelete = (e) => {
    e.preventDefault();
    if (isDeleting) {
      return;
    }
    setIsDeleting(true);
    deleteStockItemPackagingUnit(row.uuid).then(
      () => {
        onDeleted?.();
        closeModal();
        showSnackbar({
          isLowContrast: true,
          title: t('deletePackingItem', 'Delete packing item'),
          kind: 'success',
          subtitle: t('deletePackagingUnitMessage', 'Stock item packing unit deleted successfully'),
        });
      },
      (error) => {
        setIsDeleting(false);
        showSnackbar({
          title: t('deletePackingUnitErrorTitle', 'Error Deleting a stock item packing unit'),
          kind: 'error',
          isLowContrast: true,
          subtitle: error?.message,
        });
      },
    );
  };

  return (
    <div>
      <ModalHeader closeModal={closeModal} className={styles.productiveHeading03}>
        {t('removePackagingUnit', 'Remove Packaging Unit')}?
      </ModalHeader>
      <ModalBody>
        <span>
          {t(
            'removePackagingUnitConfirmation',
            'Would you really like to remove the packaging unit {{name}} from the stock item?',
            {
              name: row?.packagingUomName,
            },
          )}
        </span>
        <TextArea
          id="reason"
          labelText={t('reasonLabel', 'Please explain the reason:')}
          onChange={handleReasonChange}
          maxLength={500}
          placeholder={t('reasonPlaceholder', 'Enter reason here')}
        />
      </ModalBody>
      <ModalFooter>
        <Button kind="secondary" onClick={closeModal} disabled={isDeleting}>
          {t('no', 'No')}
        </Button>
        <Button kind="danger" type="submit" onClick={handleDelete} disabled={reason.length < 1 || isDeleting}>
          {t('yes', 'Yes')}
        </Button>
      </ModalFooter>
    </div>
  );
};

export default DeletePackagingUnitModal;
