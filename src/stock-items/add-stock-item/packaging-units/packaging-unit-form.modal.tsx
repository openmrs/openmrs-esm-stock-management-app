import React, { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button, InlineLoading, ModalHeader, ModalBody, ModalFooter } from '@carbon/react';
import { FormProvider, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { showSnackbar } from '@openmrs/esm-framework';
import { type StockItemPackagingUOMDTO } from '../../../core/api/types/stockItem/StockItemPackagingUOM';
import { createStockItemPackagingUnit, updateStockItemPackagingUnit } from '../../stock-items.resource';
import { extractErrorMessagesFromResponse } from '../../../constants';
import ControlledNumberInput from '../../../core/components/carbon/controlled-number-input.component';
import PackagingUnitsConceptSelector from '../packaging-units-concept-selector/packaging-units-concept-selector.component';
import { packagingUnitSchema } from './reference-validation';
import styles from './packaging-units.scss';

/**
 * Staged state for the packaging unit modal, retained by the section across
 * cancel/reopen so unsaved unit values survive dismissing the modal.
 */
export interface PackagingUnitModalSession {
  /** Set once the unit itself has been persisted; saving again then never re-creates it. */
  persistedUnitUuid?: string | null;
  packagingUomUuid?: string | null;
  packagingUomName?: string;
  factor?: number | string | null;
}

interface PackagingUnitFormModalProps {
  closeModal: () => void;
  stockItemUuid: string;
  /** An already-persisted unit being edited (its UUID must exist). Null when adding. */
  unit?: StockItemPackagingUOMDTO | null;
  /** Retained staged state from a previous dismissal of the same add/edit flow. */
  stagedSession?: PackagingUnitModalSession | null;
  /** Called when the unit persisted successfully. */
  onSaved?: () => void;
  /** Called on dismissal with the current staged state, so unsaved values survive cancel. */
  onDismiss?: (session: PackagingUnitModalSession) => void;
}

const PackagingUnitFormModal: React.FC<PackagingUnitFormModalProps> = ({
  closeModal,
  stockItemUuid,
  unit = null,
  stagedSession = null,
  onSaved,
  onDismiss,
}) => {
  const { t } = useTranslation();
  const [session, setSession] = useState<PackagingUnitModalSession>(
    () =>
      stagedSession ?? {
        persistedUnitUuid: unit?.uuid ?? null,
        packagingUomUuid: unit?.packagingUomUuid ?? null,
        packagingUomName: unit?.packagingUomName ?? '',
        factor: unit?.factor ?? '',
      },
  );
  const [modalError, setModalError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const form = useForm<{ packagingUomUuid?: string; packagingUomName?: string; factor?: number | string }>({
    defaultValues: {
      packagingUomUuid: session.packagingUomUuid ?? undefined,
      packagingUomName: session.packagingUomName ?? '',
      factor: session.factor ?? '',
    },
    mode: 'onTouched',
    resolver: zodResolver(packagingUnitSchema),
  });

  const {
    formState: { errors },
    handleSubmit,
  } = form;

  const snapshotSession = useCallback((): PackagingUnitModalSession => {
    // the form's values alone: falling back to the session here would resurrect a
    // value the user deliberately cleared when they cancel and reopen
    const values = form.getValues();
    return {
      persistedUnitUuid: session.persistedUnitUuid,
      packagingUomUuid: values.packagingUomUuid ?? null,
      packagingUomName: values.packagingUomName ?? '',
      factor: values.factor ?? null,
    };
  }, [form, session]);

  const handleCancel = useCallback(() => {
    // block dismissal while a save is in flight: dismissing now would orphan the
    // request — the staged session keeps no persistedUnitUuid yet, so saving the
    // same draft after reopening would create the unit a second time. This guard
    // also covers the header close button, which Carbon cannot disable via props.
    if (isSaving) {
      return;
    }
    onDismiss?.(snapshotSession());
    closeModal();
  }, [isSaving, onDismiss, snapshotSession, closeModal]);

  // handleSubmit runs the zod resolver: invalid fields populate errors (which the
  // concept selector and pack size input render) and the handler below only runs
  // on valid, schema-normalized values
  const handleSave = handleSubmit(async (values) => {
    setIsSaving(true);
    setModalError(null);

    try {
      if (!session.persistedUnitUuid) {
        const response = await createStockItemPackagingUnit({
          factor: values.factor,
          packagingUomUuid: values.packagingUomUuid,
          stockItemUuid,
        } as StockItemPackagingUOMDTO);
        if (!response.data?.uuid) {
          // without the new UUID the modal cannot know the unit is persisted, and
          // saving again would create it a second time — surface that instead
          throw new Error(
            t(
              'packagingUnitCreatedWithoutUuid',
              'Packaging unit saved, but its identifier was missing from the response. Close and reopen this dialog before making further changes.',
            ),
          );
        }
        setSession((current) => ({ ...current, persistedUnitUuid: response.data.uuid }));
      } else if (
        unit?.uuid &&
        (Number(unit.factor) !== values.factor || unit.packagingUomUuid !== values.packagingUomUuid)
      ) {
        await updateStockItemPackagingUnit(
          {
            ...unit,
            factor: values.factor,
            packagingUomUuid: values.packagingUomUuid,
          } as StockItemPackagingUOMDTO,
          unit.uuid,
        );
      }

      showSnackbar({
        title: t('savePackingUnitTitle', 'Package Unit'),
        subtitle: t('savePackingUnitMessage', 'Package Unit saved successfully'),
        kind: 'success',
      });
      // cache invalidation is owned by the section's onSaved handler
      onSaved?.();
      closeModal();
    } catch (error) {
      setIsSaving(false);
      setModalError(extractErrorMessagesFromResponse(error).join(' '));
    }
  });

  const isCreate = !session.persistedUnitUuid && !unit?.uuid;

  return (
    <div className={styles.unitModal}>
      <ModalHeader closeModal={handleCancel} className={styles.productiveHeading03}>
        {isCreate
          ? t('addPackagingUnitHeading', 'Add packaging unit')
          : t('editPackagingUnitHeading', 'Edit packaging unit')}
      </ModalHeader>
      <ModalBody>
        <FormProvider {...form}>
          <div className={styles.unitModalFormArea}>
            <div className={styles.unitModalFields}>
              <PackagingUnitsConceptSelector
                row={
                  {
                    id: 'packaging-unit-modal',
                    uuid: session.persistedUnitUuid ?? unit?.uuid,
                    packagingUomUuid: form.watch('packagingUomUuid'),
                    packagingUomName: form.watch('packagingUomName'),
                  } as StockItemPackagingUOMDTO
                }
                controllerName="packagingUomUuid"
                name="packagingUomUuid"
                title={t('packagingUnit', 'Packaging Unit')}
                placeholder={t('filter', 'Filter...')}
                control={form.control}
                onPackageUnitChange={(concept) => {
                  form.setValue('packagingUomUuid', concept?.uuid, { shouldValidate: true });
                  form.setValue('packagingUomName', concept?.display ?? '', { shouldValidate: false });
                }}
                invalid={!!errors.packagingUomUuid}
                invalidText={errors.packagingUomUuid?.message as string}
              />
              <ControlledNumberInput
                row={{ factor: form.watch('factor') } as StockItemPackagingUOMDTO}
                controllerName="factor"
                name="factor"
                label={t('packSize', 'Pack Size')}
                min={1}
                hideSteppers
                control={form.control}
                id="packaging-unit-modal"
                invalid={!!errors.factor}
                invalidText={errors.factor?.message as string}
                onChange={(_, state) => form.setValue('factor', state.value, { shouldValidate: true })}
              />
            </div>
          </div>
        </FormProvider>

        {modalError ? (
          <div className={styles.referenceModalError} role="alert">
            {modalError}
          </div>
        ) : null}
      </ModalBody>
      <ModalFooter>
        <Button kind="secondary" onClick={handleCancel} disabled={isSaving}>
          {t('cancel', 'Cancel')}
        </Button>
        {isSaving ? (
          <InlineLoading description={t('saving', 'Saving...')} />
        ) : (
          <Button kind="primary" onClick={handleSave}>
            {isCreate
              ? t('createPackagingUnit', 'Create packaging unit')
              : t('savePackagingUnit', 'Save packaging unit')}
          </Button>
        )}
      </ModalFooter>
    </div>
  );
};

export default PackagingUnitFormModal;
