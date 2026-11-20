import { Button } from '@carbon/react';
import { Edit } from '@carbon/react/icons';
import React, { useCallback } from 'react';

import { useWorkspace2Context } from '@openmrs/esm-framework';
import { useTranslation } from 'react-i18next';
import { type StockRule } from '../../../core/api/types/stockItem/StockRule';

interface EditStockRulesActionMenuProps {
  data?: StockRule;
  stockItemUuid?: string;
}

const EditStockRuleActionsMenu: React.FC<EditStockRulesActionMenuProps> = ({ data, stockItemUuid }) => {
  const { t } = useTranslation();
  const { launchChildWorkspace } = useWorkspace2Context();
  const handleClick = useCallback(() => {
    launchChildWorkspace('stock-item-rules-form-workspace', { stockItemUuid, model: data });
  }, [data, launchChildWorkspace, stockItemUuid]);

  return (
    <Button
      kind="ghost"
      size="md"
      hasIconOnly
      onClick={() => handleClick()}
      iconDescription={t('editStockRule', 'Edit Stock Rule')}
      renderIcon={(props) => <Edit size={16} {...props} />}
    />
  );
};
export default EditStockRuleActionsMenu;
