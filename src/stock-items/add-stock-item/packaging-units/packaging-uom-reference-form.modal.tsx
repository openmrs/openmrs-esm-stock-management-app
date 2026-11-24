import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Button,
  ComboBox,
  InlineLoading,
  ModalHeader,
  ModalBody,
  ModalFooter,
  TextArea,
  TextInput,
  TextInputSkeleton,
} from '@carbon/react';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { showSnackbar } from '@openmrs/esm-framework';
import { useStockSources } from '../../../stock-sources/stock-sources.resource';
import { ResourceRepresentation } from '../../../core/api/api';
import { type StockSource } from '../../../core/api/types/stockOperation/StockSource';
import {
  type StockItemPackagingUomReference,
  type StockItemPackagingUomReferenceDTO,
} from '../../../core/api/types/stockItem/StockItemPackagingUomReference';
import { createStockItemPackagingUomReference, updateStockItemPackagingUomReference } from '../../stock-items.resource';
import { extractErrorMessagesFromResponse } from '../../../constants';
import {
  REFERENCE_CODE_MAX_LENGTH,
  REFERENCE_DESCRIPTION_MAX_LENGTH,
  REFERENCE_NAME_MAX_LENGTH,
  packagingUomReferenceSchema,
  type PackagingUomReferenceFormData,
} from './reference-validation';
import styles from './packaging-units.scss';

interface PackagingUomReferenceFormModalProps {
  closeModal: () => void;

  /** An existing persisted reference to edit. Its UOM and source are immutable. */
  reference?: StockItemPackagingUomReference | null;

  /** The packaging UOM a new persisted reference is attached to. Must be persisted. */
  packagingUomUuid?: string | null;
  packagingUomLabel?: string;

  /** Called after a persisted reference was created or updated. */
  onSaved?: (reference: StockItemPackagingUomReference) => void;
}

interface ReferenceFormFields extends PackagingUomReferenceFormData {
  stockSourceName?: string;
}

const PackagingUomReferenceFormModal: React.FC<PackagingUomReferenceFormModalProps> = ({
  closeModal,
  reference = null,
  packagingUomUuid,
  packagingUomLabel,
  onSaved,
}) => {
  const { t } = useTranslation();
  const isEditing = !!reference?.uuid;
  const [serverError, setServerError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const {
    items: { results: sourcesList },
    isLoading: isLoadingSources,
  } = useStockSources({ v: ResourceRepresentation.Default });

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<ReferenceFormFields>({
    defaultValues: {
      stockSourceUuid: reference?.stockSourceUuid ?? '',
      stockSourceName: reference?.stockSourceName ?? '',
      referenceCode: reference?.referenceCode ?? '',
      name: reference?.name ?? '',
      description: reference?.description ?? '',
    },
    mode: 'onTouched',
    resolver: zodResolver(packagingUomReferenceSchema),
  });

  const handleSave = (values: ReferenceFormFields) => {
    setIsSaving(true);
    setServerError(null);

    const request = isEditing
      ? updateStockItemPackagingUomReference(reference.uuid, {
          referenceCode: values.referenceCode.trim(),
          name: values.name || null,
          description: values.description || null,
        })
      : createStockItemPackagingUomReference({
          stockItemPackagingUomUuid: packagingUomUuid,
          stockSourceUuid: values.stockSourceUuid,
          referenceCode: values.referenceCode.trim(),
          name: values.name || null,
          description: values.description || null,
        });

    request.then(
      (response) => {
        setIsSaving(false);
        showSnackbar({
          title: t('packagingUomReferenceTitle', 'Packaging reference'),
          subtitle: isEditing
            ? t('packagingUomReferenceUpdated', 'Reference updated successfully')
            : t('packagingUomReferenceSaved', 'Reference saved successfully'),
          kind: 'success',
        });
        onSaved?.(response.data);
        closeModal();
      },
      (error) => {
        // business errors (e.g. a duplicate source/code pair) are shown verbatim while
        // the form values are retained for correction
        setIsSaving(false);
        setServerError(extractErrorMessagesFromResponse(error).join(' '));
      },
    );
  };

  const modalHeading = isEditing
    ? t('editPackagingUomReference', 'Edit packaging reference')
    : t('addPackagingUomReference', 'Add packaging reference');

  return (
    <div className={styles.referenceModal}>
      <ModalHeader closeModal={closeModal} className={styles.productiveHeading03}>
        {modalHeading}
      </ModalHeader>
      <ModalBody>
        <div className={styles.referenceModalContext}>
          <span>
            <strong>{t('packagingUnitLabel', 'Packaging unit')}:</strong>{' '}
            {packagingUomLabel ?? reference?.stockItemPackagingUomUuid}
          </span>
          {isEditing ? (
            <span>{t('packagingUomReferenceImmutable', 'Packaging unit and stock source cannot be changed.')}</span>
          ) : null}
        </div>
        {isEditing ? (
          <div className={styles.referenceModalNotice}>
            {t(
              'packagingUomReferenceCodeChangeWarning',
              'Changing the reference code affects source-specific lookup in receiving and dispensing workflows.',
            )}
          </div>
        ) : null}

        {isLoadingSources ? (
          <TextInputSkeleton />
        ) : (
          <Controller
            name="stockSourceUuid"
            control={control}
            render={({ field: { onChange, value, ref } }) => {
              // controlled selection: the source list loads after mount, so an
              // initialSelectedItem-only combobox would show the saved source blank.
              // When editing, the saved source is also prepended in case it is not
              // part of the fetched list, so its name stays visible (it is immutable).
              const selectedSource =
                sourcesList?.find((source) => source.uuid === value) ??
                (value ? ({ uuid: value, name: reference?.stockSourceName ?? '' } as StockSource) : null);
              const sourceItems =
                selectedSource && !sourcesList?.some((source) => source.uuid === selectedSource.uuid)
                  ? [selectedSource, ...(sourcesList ?? [])]
                  : sourcesList ?? [];
              return (
                <ComboBox
                  id="packaging-uom-reference-source"
                  titleText={t('stockSource', 'Stock source')}
                  placeholder={t('filter', 'Filter...')}
                  items={sourceItems}
                  itemToString={(item?: StockSource) => item?.name ?? ''}
                  initialSelectedItem={selectedSource}
                  selectedItem={selectedSource}
                  disabled={isEditing}
                  onChange={(data: { selectedItem?: StockSource }) => {
                    onChange(data.selectedItem?.uuid ?? '');
                  }}
                  invalid={!!errors.stockSourceUuid}
                  invalidText={errors.stockSourceUuid?.message}
                  ref={ref}
                />
              );
            }}
          />
        )}

        <Controller
          name="referenceCode"
          control={control}
          render={({ field: { onChange, value, ref } }) => (
            <TextInput
              id="packaging-uom-reference-code"
              labelText={t('referenceCodeLabel', 'Reference code')}
              placeholder={t('referenceCodePlaceholder', 'Source-specific external code')}
              value={value ?? ''}
              onChange={(event: React.ChangeEvent<HTMLInputElement>) => onChange(event.target.value)}
              invalid={!!errors.referenceCode}
              invalidText={errors.referenceCode?.message}
              enableCounter
              maxCount={REFERENCE_CODE_MAX_LENGTH}
              ref={ref}
            />
          )}
        />

        <Controller
          name="name"
          control={control}
          render={({ field: { onChange, value, ref } }) => (
            <TextInput
              id="packaging-uom-reference-name"
              labelText={t('nameOptionalLabel', 'Name (optional)')}
              placeholder={t('referenceNamePlaceholder', 'e.g. Supplier product code')}
              value={value ?? ''}
              onChange={(event: React.ChangeEvent<HTMLInputElement>) => onChange(event.target.value)}
              invalid={!!errors.name}
              invalidText={errors.name?.message}
              enableCounter
              maxCount={REFERENCE_NAME_MAX_LENGTH}
              ref={ref}
            />
          )}
        />

        <Controller
          name="description"
          control={control}
          render={({ field: { onChange, value, ref } }) => (
            <TextArea
              id="packaging-uom-reference-description"
              labelText={t('descriptionOptionalLabel', 'Description (optional)')}
              rows={3}
              value={value ?? ''}
              onChange={(event: React.ChangeEvent<HTMLTextAreaElement>) => onChange(event.target.value)}
              invalid={!!errors.description}
              invalidText={errors.description?.message}
              enableCounter
              maxCount={REFERENCE_DESCRIPTION_MAX_LENGTH}
              ref={ref}
            />
          )}
        />

        {serverError ? (
          <div className={styles.referenceModalError} role="alert">
            {serverError}
          </div>
        ) : null}
      </ModalBody>
      <ModalFooter>
        <Button kind="secondary" onClick={closeModal} disabled={isSaving}>
          {t('cancel', 'Cancel')}
        </Button>
        {isSaving ? (
          <InlineLoading description={t('saving', 'Saving...')} />
        ) : (
          <Button kind="primary" onClick={handleSubmit(handleSave)}>
            {isEditing ? t('saveChanges', 'Save changes') : t('addReference', 'Add reference')}
          </Button>
        )}
      </ModalFooter>
    </div>
  );
};

export default PackagingUomReferenceFormModal;
