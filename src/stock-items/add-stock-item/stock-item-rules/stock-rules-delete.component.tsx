import React, { useState } from 'react';
import { Button, InlineLoading } from '@carbon/react';
import { useTranslation } from 'react-i18next';
import { TrashCan } from '@carbon/react/icons';
import { deleteStockRule } from '../../stock-items.resource';
import { restBaseUrl, showModal, showSnackbar } from '@openmrs/esm-framework';
import { extractErrorMessagesFromResponse } from '../../../constants';
import { useHandleMutate } from '../../../utils';

interface StockRulesDeleteActionMenuProps {
  uuid: string;
  name?: string;
}

const StockRulesDeleteActionMenu: React.FC<StockRulesDeleteActionMenuProps> = ({ uuid, name }) => {
  const { t } = useTranslation();
  const handleMutate = useHandleMutate();

  const [deletingRule, setDeletingRule] = useState(false);

  const handleDeleteStockRule = React.useCallback(() => {
    const close = showModal('delete-stock-rule-modal', {
      close: () => close(),
      uuid: uuid,
      // `name` is taken: the framework passes the modal's own name to every modal
      ruleName: name,
      onConfirmation: () => {
        setDeletingRule(true);
        deleteStockRule(uuid)
          .then(
            () => {
              setDeletingRule(false);
              handleMutate(`${restBaseUrl}/stockmanagement/stockrule`);
              showSnackbar({
                isLowContrast: true,
                title: t('deletingRule', 'Delete Rule'),
                kind: 'success',
                subtitle: t('stockRuleDeletedSuccessfully', 'Stock Rule Deleted Successfully'),
              });
            },
            (error) => {
              setDeletingRule(false);
              showSnackbar({
                title: t('errorDeletingRule', 'Error deleting a rule'),
                kind: 'error',
                isLowContrast: true,
                subtitle: extractErrorMessagesFromResponse(error).join(', '),
              });
            },
          )
          .catch();
        close();
      },
    });
  }, [t, uuid, name, handleMutate]);

  const deleteButton = (
    <Button
      kind="ghost"
      size="md"
      onClick={handleDeleteStockRule}
      iconDescription={t('deleteRule', 'Delete Rule')}
      renderIcon={(props) => <TrashCan size={16} {...props} />}
    />
  );

  return deletingRule ? <InlineLoading /> : deleteButton;
};

export default StockRulesDeleteActionMenu;
