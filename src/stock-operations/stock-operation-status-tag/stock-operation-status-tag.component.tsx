import React from 'react';
import { Tag } from '@carbon/react';
import { useTranslation } from 'react-i18next';
import {
  StockOperationStatusNew,
  StockOperationStatusSubmitted,
  StockOperationStatusDispatched,
  StockOperationStatusReturned,
  StockOperationStatusCompleted,
  StockOperationStatusCancelled,
  StockOperationStatusRejected,
} from '../../core/api/types/stockOperation/StockOperationStatus';

interface StockOperationStatusTagProps {
  status?: string | null;
}

const StockOperationStatusTag: React.FC<StockOperationStatusTagProps> = ({ status }) => {
  const { t } = useTranslation();

  const config = {
    [StockOperationStatusNew]: { label: t('new', 'New'), type: 'gray' },
    [StockOperationStatusSubmitted]: { label: t('submitted', 'Submitted'), type: 'blue' },
    [StockOperationStatusDispatched]: { label: t('dispatched', 'Dispatched'), type: 'cyan' },
    [StockOperationStatusReturned]: { label: t('returned', 'Returned'), type: 'magenta' },
    [StockOperationStatusCompleted]: { label: t('completed', 'Completed'), type: 'green' },
    [StockOperationStatusCancelled]: { label: t('cancelled', 'Cancelled'), type: 'warm-gray' },
    [StockOperationStatusRejected]: { label: t('rejected', 'Rejected'), type: 'red' },
  } as const;

  if (!status) return null;

  const entry = config[status as keyof typeof config];
  return (
    <Tag type={entry?.type ?? 'gray'} size="md">
      {entry?.label ?? status}
    </Tag>
  );
};

export default StockOperationStatusTag;
