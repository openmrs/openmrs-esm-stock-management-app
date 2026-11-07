import React from 'react';
import { useTranslation } from 'react-i18next';
import { ConfigurableLink } from '@openmrs/esm-framework';

const Item = () => {
  const { t } = useTranslation();

  return (
    <ConfigurableLink to={'${openmrsSpaBase}/stock-management'}>
      {t('stockManagement', 'Stock management')}
    </ConfigurableLink>
  );
};
export default Item;
