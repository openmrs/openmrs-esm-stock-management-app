import React, { type ChangeEvent, useEffect, useMemo, useState } from 'react';
import classNames from 'classnames';
import {
  Button,
  ButtonSet,
  Checkbox,
  CheckboxGroup,
  ComboBox,
  DatePicker,
  DatePickerInput,
  Form,
  FormGroup,
  InlineLoading,
  Select,
  SelectItem,
  Stack,
  TextInput,
  Toggle,
} from '@carbon/react';
import { Save } from '@carbon/react/icons';
import { useTranslation } from 'react-i18next';
import {
  getCoreTranslation,
  restBaseUrl,
  showSnackbar,
  useConfig,
  useLayoutType,
  useSession,
  Workspace2,
  type Workspace2DefinitionProps,
} from '@openmrs/esm-framework';
import {
  useRoles,
  useStockOperationTypes,
  useStockTagLocations,
  useUser,
} from '../../stock-lookups/stock-lookups.resource';
import { type ConfigObject } from '../../config-schema';
import { ResourceRepresentation } from '../../core/api/api';
import { type UserRoleScope } from '../../core/api/types/identity/UserRoleScope';
import { createOrUpdateUserRoleScope } from '../stock-user-role-scopes.resource';
import { type UserRoleScopeOperationType } from '../../core/api/types/identity/UserRoleScopeOperationType';
import { type UserRoleScopeLocation } from '../../core/api/types/identity/UserRoleScopeLocation';
import { DATE_PICKER_CONTROL_FORMAT, DATE_PICKER_FORMAT, formatForDatePicker, today } from '../../constants';
import { type Role } from '../../core/api/types/identity/Role';
import { type StockOperationType } from '../../core/api/types/stockOperation/StockOperationType';
import { type User } from '../../core/api/types/identity/User';
import { useHandleMutate } from '../../utils';
import useSearchUser from '../../stock-operations/stock-operations-forms/hooks/useSearchUser';
import { useDebounce } from '../../core/hooks/debounce-hook';
import styles from './add-stock-user-role-scope.scss';

const MinDate: Date = today();

interface AddStockUserRoleScopeProps {
  model?: UserRoleScope;
  editMode?: boolean;
}

const AddStockUserRoleScope: React.FC<Workspace2DefinitionProps<AddStockUserRoleScopeProps>> = ({
  workspaceProps,
  closeWorkspace,
}) => {
  const { model, editMode } = workspaceProps ?? {};
  const { t } = useTranslation();
  const { stockRoleUUIDs } = useConfig<ConfigObject>();
  const handleMutate = useHandleMutate();
  const title = model
    ? t('editUserRoleScope', 'Edit user role scope')
    : t('addNewUserRoleScope', 'Add new user role scope');
  const currentUser = useSession();
  const [formModel, setFormModel] = useState<UserRoleScope>({
    ...model,
    enabled: model?.enabled ?? false,
    permanent: model?.permanent ?? false,
  });
  const isTablet = useLayoutType() === 'tablet';

  const [roles, setRoles] = useState<Role[]>([]);

  const loggedInUserUuid = currentUser?.user?.uuid;
  const [selectedUserUuid, setSelectedUserUuid] = useState<string | null>(null);
  const { data: user } = useUser(selectedUserUuid);
  const isEditing = Boolean(model?.uuid);

  const roleOptions = useMemo(() => {
    const stockRoles = (user?.roles?.filter((role) => stockRoleUUIDs.includes(role.uuid)) ?? roles).map(
      (role) => role.display,
    );
    // A saved role stays selectable even if it is no longer one of the configured stock roles
    return model?.role && !stockRoles.includes(model.role) ? [model.role, ...stockRoles] : stockRoles;
  }, [user?.roles, roles, stockRoleUUIDs, model?.role]);

  const activeDates = useMemo(
    () => [formModel?.activeFrom, formModel?.activeTo].filter(Boolean).map((date) => new Date(date)),
    [formModel?.activeFrom, formModel?.activeTo],
  );
  // The picker drops dates before its minimum, so an existing scope's start date has to stay in range
  const savedActiveFrom = model?.activeFrom ? new Date(model.activeFrom) : null;
  const minActiveDate = savedActiveFrom && savedActiveFrom < MinDate ? savedActiveFrom : MinDate;

  // operation types
  const {
    types: { results: stockOperations },
    isLoading,
  } = useStockOperationTypes();

  // Server-side user search (fixes O3-4518: systems with many users)
  const { userList, setSearchString, isLoading: loadingUsers } = useSearchUser();

  const debouncedSearch = useDebounce((query: string) => {
    setSearchString(query?.trim() || null);
  }, 1000);

  // Stabilize the items list — only update when not loading to prevent flicker
  const [stableUserList, setStableUserList] = useState(userList ?? []);

  useEffect(() => {
    if (!loadingUsers && userList) {
      setStableUserList(userList);
    }
  }, [userList, loadingUsers]);

  const usersResults = useMemo(
    () => stableUserList.filter((item) => item.uuid !== loggedInUserUuid),
    [stableUserList, loggedInUserUuid],
  );

  // get roles
  const { isLoading: loadingRoles } = useRoles({
    v: ResourceRepresentation.Default,
  });

  /* Only load locations tagged to perform stock related activities.
     Unless a location has one of the tags configured in `stockLocationTags`, it will not be listed here.
   */
  const { stockLocations, isLoading: isLoadingStockLocations } = useStockTagLocations();
  const onEnabledChanged = (): void => {
    const isEnabled = !formModel?.enabled;
    setFormModel({ ...formModel, enabled: isEnabled });
  };

  const onPermanentChanged = (): void => {
    const isPermanent = !formModel?.permanent;
    setFormModel({
      ...formModel,
      permanent: isPermanent,
      activeFrom: undefined,
      activeTo: undefined,
    });
  };

  useEffect(() => {
    if (model?.userUuid) {
      setSelectedUserUuid(model.userUuid);
    }
  }, [model]);

  const onStockOperationTypeChanged = (event: React.ChangeEvent<HTMLInputElement>): void => {
    const operationType = formModel?.operationTypes?.find((x) => x.operationTypeUuid === event?.target?.value);
    if (operationType) {
      const newOperationTypes = [
        ...formModel.operationTypes.filter((x) => x.operationTypeUuid !== operationType?.operationTypeUuid),
      ];
      setFormModel({ ...formModel, operationTypes: newOperationTypes });
    } else {
      const stockOperationType = stockOperations?.find((x) => x.uuid === event?.target?.value);
      const operationType: UserRoleScopeOperationType = {
        operationTypeName: stockOperationType?.name,
        operationTypeUuid: stockOperationType?.uuid,
      } as unknown as UserRoleScopeOperationType;
      setFormModel({
        ...formModel,
        operationTypes: [...(formModel?.operationTypes ?? []), operationType],
      });
    }
  };

  const onLocationCheckBoxChanged = (event: ChangeEvent<HTMLInputElement>): void => {
    const selectedLocation = formModel?.locations?.find((x) => x.locationUuid === event?.target?.value);
    if (selectedLocation) {
      const newLocations = [
        ...(formModel?.locations?.filter((x) => x.locationUuid !== selectedLocation?.locationUuid) ?? []),
      ];
      setFormModel({ ...formModel, locations: newLocations });
    } else {
      const loc = stockLocations?.find((x) => x.id === event?.target?.value);
      const newLocation: UserRoleScopeLocation = {
        locationName: loc?.name,
        locationUuid: loc?.id,
        enableDescendants: false,
      } as unknown as UserRoleScopeLocation;
      const newLocations = [...(formModel?.locations ?? []), newLocation];
      setFormModel({ ...formModel, locations: newLocations });
    }
  };

  const onEnableDescendantsToggled = (locationUuid: string, enableDescendants: boolean): void => {
    const locations = formModel?.locations?.map((location) =>
      location.locationUuid === locationUuid ? { ...location, enableDescendants } : location,
    );
    setFormModel({ ...formModel, locations });
  };

  const findCheckedLocation = (location: fhir.Location): UserRoleScopeLocation | null => {
    const result = formModel?.locations?.filter((x) => x.locationUuid === location.id);
    return result && result.length > 0 ? result[0] : null;
  };

  const onActiveDatesChange = (dates: Date[]): void => {
    setFormModel({ ...formModel, activeFrom: dates[0], activeTo: dates[1] });
  };

  const onUserChanged = (data: { selectedItem: User }) => {
    const filteredStockRoles = data.selectedItem?.roles
      .filter((role) => stockRoleUUIDs.includes(role.uuid))
      .filter((role) => role.uuid !== loggedInUserUuid);
    setFormModel({ ...formModel, userUuid: data.selectedItem?.uuid, role: undefined });
    setRoles(filteredStockRoles ?? []);
    setSelectedUserUuid(data?.selectedItem?.uuid);
  };

  const onRoleChange = (e: ChangeEvent<HTMLSelectElement>) => {
    const rootLocations = stockLocations?.filter((x) => !x.id)?.map((x) => x.id);
    const filteredLocations =
      formModel?.locations?.filter(
        (x) => !rootLocations || rootLocations.length === 0 || !rootLocations.some((p) => p === x.locationUuid),
      ) ?? [];

    setFormModel({
      ...formModel,
      role: e.target.value,
      locations: filteredLocations,
    });
  };

  const isOperationChecked = (operationType: StockOperationType) => {
    return formModel?.operationTypes?.filter((x) => x.operationTypeUuid === operationType.uuid)?.length > 0;
  };

  const addStockUserRole = async (e) => {
    e.preventDefault();

    // Validation: ensure required fields are present
    const validationError = !formModel?.userUuid
      ? t('userRequired', 'User is required')
      : !formModel?.role
      ? t('roleRequired', 'Role is required')
      : !formModel?.permanent && (!formModel?.activeFrom || !formModel?.activeTo)
      ? t('activeDatesRequired', 'Active From and Active To are required unless the scope is permanent')
      : !formModel?.operationTypes?.length
      ? t('operationTypeRequired', 'Select at least one stock operation')
      : !formModel?.locations?.length
      ? t('selectAtLeastOneLocation', 'Select at least one location')
      : null;

    if (validationError) {
      showSnackbar({
        title: t('errorSavingUserRoleScope', 'Error Saving user role scope'),
        kind: 'error',
        isLowContrast: true,
        subtitle: validationError,
      });
      return;
    }

    createOrUpdateUserRoleScope(formModel).then(
      (response) => {
        handleMutate(`${restBaseUrl}/stockmanagement/userrolescope`);
        showSnackbar({
          isLowContrast: true,
          title: t('addUserRole', 'Add User role'),
          kind: 'success',
          subtitle: t('successfullySaved', 'You have successfully saved user role scope'),
        });
        closeWorkspace();
      },
      (err) => {
        showSnackbar({
          title: t('errorSavingUserRoleScope', 'Error Saving user role scope'),
          kind: 'error',
          isLowContrast: true,
          subtitle: err?.message ?? err?.cause ?? t('unknownError', 'An unknown error occurred'),
        });
      },
    );
  };

  if (isLoading || loadingRoles || isLoadingStockLocations) {
    return (
      <Workspace2 title={title}>
        <InlineLoading status="active" iconDescription="Loading" description={t('loadingData', 'Loading data...')} />
      </Workspace2>
    );
  }

  return (
    <Workspace2 title={title}>
      <Form className={styles.container} onSubmit={addStockUserRole}>
        <Stack className={styles.form} gap={5}>
          <div>
            <FormGroup legendText={t('user', 'User')}>
              {isEditing ? (
                <TextInput
                  id="userName"
                  labelText={t('user', 'User')}
                  readOnly
                  size="md"
                  value={`${model?.userFamilyName ?? ''} ${model?.userGivenName ?? ''}`.trim() || model?.userName}
                />
              ) : (
                <ComboBox
                  id="userName"
                  items={usersResults}
                  itemToString={(item) => {
                    if (!item || typeof item !== 'object') return '';
                    const itemWithPerson = item as { person?: { display?: string }; display?: string };
                    return `${itemWithPerson?.person?.display ?? itemWithPerson?.display ?? ''}`;
                  }}
                  titleText={t('user', 'User')}
                  onChange={onUserChanged}
                  onInputChange={debouncedSearch}
                  placeholder={t('searchUsers', 'Search users')}
                  shouldFilterItem={() => true}
                  size="md"
                />
              )}
            </FormGroup>
          </div>
          <Select
            id="select-role"
            helperText={
              user?.uuid && roleOptions.length === 0 ? t('noStockRoles', 'This user has no stock roles') : undefined
            }
            labelText={t('role', 'Role')}
            name="role"
            onChange={onRoleChange}
            value={formModel.role}
          >
            <SelectItem value={''} text={t('chooseARole', 'Choose a role')} />
            {editMode ? (
              <SelectItem key={formModel?.role} value={formModel?.role} text={formModel?.role} />
            ) : (
              roleOptions.map((role) => {
                return <SelectItem key={role} value={role} text={role} />;
              })
            )}
          </Select>
          <CheckboxGroup className={styles.checkboxGrid} legendText="">
            <Checkbox
              checked={formModel?.enabled}
              id="chk-userEnabled"
              labelText={t('enabled', 'Enabled')}
              onChange={onEnabledChanged}
              value={model?.enabled ? 'true' : 'false'}
            />
            <Checkbox
              checked={formModel?.permanent}
              id="chk-userPermanent"
              labelText={t('permanent', 'Permanent')}
              name="isPermanent"
              onChange={onPermanentChanged}
              value={model?.permanent ? 'true' : 'false'}
            />

            {!formModel?.permanent && (
              <DatePicker
                dateFormat={DATE_PICKER_CONTROL_FORMAT}
                datePickerType="range"
                light
                locale="en"
                minDate={formatForDatePicker(minActiveDate)}
                onChange={onActiveDatesChange}
                value={activeDates}
              >
                <DatePickerInput
                  id="date-picker-input-id-start"
                  labelText={t('activeFrom', 'Active From')}
                  placeholder={DATE_PICKER_FORMAT}
                />
                <DatePickerInput
                  id="date-picker-input-id-finish"
                  labelText={t('activeTo', 'Active To')}
                  placeholder={DATE_PICKER_FORMAT}
                />
              </DatePicker>
            )}
          </CheckboxGroup>
          <FormGroup legendText={t('stockOperations', 'Stock operations')}>
            <span className={styles.subTitle}>
              {t('roleDescription', 'The role will be applicable to only selected stock operations.')}
            </span>
          </FormGroup>
          <CheckboxGroup className={styles.checkboxGrid} legendText="">
            {stockOperations?.length > 0 &&
              stockOperations.map((type) => {
                return (
                  <div className={styles.flexRow}>
                    <Checkbox
                      checked={isOperationChecked(type)}
                      className={styles.checkbox}
                      id={type.uuid}
                      labelText={type.name}
                      onChange={(event) => onStockOperationTypeChanged(event)}
                      value={type.uuid}
                    />
                  </div>
                );
              })}
          </CheckboxGroup>
          <FormGroup legendText={t('locations', 'Locations')}>
            <span className={styles.subTitle}>
              {t('toggleMessage', 'Use the toggle to apply this scope to the locations under the selected location.')}
            </span>
          </FormGroup>
          <CheckboxGroup className={styles.checkboxGrid} legendText="">
            {stockLocations?.length > 0 &&
              stockLocations.map((type) => {
                const checkedLocation = findCheckedLocation(type);

                const getToggledValue = (locationUuid) => {
                  const location = checkedLocation?.locationUuid === locationUuid ? checkedLocation : null;
                  return location?.enableDescendants === true;
                };

                return (
                  <div className={styles.flexRow}>
                    <Checkbox
                      checked={checkedLocation != null}
                      className={styles.checkbox}
                      id={`chk-loc-child-${type.id}`}
                      key={`chk-loc-child-key-${type.id}`}
                      labelText={type.name}
                      name="location"
                      onChange={(event) => onLocationCheckBoxChanged(event)}
                      value={type.id}
                    />
                    {checkedLocation && (
                      <>
                        <span className="cds--visually-hidden" id={`tg-loc-child-label-${type.id}`}>
                          {t('applyToChildLocations', 'Apply to child locations')}
                        </span>
                        <Toggle
                          aria-labelledby={`tg-loc-child-label-${type.id}`}
                          className={styles.toggle}
                          hideLabel
                          id={`tg-loc-child-${type.id}`}
                          key={`tg-loc-child-key-${type.id}`}
                          onToggle={(checked) => onEnableDescendantsToggled(type.id, checked)}
                          toggled={getToggledValue(type.id)}
                          size="sm"
                        />
                      </>
                    )}
                  </div>
                );
              })}
          </CheckboxGroup>
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
          <Button type="submit" className={styles.button} renderIcon={Save}>
            {getCoreTranslation('save')}
          </Button>
        </ButtonSet>
      </Form>
    </Workspace2>
  );
};

export default AddStockUserRoleScope;
