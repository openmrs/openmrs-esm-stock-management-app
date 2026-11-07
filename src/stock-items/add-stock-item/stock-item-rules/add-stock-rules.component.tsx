import React, { type ChangeEvent, useCallback, useEffect, useMemo, useState } from 'react';
import classNames from 'classnames';
import { useTranslation } from 'react-i18next';
import {
  Button,
  ButtonSet,
  Checkbox,
  CheckboxGroup,
  Form,
  FormGroup,
  Select,
  SelectItem,
  TextInput,
} from '@carbon/react';
import {
  getCoreTranslation,
  restBaseUrl,
  showSnackbar,
  useLayoutType,
  Workspace2,
  type Workspace2DefinitionProps,
} from '@openmrs/esm-framework';
import { createOrUpdateStockRule } from './stock-rules.resource';
import { createStockRuleSchema, getStockRuleFieldErrors, type StockRuleFieldErrors } from './stock-rule.schema';
import { extractErrorMessagesFromResponse } from '../../../constants';
import { ResourceRepresentation } from '../../../core/api/api';
import { type StockItemInventoryFilter, useStockItemPackagingUOMs } from '../../stock-items.resource';
import { type StockRule } from '../../../core/api/types/stockItem/StockRule';
import { useRoles, useStockTagLocations } from '../../../stock-lookups/stock-lookups.resource';
import { useHandleMutate } from '../../../utils';
import styles from './add-stock-rules.scss';

interface AddStockRuleProps {
  model?: StockRule;
  stockItemUuid?: string;
}

const StockRulesAddOrUpdate: React.FC<Workspace2DefinitionProps<AddStockRuleProps>> = ({
  workspaceProps,
  closeWorkspace,
}) => {
  const { model, stockItemUuid } = workspaceProps ?? {};
  const { t } = useTranslation();
  const handleMutate = useHandleMutate();
  const isTablet = useLayoutType() === 'tablet';
  const [stockItemFilter, setStockItemFilter] = useState<StockItemInventoryFilter>({
    startIndex: 0,
    v: ResourceRepresentation.Default,
    q: null,
    totalCount: true,
  });

  useEffect(() => {
    setStockItemFilter({
      startIndex: 0,
      v: ResourceRepresentation.Default,
      totalCount: true,
      stockItemUuid: stockItemUuid,
    });
  }, [stockItemUuid]);

  const { items: dispensingUnits } = useStockItemPackagingUOMs(stockItemFilter);

  const { stockLocations } = useStockTagLocations();

  //Roles
  const { items: rolesData } = useRoles({ v: ResourceRepresentation.Default });

  const [formModel, setFormModel] = useState<StockRule>({
    enabled: true,
    ...model,
  });
  const stockRuleSchema = useMemo(() => createStockRuleSchema(t), [t]);
  const [submitted, setSubmitted] = useState(false);
  // Errors show once the user has tried to save, and then update as they correct the form
  const fieldErrors: StockRuleFieldErrors = submitted ? getStockRuleFieldErrors(stockRuleSchema, formModel) : {};

  useEffect(() => {
    if (model != null && Object.keys(model).length != 0) {
      // To prevent editing properties like date created
      const { ...rest } = model;
      const tmpFormModel = { ...rest };
      setFormModel(tmpFormModel);
    }
  }, [model]);

  const onNameChanged = (evt: React.ChangeEvent<HTMLInputElement>): void => {
    if (model) {
      model.name = evt.target.value;
    }
    setFormModel({ ...formModel, name: evt.target.value });
  };

  const onQuantityChanged = (evt: React.ChangeEvent<HTMLInputElement>): void => {
    if (model) {
      model.quantity = Number(evt.target.value);
    }
    setFormModel({ ...formModel, quantity: Number(evt.target.value) });
  };

  const onEvaluationFrequencyChanged = (evt: React.ChangeEvent<HTMLInputElement>): void => {
    if (model) {
      model.evaluationFrequency = Number(evt.target.value);
    }
    setFormModel({
      ...formModel,
      evaluationFrequency: Number(evt.target.value),
    });
  };

  const onActionFrequencyChanged = (evt: React.ChangeEvent<HTMLInputElement>): void => {
    if (model) {
      model.actionFrequency = Number(evt.target.value);
    }
    setFormModel({ ...formModel, actionFrequency: Number(evt.target.value) });
  };

  const onLocationChange = (evt: ChangeEvent<HTMLSelectElement>) => {
    const selectedLocation = stockLocations.find((x) => x.id === evt.target.value);
    setFormModel({ ...formModel, locationUuid: selectedLocation.id });
  };

  const onQuantityUnitChange = (evt: ChangeEvent<HTMLSelectElement>) => {
    const selectedQuantityUnit = dispensingUnits?.results.find((x) => x.uuid === evt.target.value);
    setFormModel({
      ...formModel,
      stockItemPackagingUOMUuid: selectedQuantityUnit?.uuid,
    });
  };

  const onAlertRoleChange = (evt: ChangeEvent<HTMLSelectElement>) => {
    const selectedAlertRole = rolesData?.results.find((x) => x.display === evt.target.value);
    setFormModel({ ...formModel, alertRole: selectedAlertRole.display });
  };

  const onMailRoleChange = (evt: ChangeEvent<HTMLSelectElement>) => {
    const selectedMailRole = rolesData?.results.find((x) => x.display === evt.target.value);
    console.warn('Setting mail role to: ', selectedMailRole);
    setFormModel({ ...formModel, mailRole: selectedMailRole.display });
  };

  const onEnabledChanged = (): void => {
    const isEnabled = !formModel?.enabled;
    setFormModel({ ...formModel, enabled: isEnabled });
  };

  const onAppliesToChildrenChanged = (): void => {
    const enableDescendants = !formModel?.enableDescendants;
    setFormModel({ ...formModel, enableDescendants: enableDescendants });
  };

  const onFormSubmit = useCallback(
    (event) => {
      event.preventDefault();
      setSubmitted(true);
      if (Object.keys(getStockRuleFieldErrors(stockRuleSchema, formModel)).length > 0) {
        return;
      }
      if (model) {
        formModel.uuid = model.uuid;
      }
      if (stockItemUuid) {
        formModel.stockItemUuid = stockItemUuid;
      }
      createOrUpdateStockRule(formModel)
        .then(
          () => {
            showSnackbar({
              isLowContrast: true,
              title: t('addedRule', 'Add rule'),
              kind: 'success',
              subtitle: t('stockRuleAddedSuccessfully', 'Stock rule added successfully'),
            });
            handleMutate(`${restBaseUrl}/stockmanagement/stockrule`);
            closeWorkspace();
          },
          (error) => {
            showSnackbar({
              title: t('errorAddingRule', 'Error adding a rule'),
              kind: 'error',
              isLowContrast: true,
              subtitle: extractErrorMessagesFromResponse(error).join(', '),
            });
          },
        )
        .catch();
    },
    [formModel, model, t, stockItemUuid, closeWorkspace, handleMutate, stockRuleSchema],
  );

  return (
    <Workspace2 title={model ? t('editStockRule', 'Edit Stock Rule') : t('addStockRule', 'Add stock rule')}>
      <Form onSubmit={onFormSubmit} className={styles.formContainer}>
        <div>
          <FormGroup legendText={t('ruleConfiguration', 'Rule configuration')}>
            <section className={styles.section}>
              <section className={styles.section}>
                <Select
                  name="location"
                  className="select-field"
                  labelText={t('location', 'Location')}
                  id="location"
                  invalid={!!fieldErrors.locationUuid}
                  invalidText={fieldErrors.locationUuid}
                  value={formModel?.locationUuid ? formModel.locationUuid : ''}
                  onChange={onLocationChange}
                >
                  <SelectItem disabled hidden value="" text={t('chooseLocation', 'Choose the location')} />
                  {stockLocations?.map((location) => {
                    return <SelectItem key={location.id} value={location.id} text={location.name} />;
                  })}
                </Select>
              </section>

              <section className={styles.section}>
                <TextInput
                  id="name"
                  invalid={!!fieldErrors.name}
                  invalidText={fieldErrors.name}
                  type="text"
                  labelText={t('ruleName', 'Rule name')}
                  size="md"
                  onChange={onNameChanged}
                  value={model?.name}
                  placeholder="e.g Panado Alert"
                />
              </section>

              <section className={styles.section}>
                <Select
                  name="quantityUnit"
                  className="select-field"
                  labelText={t('quantityUnit', 'Quantity unit')}
                  id="quantityUnit"
                  invalid={!!fieldErrors.stockItemPackagingUOMUuid}
                  invalidText={fieldErrors.stockItemPackagingUOMUuid}
                  value={formModel?.stockItemPackagingUOMUuid ? formModel.stockItemPackagingUOMUuid : ''}
                  onChange={onQuantityUnitChange}
                >
                  <SelectItem disabled hidden value="" text={t('chooseQuantityUnit', 'Choose the Unit of Quantity')} />
                  {dispensingUnits?.results?.map((stockItemPackagingUOMUuid) => {
                    return (
                      <SelectItem
                        key={stockItemPackagingUOMUuid.uuid}
                        value={stockItemPackagingUOMUuid.uuid}
                        text={stockItemPackagingUOMUuid.packagingUomName}
                      />
                    );
                  })}
                </Select>
              </section>

              <section className={styles.section}>
                <TextInput
                  id="quantity"
                  invalid={!!fieldErrors.quantity}
                  invalidText={fieldErrors.quantity}
                  type="number"
                  labelText={t('quantityThreshold', 'Quantity threshold')}
                  size="md"
                  onChange={onQuantityChanged}
                  value={model?.quantity}
                  placeholder="e.g 30 Boxes"
                />
              </section>
            </section>
          </FormGroup>

          <FormGroup legendText={t('notifications', 'Notifications')}>
            <section className={styles.section}>
              <Select
                name="alertRole"
                className="select-field"
                labelText={t('alertRole', 'Alert role')}
                id="alertRole"
                invalid={!!fieldErrors.alertRole}
                invalidText={fieldErrors.alertRole}
                value={formModel?.alertRole ? formModel.alertRole : ''}
                onChange={onAlertRoleChange}
              >
                <SelectItem disabled hidden value="" text={t('chooseAlertRole', 'Choose an Alert Role')} />
                {rolesData?.results?.map((alertRole) => {
                  return <SelectItem key={alertRole.display} value={alertRole.display} text={alertRole.display} />;
                })}
              </Select>
            </section>
            <section className={styles.section}>
              <Select
                name="mailRole"
                className="select-field"
                labelText={t('mailRole', 'Mail role')}
                id="mailRole"
                invalid={!!fieldErrors.mailRole}
                invalidText={fieldErrors.mailRole}
                value={formModel?.mailRole ? formModel.mailRole : ''}
                onChange={onMailRoleChange}
              >
                <SelectItem disabled hidden value="" text={t('chooseMailRole', 'Choose a Mail Role')} />
                {rolesData?.results?.map((mailRole) => {
                  return <SelectItem key={mailRole.display} value={mailRole.display} text={mailRole.display} />;
                })}
              </Select>
            </section>
            <section className={styles.section}>
              <TextInput
                id="evaluationFrequency"
                invalid={!!fieldErrors.evaluationFrequency}
                invalidText={fieldErrors.evaluationFrequency}
                type="number"
                labelText={t('evaluationFrequency', 'Frequency Check (Minutes)')}
                size="md"
                onChange={onEvaluationFrequencyChanged}
                value={model?.evaluationFrequency}
                placeholder="e.g 30 Minutes"
              />
              <TextInput
                id="actionFrequency"
                invalid={!!fieldErrors.actionFrequency}
                invalidText={fieldErrors.actionFrequency}
                type="number"
                labelText={t('actionFrequency', 'Notification Frequency (Minutes)')}
                size="md"
                onChange={onActionFrequencyChanged}
                value={model?.actionFrequency}
                placeholder="e.g 3600 Minutes"
              />
            </section>
          </FormGroup>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              justifyContent: 'center',
            }}
          >
            <FormGroup className="clear-margin-bottom" legendText={t('enabled', 'Enabled')}>
              <CheckboxGroup className={styles.checkboxGrid} legendText="">
                <Checkbox
                  onChange={onEnabledChanged}
                  checked={formModel?.enabled}
                  labelText={`Enabled ?`}
                  value={model?.enabled ? 'true' : 'false'}
                  id="chk-ruleEnabled"
                />
              </CheckboxGroup>
            </FormGroup>
            <FormGroup className="clear-margin-bottom" legendText={t('scope', 'Scope')}>
              <CheckboxGroup className={styles.checkboxGrid} legendText="">
                <Checkbox
                  onChange={onAppliesToChildrenChanged}
                  name="appliesToChildren"
                  checked={formModel?.enableDescendants}
                  value={model?.enableDescendants ? 'true' : 'false'}
                  labelText={`Applies to child locations?`}
                  id="chk-ruleAppliesToChildren"
                />
              </CheckboxGroup>
            </FormGroup>
          </div>

          <div>
            This stock rule will be evaluated by checking if the stock quantities have lowered to the threshold or below
            and a notification will be sent to the personnel with the specified role in the given location. The
            notification will only be sent once per specified notification frequency.
          </div>
        </div>
        <ButtonSet
          className={classNames(styles.buttonSet, {
            [styles.tablet]: isTablet,
            [styles.desktop]: !isTablet,
          })}
        >
          <Button kind="secondary" onClick={() => closeWorkspace()} className={styles.button}>
            {getCoreTranslation('cancel')}
          </Button>
          <Button type="submit" className={styles.button}>
            {getCoreTranslation('save')}
          </Button>
        </ButtonSet>
      </Form>
    </Workspace2>
  );
};

export default StockRulesAddOrUpdate;
