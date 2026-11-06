import React, { useEffect } from 'react';
import { ComboBox, InlineNotification, SelectSkeleton, Column, TextInput } from '@carbon/react';
import { Controller, useFormContext } from 'react-hook-form';
import { getUserName } from '../../../core/utils/user-display';
import { useTranslation } from 'react-i18next';
import { type User } from '../../../core/api/types/identity/User';
import { useDebounce } from '../../../core/hooks/debounce-hook';
import { otherUser } from '../../../core/utils/utils';
import { useUser } from '../../../stock-lookups/stock-lookups.resource';
import useSearchUser from '../hooks/useSearchUser';
import UserOption from '../../../core/components/user-option/user-option.component';

const UsersSelector = () => {
  const { isLoading, userList, setSearchString, hasSearchTerm } = useSearchUser();
  const { t } = useTranslation();
  const debouncedSearch = useDebounce((query: string) => {
    setSearchString(query);
  }, 300);

  const form = useFormContext<{ responsiblePersonUuid: string; responsiblePersonOther: string }>();
  const observableresponsiblePersonUuid = form.watch('responsiblePersonUuid');
  const observableresponsiblePersonOther = form.watch('responsiblePersonOther');
  const {
    data,
    isLoading: isLoadingUser,
    error: userError,
  } = useUser(observableresponsiblePersonUuid ?? null, 'custom:(uuid,display,person:(uuid,display))');
  useEffect(() => {
    // Whenever person uuid changes and not equal to other person, the other is reset to initial default value
    if (observableresponsiblePersonUuid && observableresponsiblePersonUuid !== otherUser.uuid) {
      form.resetField('responsiblePersonOther');
    }
  }, [observableresponsiblePersonUuid, form]);

  if (isLoadingUser && observableresponsiblePersonUuid !== otherUser.uuid && observableresponsiblePersonUuid)
    return <SelectSkeleton role="progressbar" />;

  if (observableresponsiblePersonUuid && observableresponsiblePersonUuid !== otherUser.uuid && userError)
    return (
      <InlineNotification
        lowContrast
        title={t('responsiblePersonError', 'Error loading responsible person')}
        subtitle={userError?.message}
      />
    );

  const searchHelperText = isLoading
    ? t('searchingUsers', 'Searching users...')
    : !hasSearchTerm
    ? t('typeToSearchUsers', 'Type a name or username to search')
    : (userList ?? []).length === 0
    ? t('noUsersFound', 'No users found')
    : undefined;

  return (
    <React.Fragment>
      <Column>
        <Controller
          name={'responsiblePersonUuid'}
          control={form.control}
          render={({ field, fieldState: { error } }) => (
            <ComboBox
              readOnly={field.disabled}
              titleText={t('responsiblePerson', 'Responsible Person')}
              name={'responsiblePersonUuid'}
              id={'responsiblePersonUuid'}
              size="lg"
              items={[...(userList || []), otherUser]}
              onChange={(data: { selectedItem: User }) => {
                field.onChange(data.selectedItem?.uuid);
              }}
              initialSelectedItem={
                field.value
                  ? field.value === otherUser.uuid
                    ? otherUser
                    : data
                  : observableresponsiblePersonOther && !observableresponsiblePersonUuid
                  ? otherUser
                  : null
              }
              itemToString={(item) => (typeof item === 'string' ? item : getUserName(item))}
              itemToElement={UserOption}
              shouldFilterItem={() => true}
              helperText={searchHelperText}
              onInputChange={debouncedSearch}
              placeholder={t('filter', 'Filter...')}
              invalid={!!error?.message}
              invalidText={error?.message}
              ref={field.ref}
            />
          )}
        />
      </Column>
      {(observableresponsiblePersonUuid === otherUser.uuid ||
        (observableresponsiblePersonOther && !observableresponsiblePersonUuid)) && (
        <Column>
          <Controller
            control={form.control}
            name="responsiblePersonOther"
            render={({ field, fieldState: { error } }) => (
              <TextInput
                {...field}
                readOnly={field.disabled}
                disabled={false}
                id="responsiblePersonOther"
                name="responsiblePersonOther"
                size="lg"
                labelText={t('responsiblePerson', 'Responsible Person')}
                placeholder={t('pleaseSpecify', 'Please specify')}
                invalid={!!error?.message}
                invalidText={error?.message}
              />
            )}
          />
        </Column>
      )}
    </React.Fragment>
    // {isLoading && <InlineLoading status="active" iconDescription="Searching" description="Searching..." />}
  );
};

export default UsersSelector;
