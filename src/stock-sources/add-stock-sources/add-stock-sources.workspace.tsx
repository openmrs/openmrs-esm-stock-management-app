import React, { type ChangeEvent, useCallback, useState } from 'react';
import classNames from 'classnames';
import { Button, Form, Select, TextInput, SelectItem, ButtonSet, FormGroup, Stack } from '@carbon/react';
import { useTranslation } from 'react-i18next';
import { Save } from '@carbon/react/icons';
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

const StockSourcesAddOrUpdate: React.FC<Workspace2DefinitionProps<AddStockSourceProps>> = ({
  workspaceProps,
  closeWorkspace,
}) => {
  const { model } = workspaceProps ?? {};
  const { t } = useTranslation();
  const handleMutate = useHandleMutate();
  const isTablet = useLayoutType() === 'tablet';
  const { stockSourceTypeUUID } = useConfig<ConfigObject>();

  // get stock sources
  const { items } = useConcept(stockSourceTypeUUID);

  const [formModel, setFormModel] = useState<StockSource>({ ...model });

  const onNameChanged = (evt: React.ChangeEvent<HTMLInputElement>): void => {
    setFormModel({ ...formModel, name: evt.target.value });
  };

  const onAcronymChanged = (evt: React.ChangeEvent<HTMLInputElement>): void => {
    setFormModel({ ...formModel, acronym: evt.target.value });
  };

  const onSourceTypeChange = (evt: ChangeEvent<HTMLSelectElement>) => {
    const selectedSourceType = items?.answers.find((x) => x.uuid === evt.target.value);
    setFormModel({ ...formModel, sourceType: selectedSourceType });
  };

  const handleSave = useCallback(
    (event) => {
      event.preventDefault();

      if (model) {
        formModel.uuid = model.uuid;
      }

      createOrUpdateStockSource(formModel)
        .then(
          () => {
            showSnackbar({
              isLowContrast: true,
              title: t('addedSource', 'Add Source'),
              kind: 'success',
              subtitle: t('stockSourceAddedSuccessfully', 'Stock source added successfully'),
            });

            handleMutate(`${restBaseUrl}/stockmanagement/stocksource`);

            closeWorkspace();
          },
          (error) => {
            showSnackbar({
              title: t('errorAddingSource', 'Error adding a source'),
              kind: 'error',
              isLowContrast: true,
              subtitle: error?.message,
            });
            closeWorkspace();
          },
        )
        .catch();
    },
    [formModel, model, t, closeWorkspace, handleMutate],
  );

  return (
    <Workspace2 title={model ? t('editStockSource', 'Edit stock source') : t('addNewStockSource', 'Add new source')}>
      <Form className={styles.container}>
        <Stack className={styles.form} gap={5}>
          <FormGroup legendText={''}>
            <TextInput
              id="fullname"
              labelText={t('fullName', 'Full name')}
              onChange={onNameChanged}
              placeholder="e.g National Medical Stores"
              size="md"
              type="text"
              value={formModel.name ?? ''}
            />
          </FormGroup>
          <FormGroup legendText={''}>
            <TextInput
              id="acronym"
              labelText={t('acronymOrCode', 'Acronym/Code')}
              onChange={onAcronymChanged}
              placeholder="e.g NMS"
              size="md"
              type="text"
              value={formModel.acronym ?? ''}
            />
          </FormGroup>
          <Select
            name="sourceType"
            className="select-field"
            labelText={t('sourceType', 'Source type')}
            id="sourceType"
            value={formModel?.sourceType ? formModel.sourceType.uuid : ''}
            onChange={onSourceTypeChange}
          >
            <SelectItem disabled hidden value="" text={t('chooseSourceType', 'Choose a source type')} />
            {items?.answers?.map((sourceType) => (
              <SelectItem key={sourceType.uuid} value={sourceType.uuid} text={sourceType.display} />
            ))}
          </Select>
        </Stack>
        <ButtonSet
          className={classNames(styles.buttonSet, {
            [styles.tablet]: isTablet,
            [styles.desktop]: !isTablet,
          })}
        >
          <Button kind="secondary" onClick={() => closeWorkspace()} className={styles.button}>
            {getCoreTranslation('cancel')}
          </Button>
          <Button type="submit" className={styles.button} onClick={handleSave} kind="primary" renderIcon={Save}>
            {getCoreTranslation('save')}
          </Button>
        </ButtonSet>
      </Form>
    </Workspace2>
  );
};

export default StockSourcesAddOrUpdate;
