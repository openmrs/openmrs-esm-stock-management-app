import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button, Form, InlineLoading, ModalBody, ModalFooter, ModalHeader, TextArea } from '@carbon/react';
import { getCoreTranslation, restBaseUrl, showSnackbar } from '@openmrs/esm-framework';
import { type StockOperationDTO } from '../../core/api/types/stockOperation/StockOperationDTO';
import {
  type StopOperationAction,
  type StopOperationActionType,
} from '../../core/api/types/stockOperation/StockOperationAction';
import { executeStockOperationAction } from '../stock-operations.resource';
import { extractErrorMessagesFromResponse } from '../../constants';
import { useHandleMutate } from '../../utils';
import styles from './stock-operations.scss';

interface StockOperationsModalProps {
  title: string;
  requireReason: boolean;
  operation: StockOperationDTO;
  closeModal: () => void;
}

const StockOperationsModal: React.FC<StockOperationsModalProps> = ({ title, requireReason, operation, closeModal }) => {
  const confirmType = title.toLocaleLowerCase().trim();
  const { t } = useTranslation();
  const handleMutate = useHandleMutate();
  const [notes, setNotes] = useState('');
  const [reasonIsInvalid, setReasonIsInvalid] = useState(false);
  const [isApproving, setIsApproving] = useState(false);

  const isCancelling = confirmType === 'cancel';
  const isDestructive = isCancelling || confirmType === 'reject';
  const confirmLabels: Record<string, string> = {
    submit: t('submit', 'Submit'),
    dispatch: t('dispatch', 'Dispatch'),
    dispatchapproval: t('dispatch', 'Dispatch'),
    complete: t('complete', 'Complete'),
    'complete dispatch': t('completeDispatch', 'Complete dispatch'),
    cancel: t('cancelOperation', 'Cancel operation'),
    reject: t('reject', 'Reject'),
    return: t('return', 'Return'),
    approve: t('approve', 'Approve'),
  };
  const confirmLabel = confirmLabels[confirmType] ?? t('submit', 'Submit');

  const handleClick = async (event) => {
    event.preventDefault();

    if (requireReason && !notes.trim()) {
      setReasonIsInvalid(true);
      return;
    }

    setIsApproving(true);

    let actionName: StopOperationActionType | null = null;

    switch (confirmType) {
      case 'submit':
        actionName = 'SUBMIT';
        break;
      case 'dispatch':
        actionName = 'DISPATCH';
        break;
      case 'complete':
        actionName = 'COMPLETE';
        break;
      case 'complete dispatch':
        actionName = 'COMPLETE';
        break;
      case 'cancel':
        actionName = 'CANCEL';
        break;
      case 'reject':
        actionName = 'REJECT';
        break;
      case 'return':
        actionName = 'RETURN';
        break;
      case 'approve':
        actionName = 'APPROVE';
        break;
      case 'dispatchapproval':
        // messagePrefix = "dispatch";
        actionName = 'DISPATCH';
        break;
    }
    if (!actionName) {
      return;
    }

    const payload: StopOperationAction = {
      name: actionName,
      uuid: operation?.uuid,
      reason: notes.trim(),
    };

    // submit action
    executeStockOperationAction(payload).then(
      () => {
        setIsApproving(false);
        showSnackbar({
          title: isCancelling
            ? t('operationCancelled', 'Operation cancelled')
            : t('operationSuccessTitle', '{{title}} Operation', { title }),
          subtitle: isCancelling
            ? undefined
            : t('operationSuccessful', 'You have successfully {{title}} operation', {
                title,
              }),
          kind: 'success',
        });
        closeModal();
        handleMutate(`${restBaseUrl}/stockmanagement/stockoperation`);
      },
      (err) => {
        setIsApproving(false);
        const errorMessages = extractErrorMessagesFromResponse(err);
        const message = errorMessages[0].replace(/[[\]]/g, '');
        showSnackbar({
          title: isCancelling
            ? t('cancelOperationError', 'Couldn’t cancel operation')
            : t('stockOperationErrorTitle', 'Error on saving form'),
          subtitle: t('stockOperationErrorDescription', 'Details: {{message}}', {
            message,
          }),
          kind: 'error',
        });
      },
    );
  };

  return (
    <div>
      <Form onSubmit={handleClick}>
        <ModalHeader
          closeModal={closeModal}
          title={
            isCancelling
              ? t('cancelOperationTitle', 'Cancel operation?')
              : t('operationModalTitle', '{{title}} Operation', { title })
          }
        />
        <ModalBody>
          <div className={styles.modalBody}>
            <section className={styles.section}>
              <h5 className={styles.section}>
                {isCancelling
                  ? t('cancelOperationDescription', 'This operation will be marked as cancelled.')
                  : t('confirmOperation', 'Would you really like to {{title}} the operation?', { title })}
              </h5>
            </section>
            <br />
            {requireReason && (
              <section className={styles.section}>
                <TextArea
                  labelText={
                    isCancelling
                      ? t('cancellationReason', 'Reason for cancellation (required)')
                      : t('notes', 'Please explain the reason:')
                  }
                  id="nextNotes"
                  name="nextNotes"
                  invalid={reasonIsInvalid}
                  invalidText={
                    isCancelling
                      ? t('cancellationReasonRequired', 'Enter a reason for cancelling this operation.')
                      : t('required', 'Required')
                  }
                  maxCount={500}
                  enableCounter
                  onChange={(e) => {
                    setNotes(e.target.value);
                    setReasonIsInvalid(!e.target.value.trim());
                  }}
                />
              </section>
            )}
          </div>
        </ModalBody>
        <ModalFooter>
          <Button kind="secondary" onClick={closeModal}>
            {isCancelling ? t('keepOperation', 'Keep operation') : getCoreTranslation('cancel')}
          </Button>
          {isApproving ? (
            <InlineLoading />
          ) : (
            <Button kind={isDestructive ? 'danger' : 'primary'} type="submit">
              {confirmLabel}
            </Button>
          )}
        </ModalFooter>
      </Form>
    </div>
  );
};

export default StockOperationsModal;
