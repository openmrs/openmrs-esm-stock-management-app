import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button, ModalHeader, ModalBody, ModalFooter, TextArea } from '@carbon/react';
import { showSnackbar } from '@openmrs/esm-framework';
import { type StockItemPackagingUomReference } from '../../../core/api/types/stockItem/StockItemPackagingUomReference';
import { voidStockItemPackagingUomReference } from '../../stock-items.resource';
import { extractErrorMessagesFromResponse } from '../../../constants';
import { VOID_REASON_MAX_LENGTH, voidReferenceReasonSchema } from './reference-validation';
import styles from './packaging-units.scss';

interface PackagingUomReferenceVoidModalProps {
  closeModal: () => void;
  reference: StockItemPackagingUomReference;
  /** Called after the reference was voided, so the caller can refresh its lists. */
  onVoided?: (reference: StockItemPackagingUomReference) => void;
}

const PackagingUomReferenceVoidModal: React.FC<PackagingUomReferenceVoidModalProps> = ({
  closeModal,
  reference,
  onVoided,
}) => {
  const { t } = useTranslation();
  const [reason, setReason] = useState('');
  const [serverError, setServerError] = useState<string | null>(null);
  const [isVoiding, setIsVoiding] = useState(false);

  const handleVoid = () => {
    const parsed = voidReferenceReasonSchema.safeParse({ reason });
    if (!parsed.success) {
      setServerError((parsed as { error?: { issues: Array<{ message: string }> } }).error?.issues[0].message);
      return;
    }
    const trimmedReason = parsed.data.reason;

    setIsVoiding(true);
    setServerError(null);
    voidStockItemPackagingUomReference(reference.uuid, trimmedReason).then(
      () => {
        setIsVoiding(false);
        showSnackbar({
          title: t('voidPackagingUomReferenceTitle', 'Reference voided'),
          subtitle: t(
            'voidPackagingUomReferenceMessage',
            'The original code can now be reused within the stock source.',
          ),
          kind: 'success',
        });
        onVoided?.(reference);
        closeModal();
      },
      (error) => {
        setIsVoiding(false);
        setServerError(extractErrorMessagesFromResponse(error).join(' '));
      },
    );
  };

  return (
    <div>
      <ModalHeader closeModal={closeModal} className={styles.productiveHeading03}>
        {t('voidPackagingUomReferenceHeading', 'Void packaging reference?')}
      </ModalHeader>
      <ModalBody>
        <div className={styles.voidWarning}>
          {t(
            'voidPackagingUomReferenceWarning',
            'Voiding this reference frees the original code for reuse within {{source}}, while the record stays in the audit list.',
            { source: reference.stockSourceName },
          )}
        </div>
        <div className={styles.referenceModalContext}>
          <span>
            <strong>{t('referenceCodeLabel', 'Reference code')}:</strong> {reference.referenceCode}
          </span>
        </div>
        <TextArea
          id="void-packaging-uom-reference-reason"
          labelText={t('reasonForVoidingLabel', 'Reason for voiding')}
          placeholder={t('reasonForVoidingPlaceholder', 'Provide a reason')}
          value={reason}
          rows={3}
          onChange={(event: React.ChangeEvent<HTMLTextAreaElement>) => setReason(event.target.value)}
          enableCounter
          maxCount={VOID_REASON_MAX_LENGTH}
        />
        {serverError ? (
          <div className={styles.referenceModalError} role="alert">
            {serverError}
          </div>
        ) : null}
      </ModalBody>
      <ModalFooter>
        <Button kind="secondary" onClick={closeModal} disabled={isVoiding}>
          {t('cancel', 'Cancel')}
        </Button>
        <Button kind="danger" onClick={handleVoid} disabled={isVoiding}>
          {t('voidReferenceAction', 'Void reference')}
        </Button>
      </ModalFooter>
    </div>
  );
};

export default PackagingUomReferenceVoidModal;
