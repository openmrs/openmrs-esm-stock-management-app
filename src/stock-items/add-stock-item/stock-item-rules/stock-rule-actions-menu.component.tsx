import React, { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { InlineLoading, OverflowMenu, OverflowMenuItem } from '@carbon/react';
import { showModal, showSnackbar, useWorkspace2Context } from '@openmrs/esm-framework';
import { type StockRule } from '../../../core/api/types/stockItem/StockRule';
import { deleteStockRule } from '../../stock-items.resource';

interface StockRuleActionsMenuProps {
  data: StockRule;
  stockItemUuid: string;
}

const StockRuleActionsMenu: React.FC<StockRuleActionsMenuProps> = ({ data, stockItemUuid }) => {
  const { t } = useTranslation();
  const { launchChildWorkspace } = useWorkspace2Context();
  const [deletingRule, setDeletingRule] = useState(false);

  const handleEdit = useCallback(() => {
    launchChildWorkspace('stock-item-rules-form-workspace', { stockItemUuid, model: data });
  }, [data, launchChildWorkspace, stockItemUuid]);

  const handleDelete = useCallback(() => {
    const close = showModal('delete-stock-rule-modal', {
      close: () => close(),
      uuid: data.uuid,
      onConfirmation: () => {
        setDeletingRule(true);
        deleteStockRule(data.uuid)
          .then(
            () => {
              setDeletingRule(false);
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
                subtitle: error?.message,
              });
            },
          )
          .catch();
        close();
      },
    });
  }, [data.uuid, t]);

  if (deletingRule) {
    return <InlineLoading />;
  }

  return (
    <OverflowMenu
      aria-label={t('stockRuleActions', 'Stock rule actions')}
      iconDescription={t('stockRuleActions', 'Stock rule actions')}
      flipped
      size="md"
    >
      <OverflowMenuItem itemText={t('editStockRule', 'Edit Stock Rule')} onClick={handleEdit} />
      <OverflowMenuItem isDelete itemText={t('deleteRule', 'Delete Rule')} onClick={handleDelete} />
    </OverflowMenu>
  );
};

export default StockRuleActionsMenu;
