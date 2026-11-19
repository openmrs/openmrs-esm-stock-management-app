import React, { useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Button,
  DataTable,
  DataTableSkeleton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableHeader,
  TableRow,
} from '@carbon/react';
import { TrashCan, Save } from '@carbon/react/icons';
import { FormProvider, useForm, useFormContext } from 'react-hook-form';
import { useStockItemReferencesHook } from './stock-item-references.resource';
import { zodResolver } from '@hookform/resolvers/zod';
import { createStockItemReferencesSchema, type StockItemReferencesFormData } from './validation-schema';
import { type StockItemReferenceDTO } from '../../../core/api/types/stockItem/StockItemReference';
import {
  createStockItemReference,
  deleteStockItemReference,
  updateStockItemReference,
} from '../../stock-items.resource';
import { restBaseUrl, showSnackbar } from '@openmrs/esm-framework';
import { extractErrorMessagesFromResponse } from '../../../constants';
import { useHandleMutate } from '../../../utils';
import ControlledTextInput from '../../../core/components/carbon/controlled-text-input.component';
import StockSourceSelector from './stock-references-selector.component';
import { type CustomTableHeader, type CustomTableRow } from '../../../core/components/table/types';
import styles from './stock-item-references.scss';

const REFERENCES_URL = `${restBaseUrl}/stockmanagement/stockitemreference`;

interface StockReferencesProps {
  isEditing?: boolean;
  onSubmit?: () => void;
  stockItemUuid: string;
}

const StockReferences: React.FC<StockReferencesProps> = ({ stockItemUuid }) => {
  const { t } = useTranslation();
  const handleMutate = useHandleMutate();

  // get stock item references
  const { items, isLoading, setStockItemUuid } = useStockItemReferencesHook();
  useEffect(() => {
    setStockItemUuid(stockItemUuid);
  }, [stockItemUuid, setStockItemUuid]);

  const tableHeaders = useMemo<CustomTableHeader[]>(
    () => [
      {
        key: 'source',
        header: t('source', 'Source'),
        styles: { width: '50%' },
      },
      {
        key: 'code',
        header: t('code', 'Code'),
        styles: { width: '50%' },
      },
      {
        key: 'action',
        header: t('action', 'Actions'),
        styles: { width: '50%' },
      },
    ],
    [t],
  );

  const stockReferenceForm = useForm<StockItemReferencesFormData>({
    defaultValues: { codes: {}, newReference: { stockSourceUuid: '', referenceCode: '' } },
    mode: 'all',
    resolver: zodResolver(createStockItemReferencesSchema(t)),
  });
  const { getValues, reset, setError, setValue, handleSubmit } = stockReferenceForm;

  // Show the latest saved codes without losing what the user has typed and not saved
  useEffect(() => {
    if (items) {
      reset(
        {
          codes: Object.fromEntries(items.map((item) => [item.uuid, item.referenceCode ?? ''])),
          newReference: getValues('newReference'),
        },
        { keepDirtyValues: true },
      );
    }
  }, [items, getValues, reset]);

  const handleSaveStockItemReference = async ({ codes, newReference }: StockItemReferencesFormData) => {
    const changedReferences = (items ?? []).filter(
      (item) => codes[item.uuid] !== undefined && codes[item.uuid] !== (item.referenceCode ?? ''),
    );
    const hasNewReference = !!newReference.stockSourceUuid;

    if (changedReferences.length === 0 && !hasNewReference) {
      setError('newReference.stockSourceUuid', { message: t('sourceRequired', 'Source is required') });
      setError('newReference.referenceCode', { message: t('codeRequired', 'Code is required') });
      return;
    }

    const updates = changedReferences.map((item) =>
      updateStockItemReference(
        {
          referenceCode: codes[item.uuid],
          stockItemUuid: item.stockItemUuid ?? stockItemUuid,
          stockSourceUuid: item.stockSourceUuid,
        },
        item.uuid,
      ),
    );
    const creation = hasNewReference
      ? createStockItemReference({
          referenceCode: newReference.referenceCode,
          stockItemUuid,
          stockSourceUuid: newReference.stockSourceUuid,
        })
      : null;

    const results = await Promise.allSettled([...updates, ...(creation ? [creation] : [])]);
    const failures = results.filter((result): result is PromiseRejectedResult => result.status === 'rejected');

    if (results.length > failures.length) {
      handleMutate(REFERENCES_URL);
    }

    const creationFailed = !!creation && results[results.length - 1].status === 'rejected';
    if (creation && !creationFailed) {
      setValue('newReference', { stockSourceUuid: '', referenceCode: '' });
    }

    if (failures.length === 0) {
      showSnackbar({
        title: t('saveReferenceTitle', 'Stock Item Reference'),
        subtitle: t('saveStockItemReferenceMessage', 'Stock Item Reference saved successfully'),
        kind: 'success',
      });
    } else {
      showSnackbar({
        title: t('saveStockItemReferenceErrorTitle', 'Stock Item Reference'),
        subtitle: t('saveStockItemReferenceError', 'Error saving stock item reference: {{reason}}', {
          reason: failures.flatMap((failure) => extractErrorMessagesFromResponse(failure.reason)).join(', '),
        }),
        kind: 'error',
      });
    }
  };

  if (isLoading) return <DataTableSkeleton showHeader={false} rowCount={5} columnCount={5} zebra />;

  return (
    <FormProvider {...stockReferenceForm}>
      <DataTable
        rows={(items ?? []).map((item, idx) => ({ ...item, id: item.uuid || `ref-${idx}` })) as CustomTableRow[]}
        headers={tableHeaders as any}
        isSortable={false}
        useZebraStyles
      >
        {({ headers, getHeaderProps, getTableProps }) => (
          <TableContainer className={styles.referencesTableContainer}>
            <Table {...getTableProps()} className={styles.referencesTable}>
              <TableHead>
                <TableRow>
                  {headers.map((header) => {
                    const customHeader = header as CustomTableHeader;
                    return (
                      <TableHeader
                        {...getHeaderProps({
                          header,
                          isSortable: false,
                        })}
                        style={customHeader.styles}
                        key={header.key}
                      >
                        {typeof customHeader.header === 'object' &&
                        customHeader.header !== null &&
                        'content' in customHeader.header
                          ? (customHeader.header.content as React.ReactNode)
                          : (customHeader.header as React.ReactNode)}
                      </TableHeader>
                    );
                  })}
                  <TableHeader style={{ width: '70%' }} />
                </TableRow>
              </TableHead>
              <TableBody className={styles.referencesTableBody}>
                {items?.map((row: StockItemReferenceDTO) => (
                  <StockReferencesRow row={row} key={row.uuid} />
                ))}
                <NewStockReferenceRow />
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </DataTable>

      <Button
        name="save"
        type="submit"
        className="submitButton"
        disabled={stockReferenceForm.formState.isSubmitting}
        onClick={handleSubmit(handleSaveStockItemReference)}
        kind="primary"
        renderIcon={Save}
      >
        {t('save', 'Save')}
      </Button>
    </FormProvider>
  );
};
export default StockReferences;

const StockReferencesRow: React.FC<{ row: StockItemReferenceDTO }> = ({ row }) => {
  const { t } = useTranslation();
  const handleMutate = useHandleMutate();
  const {
    control,
    formState: { errors },
    unregister,
  } = useFormContext();
  const codeError = errors.codes?.[row.uuid];

  const handleDelete = (e) => {
    e.preventDefault();
    deleteStockItemReference(row.uuid).then(
      () => {
        unregister(`codes.${row.uuid}`);
        handleMutate(REFERENCES_URL);
        showSnackbar({
          title: t('deleteStockItemReference', 'Delete stock item reference'),
          kind: 'success',
          subtitle: t('deleteStockItemReferenceMessage', 'Stock item reference deleted successfully'),
        });
      },
      (error) => {
        const err = extractErrorMessagesFromResponse(error);
        showSnackbar({
          title: t('deleteStockItemReferenceTitle', `Error Deleting a stockitem reference`),
          kind: 'error',
          subtitle: err.join(','),
        });
      },
    );
  };

  return (
    <TableRow>
      <TableCell>{row?.stockSourceName}</TableCell>
      <TableCell>
        <div className={styles.referencesTableCell}>
          <ControlledTextInput
            id={`reference-code-${row.uuid}`}
            name={`codes.${row.uuid}`}
            control={control}
            size={'md'}
            controllerName={`codes.${row.uuid}`}
            hideLabel
            invalid={!!codeError}
            invalidText={codeError?.message as string}
            labelText={t('code', 'Code')}
          />
          <Button
            type="button"
            size="sm"
            className="submitButton clear-padding-margin"
            iconDescription={t('delete', 'Delete')}
            kind="ghost"
            renderIcon={TrashCan}
            onClick={(e) => handleDelete(e)}
          />
        </div>
      </TableCell>
    </TableRow>
  );
};

const NewStockReferenceRow: React.FC = () => {
  const { t } = useTranslation();
  const {
    control,
    formState: { errors },
  } = useFormContext();
  const newReferenceErrors = errors.newReference as
    | { stockSourceUuid?: { message?: string }; referenceCode?: { message?: string } }
    | undefined;

  return (
    <TableRow>
      <TableCell>
        <StockSourceSelector
          name="new-reference-source"
          controllerName="newReference.stockSourceUuid"
          control={control}
          invalid={!!newReferenceErrors?.stockSourceUuid}
          invalidText={newReferenceErrors?.stockSourceUuid?.message}
          placeholder={t('filter', 'Filter...')}
        />
      </TableCell>
      <TableCell>
        <div className={styles.referencesTableCell}>
          <ControlledTextInput
            id="new-reference-code"
            name="newReference.referenceCode"
            control={control}
            size={'md'}
            controllerName="newReference.referenceCode"
            hideLabel
            invalid={!!newReferenceErrors?.referenceCode}
            invalidText={newReferenceErrors?.referenceCode?.message}
            labelText={t('code', 'Code')}
          />
        </div>
      </TableCell>
    </TableRow>
  );
};
