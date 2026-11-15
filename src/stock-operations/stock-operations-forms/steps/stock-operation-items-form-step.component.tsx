import React, { useId, useMemo } from 'react';
import { ArrowLeft, ArrowRight, Edit, TrashCan } from '@carbon/react/icons';
import {
  Button,
  DataTable,
  InlineNotification,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableHeader,
  TableRow,
} from '@carbon/react';
import { useFormContext } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { type StockOperationDTO } from '../../../core/api/types/stockOperation/StockOperationDTO';
import { type StockOperationType } from '../../../core/api/types/stockOperation/StockOperationType';
import { getStockOperationUniqueId } from '../../stock-operation.utils';
import { type BaseStockOperationItemFormData, type StockOperationItemDtoSchema } from '../../validation-schema';
import useOperationTypePermisions from '../hooks/useOperationTypePermisions';
import StockItemSearch from '../input-components/stock-item-search.component';
import QuantityUomCell from './quantity-uom-cell.component';
import StockAvailability from './stock-availability-cell.component';
import StockOperationItemBatchNoCell from './stock-operation-item-batch-no-cell.component';
import StockOperationItemCell from './stock-operation-item-cell.component';
import StockoperationItemExpiryCell from './stock-operation-item-expiry-cell.component';
import { type CustomTableHeader } from '../../../core/components/table/types';
import styles from './stock-operation-items-form-step.scc.scss';

type StockOperationItemsFormStepProps = {
  stockOperation?: StockOperationDTO;
  stockOperationType: StockOperationType;
  onNext?: () => void;
  onPrevious?: () => void;
  onLaunchItemsForm?: (stockOperationItem?: BaseStockOperationItemFormData) => void;
};
const StockOperationItemsFormStep: React.FC<StockOperationItemsFormStepProps> = ({
  stockOperationType,
  stockOperation,
  onNext,
  onPrevious,
  onLaunchItemsForm,
}) => {
  const { t } = useTranslation();
  const operationTypePermision = useOperationTypePermisions(stockOperationType);
  const uniqueId = useId();

  const form = useFormContext<StockOperationItemDtoSchema>();
  const observableOperationItems = form.watch('stockOperationItems');
  const itemsError = form.formState.errors.stockOperationItems;
  const detailLabels: Record<string, string> = {
    batchNo: t('batchNo', 'Batch number'),
    stockBatchUuid: t('batchNo', 'Batch number'),
    expiration: t('expiration', 'Expiration date'),
    quantity: t('quantity', 'Quantity'),
    stockItemPackagingUOMUuid: t('quantityUom', 'Quantity unit of measurement'),
    purchasePrice: t('purchasePrice', 'Purchase Price'),
  };
  // The details a line is missing, from its validation errors
  const missingDetails = (index: number) =>
    Object.keys((Array.isArray(itemsError) ? itemsError[index] : undefined) ?? {}).map(
      (field) => detailLabels[field] ?? field,
    );
  const headers = useMemo(() => {
    return [
      {
        key: 'item',
        header: t('item', 'Item'),
        styles: { width: '40% !important' },
      },
      {
        key: 'itemDetails',
        header: t('itemDetails', 'Item Details'),
        styles: { width: '20% !important' },
      },
      ...(operationTypePermision.requiresBatchUuid || operationTypePermision.requiresActualBatchInfo
        ? [
            {
              key: 'batch',
              header: t('batchNo', 'Batch number'),
              styles: { width: '15% !important' },
            },
          ]
        : []),
      ...(operationTypePermision.requiresActualBatchInfo
        ? [
            {
              key: 'expiry',
              header: t('expiry', 'Expiry'),
            },
          ]
        : []),
      ...(operationTypePermision.requiresBatchUuid
        ? [
            {
              key: 'expiry',
              header: t('expiry', 'Expiry'),
            },
          ]
        : []),

      {
        key: 'quantity',
        header: t('quantity', 'Quantity'),
      },
      {
        key: 'quantityuom',
        header: t('quantityUom', 'Quantity unit of measurement'),
      },
      ...(operationTypePermision.canCaptureQuantityPrice
        ? [
            {
              key: 'purchasePrice',
              header: t('purchasePrice', 'Purchase Price'),
            },
          ]
        : []),
      { key: 'actions', header: t('actions', 'Actions') },
    ];
  }, [operationTypePermision, t]);

  const tableRows = useMemo(() => {
    return observableOperationItems?.map((item, index) => {
      const {
        batchNo,
        expiration,
        quantity,
        purchasePrice,
        uuid,
        stockItemUuid,
        stockItemPackagingUOMUuid,
        stockBatchUuid,
      } = item;

      return {
        id: uuid || `${uniqueId}-${index}`,
        item: stockItemUuid ? <StockOperationItemCell stockItemUuid={stockItemUuid} /> : '--',
        itemDetails: stockItemUuid ? <StockAvailability stockItemUuid={stockItemUuid} /> : '--',
        batch: (
          <StockOperationItemBatchNoCell
            operation={stockOperationType}
            stockBatchUuid={stockBatchUuid}
            batchNo={batchNo}
            stockItemUuid={stockItemUuid}
          />
        ),
        expiry: (
          <StockoperationItemExpiryCell
            operation={stockOperationType}
            stockBatchUuid={stockBatchUuid}
            expiration={expiration}
            stockItemUuid={stockItemUuid}
          />
        ),
        quantity: quantity?.toLocaleString(),
        quantityuom: stockItemPackagingUOMUuid ? (
          <QuantityUomCell stockItemPackagingUOMUuid={stockItemPackagingUOMUuid} stockItemUuid={stockItemUuid} />
        ) : (
          '--'
        ),
        purchasePrice: purchasePrice,
        actions: (
          <>
            <Button
              type="button"
              size="sm"
              className="submitButton clear-padding-margin"
              iconDescription={t('edit', 'Edit')}
              kind="ghost"
              renderIcon={Edit}
              onClick={() => {
                onLaunchItemsForm?.(item);
              }}
            />
            <Button
              type="button"
              size="sm"
              className="submitButton clear-padding-margin"
              iconDescription={t('delete', 'Delete')}
              kind="ghost"
              renderIcon={TrashCan}
              onClick={() => {
                onLaunchItemsForm?.(item);
              }}
            />
          </>
        ),
      };
    });
  }, [observableOperationItems, onLaunchItemsForm, stockOperationType, t, uniqueId]);

  // An invalid step shows its errors above the table and on the lines
  const handleNext = async () => {
    const valid = await form.trigger(['stockOperationItems']);
    if (valid) {
      onNext();
    }
  };

  const headerTitle = t('stockOperationItems', 'Stock operation items');

  return (
    <div style={{ margin: '10px' }}>
      <div className={styles.tableContainer}>
        <div className={styles.heading}>
          <h4>{headerTitle}</h4>
        </div>
        <StockItemSearch
          onSelectedItem={(stockItem) =>
            onLaunchItemsForm({
              uuid: `new-item-${getStockOperationUniqueId()}`,
              stockItemUuid: stockItem.uuid,
              hasExpiration: stockItem.hasExpiration,
              purchasePrice: stockItem.purchasePrice,
            })
          }
        />
        {itemsError && (
          <InlineNotification
            hideCloseButton
            kind="error"
            lowContrast
            role="alert"
            title={
              observableOperationItems?.length
                ? t('completeItemDetails', 'Complete the details of the items marked below')
                : t('addAtLeastOneItem', 'Add at least one item')
            }
          />
        )}
        <DataTable rows={tableRows ?? []} headers={headers} isSortable={false} useZebraStyles>
          {({ rows, headers, getTableProps, getHeaderProps, getRowProps }) => (
            <TableContainer>
              <Table {...getTableProps()}>
                <TableHead>
                  <TableRow>
                    {headers.map((header) => (
                      <TableHeader
                        {...getHeaderProps({
                          header,
                          isSortable: false,
                        })}
                        style={(header as CustomTableHeader)?.styles}
                        key={header.key}
                      >
                        {(() => {
                          const customHeader = header as CustomTableHeader;
                          return typeof customHeader.header === 'object' &&
                            customHeader.header !== null &&
                            'content' in customHeader.header
                            ? (customHeader.header.content as React.ReactNode)
                            : (customHeader.header as React.ReactNode);
                        })()}
                      </TableHeader>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {rows.map((row, index) => {
                    // Rows aren't sorted, so they're in the same order as the lines
                    const missing = missingDetails(index);
                    return (
                      <TableRow {...getRowProps({ row })} key={row.id}>
                        {row.cells.map((cell) => (
                          <TableCell key={cell.id}>
                            {cell.value}
                            {cell.info.header === 'item' && missing.length > 0 && (
                              <div className={styles.itemError}>
                                {t('itemMissingDetails', 'Missing: {{details}}', { details: missing.join(', ') })}
                              </div>
                            )}
                          </TableCell>
                        ))}
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </DataTable>
        <div className={styles.btnSet}>
          {typeof onNext === 'function' && (
            <Button kind="primary" onClick={handleNext} renderIcon={ArrowRight}>
              {t('nextButton', 'Next')}
            </Button>
          )}
          {typeof onPrevious === 'function' && (
            <Button
              kind="secondary"
              onClick={onPrevious}
              renderIcon={ArrowLeft}
              hasIconOnly
              data-testid="previous-btn"
              iconDescription={t('previousButton', 'Previous')}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default StockOperationItemsFormStep;
