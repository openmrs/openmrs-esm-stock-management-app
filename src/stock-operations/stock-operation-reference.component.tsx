import { Button, InlineLoading } from '@carbon/react';
import { showSnackbar } from '@openmrs/esm-framework';
import React, { useCallback, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useStockOperationTypes } from '../stock-lookups/stock-lookups.resource';
import { launchStockoperationAddOrEditWorkSpace } from './stock-operation.utils';
import { useStockOperationAndItems } from './stock-operations.resource';

interface StockOperationReferenceProps {
  operationUuid: string;
  operationNumber: string;
}

const StockOperationReference = ({ operationNumber, operationUuid }: StockOperationReferenceProps) => {
  const { t } = useTranslation();
  const { types, isLoading: istypesLoading, error: typesError } = useStockOperationTypes();
  const {
    items: stockOperation,
    error: stockOperationError,
    isLoading: isStockOperationloading,
  } = useStockOperationAndItems(operationUuid ?? null);

  const handleEdit = useCallback(() => {
    const operationType = types.results?.find((op) => op?.uuid === stockOperation?.operationTypeUuid);
    if (!operationType) {
      return;
    }
    launchStockoperationAddOrEditWorkSpace(
      operationType,
      stockOperation,
      stockOperation?.requisitionStockOperationUuid,
    );
  }, [stockOperation, types.results]);

  useEffect(() => {
    if (stockOperationError) {
      showSnackbar({
        title: t('errorLoadingStockOperation', 'Error loading stock operation'),
        subtitle: stockOperationError?.message,
        kind: 'error',
      });
    }
    if (typesError) {
      showSnackbar({
        title: t('errorLoadingStockOperationTypes', 'Error loading stock operation types'),
        subtitle: typesError?.message,
        kind: 'error',
      });
    }
  }, [stockOperationError, typesError, t]);

  if (istypesLoading || isStockOperationloading) {
    return <InlineLoading description={t('loading', 'Loading')} />;
  }

  return (
    <Button kind="ghost" onClick={handleEdit} size="sm">
      {operationNumber}
    </Button>
  );
};

export default StockOperationReference;
