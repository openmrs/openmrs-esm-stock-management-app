import React, { useCallback } from 'react';
import { Button } from '@carbon/react';
import { useStockOperationTypes } from '../../stock-lookups/stock-lookups.resource';
import { launchStockoperationAddOrEditWorkSpace } from '../stock-operation.utils';
import { useStockOperationAndItems } from '../stock-operations.resource';

interface StockOperationRelatedLinkProps {
  stockOperationUuid: string;
  operationNumber: string;
}

const StockOperationRelatedLink: React.FC<StockOperationRelatedLinkProps> = ({
  stockOperationUuid,
  operationNumber,
}) => {
  const { error, isLoading, types } = useStockOperationTypes();
  const {
    error: stockOperationError,
    isLoading: isStockOperationLoading,
    items: stockOperation,
  } = useStockOperationAndItems(stockOperationUuid);

  const handleEdit = useCallback(() => {
    const operationType = types?.results?.find((op) => op?.uuid === stockOperation?.operationTypeUuid);
    if (!operationType) {
      return;
    }
    launchStockoperationAddOrEditWorkSpace(
      operationType,
      stockOperation,
      stockOperation?.requisitionStockOperationUuid,
    );
  }, [types, stockOperation]);

  if (isLoading || error || stockOperationError || isStockOperationLoading) return null;
  return (
    <Button kind="ghost" onClick={handleEdit} size="sm">
      {operationNumber}
    </Button>
  );
};

export default StockOperationRelatedLink;
