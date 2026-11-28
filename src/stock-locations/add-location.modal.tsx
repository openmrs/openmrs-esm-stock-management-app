import React, { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { showSnackbar } from '@openmrs/esm-framework';
import { saveLocation } from './stock-locations-table.resource';
import { type locationData } from '../stock-items/types';
import { extractErrorMessagesFromResponse } from '../constants';
import LocationAdministrationForm from './location-admin-form.component';

interface LocationFormProps {
  close: () => void;
  mutate: () => void;
}

const NewLocationForm: React.FC<LocationFormProps> = ({ close, mutate }) => {
  const { t } = useTranslation();
  const headerTitle = t('addLocation', 'Create new Location');

  const initialData: locationData = {
    uuid: '',
    name: '',
    tags: [],
  };

  const handleCreateQuestion = useCallback(
    (formData: locationData) => {
      const { name, tags } = formData;

      const locationbject = {
        name,
        tags,
      };
      return saveLocation({ locationPayload: locationbject })
        .then(() => {
          showSnackbar({
            title: t('locationCreatedTitle', 'Location created'),
            kind: 'success',
            isLowContrast: true,
            subtitle: t('locationCreatedSuccessfully', 'Location {{locationName}} was created successfully.', {
              locationName: name,
            }),
          });

          mutate();
          close();
        })
        .catch((error) => {
          const errorMessages = extractErrorMessagesFromResponse(
            error,
            t(
              'unexpectedErrorMessage',
              'An unexpected error occurred. Please try again or contact support if the problem persists.',
            ),
          );
          showSnackbar({
            title: t('errorCreatingForm', 'Error creating location'),
            kind: 'error',
            isLowContrast: true,
            subtitle: errorMessages.join(', '),
          });
        });
    },
    [close, mutate, t],
  );

  return (
    <LocationAdministrationForm
      close={close}
      handleCreateQuestion={handleCreateQuestion}
      headerTitle={headerTitle}
      initialData={initialData}
    />
  );
};
export default NewLocationForm;
