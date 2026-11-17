import React from 'react';
import classNames from 'classnames';
import { Button, Form, Select, TextInput, SelectItem, ButtonSet, FormGroup, Stack, InlineLoading } from '@carbon/react';
import { useTranslation } from 'react-i18next';
import { Save } from '@carbon/react/icons';
import { zodResolver } from '@hookform/resolvers/zod';
import { Controller, useForm, type SubmitHandler } from 'react-hook-form';
import { z } from 'zod';
import {
  getCoreTranslation,
  restBaseUrl,
  showSnackbar,
  useConfig,
  useLayoutType,
  Workspace2,
  type Workspace2DefinitionProps,
} from '@openmrs/esm-framework';
import { useConcept } from '../../stock-lookups/stock-lookups.resource';
import { type StockSource } from '../../core/api/types/stockOperation/StockSource';
import { createOrUpdateStockSource } from '../stock-sources.resource';
import { type ConfigObject } from '../../config-schema';
import { useHandleMutate } from '../../utils';
import styles from './add-stock-sources.scss';

interface AddStockSourceProps {
  model?: StockSource;
}

const createStockSourceSchema = (t: (key: string, defaultValue?: string) => string) =>
  z.object({
    name: z
      .string({ required_error: t('nameRequired', 'Name is required') })
      .trim()
      .min(1, t('nameRequired', 'Name is required')),
    sourceTypeUuid: z
      .string({ required_error: t('sourceTypeRequired', 'Source type is required') })
      .trim()
      .min(1, t('sourceTypeRequired', 'Source type is required')),
    acronym: z.string().optional().nullable(),
  });

type StockSourceFormData = z.infer<ReturnType<typeof createStockSourceSchema>>;

const StockSourcesAddOrUpdate: React.FC<Workspace2DefinitionProps<AddStockSourceProps>> = (props) => {
  const { workspaceProps, closeWorkspace } = props as Workspace2DefinitionProps<AddStockSourceProps> & {
    workspaceProps?: AddStockSourceProps;
    closeWorkspace?: () => void;
  };
  const { model } = workspaceProps ?? {};
  const { t } = useTranslation();
  const handleMutate = useHandleMutate();
  const isTablet = useLayoutType() === 'tablet';
  const { stockSourceTypeUUID } = useConfig<ConfigObject>();

  // get stock sources
  const { items } = useConcept(stockSourceTypeUUID);

  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<StockSourceFormData>({
    mode: 'all',
    resolver: zodResolver(createStockSourceSchema(t)),
    defaultValues: {
      name: model?.name ?? '',
      acronym: model?.acronym ?? '',
      sourceTypeUuid: model?.sourceType?.uuid ?? '',
    },
  });

  const onSubmit: SubmitHandler<StockSourceFormData> = (data) => {
    const payload: StockSource = {
      ...(model ?? {}),
      name: data.name.trim(),
      acronym: data.acronym?.trim() || undefined,
      sourceType: items?.answers?.find((x: any) => x.uuid === data.sourceTypeUuid),
    } as StockSource;

    if (model?.uuid) {
      payload.uuid = model.uuid;
    }

    return createOrUpdateStockSource(payload)
      .then(() => {
        showSnackbar({
          isLowContrast: true,
          title: model ? t('sourceUpdated', 'Source updated') : t('addedSource', 'Add Source'),
          kind: 'success',
          subtitle: model
            ? t('stockSourceUpdatedSuccessfully', 'Stock source updated successfully')
            : t('stockSourceAddedSuccessfully', 'Stock source added successfully'),
        });

        handleMutate(`${restBaseUrl}/stockmanagement/stocksource`);

        closeWorkspace?.();
      })
      .catch((error: any) => {
        showSnackbar({
          title: model ? t('errorUpdatingSource', 'Error updating a source') : t('errorAddingSource', 'Error adding a source'),
          kind: 'error',
          isLowContrast: true,
          subtitle: error?.responseBody?.error?.message || error?.message,
        });
      });
  };

  return (
    <Workspace2 title={model ? t('editStockSource', 'Edit stock source') : t('addNewStockSource', 'Add new source')}>
      <Form className={styles.container} onSubmit={handleSubmit(onSubmit)}>
        <Stack className={styles.form} gap={5}>
          <FormGroup legendText={''}>
            <Controller
              name="name"
              control={control}
              render={({ field }: any) => (
                <TextInput
                  {...field}
                  id="fullname"
                  labelText={t('fullName', 'Full name')}
                  placeholder="e.g National Medical Stores"
                  size="md"
                  type="text"
                  invalid={!!errors.name}
                  invalidText={errors.name?.message}
                />
              )}
            />
          </FormGroup>
          <FormGroup legendText={''}>
            <Controller
              name="acronym"
              control={control}
              render={({ field }: any) => (
                <TextInput
                  {...field}
                  value={field.value ?? ''}
                  id="acronym"
                  labelText={t('acronymOrCode', 'Acronym/Code')}
                  placeholder="e.g NMS"
                  size="md"
                  type="text"
                  invalid={!!errors.acronym}
                  invalidText={errors.acronym?.message}
                />
              )}
            />
          </FormGroup>
          <Controller
            name="sourceTypeUuid"
            control={control}
            render={({ field }: any) => (
              <Select
                {...field}
                name="sourceType"
                className="select-field"
                labelText={t('sourceType', 'Source type')}
                id="sourceType"
                invalid={!!errors.sourceTypeUuid}
                invalidText={errors.sourceTypeUuid?.message}
              >
                <SelectItem disabled hidden value="" text={t('chooseSourceType', 'Choose a source type')} />
                {(items?.answers as any[])?.map((sourceType: any) => (
                  <SelectItem key={sourceType.uuid} value={sourceType.uuid} text={sourceType.display} />
                ))}
              </Select>
            )}
          />
        </Stack>
        <ButtonSet
          className={classNames(styles.buttonSet, {
            [styles.tablet]: isTablet,
            [styles.desktop]: !isTablet,
          })}
        >
          <Button kind="secondary" onClick={() => closeWorkspace?.()} className={styles.button} disabled={isSubmitting}>
            {getCoreTranslation('cancel')}
          </Button>
          <Button type="submit" className={styles.button} kind="primary" renderIcon={isSubmitting ? undefined : Save} disabled={isSubmitting}>
            {isSubmitting ? <InlineLoading description={t('saving', 'Saving')} /> : getCoreTranslation('save')}
          </Button>
        </ButtonSet>
      </Form>
    </Workspace2>
  );
};

export default StockSourcesAddOrUpdate;
