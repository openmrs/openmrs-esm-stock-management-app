import React, { useEffect, useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { DropdownSkeleton, MultiSelect } from '@carbon/react';
import { getStockOperationTypes, useConcept } from '../stock-lookups/stock-lookups.resource';
import { StockFilters } from '../constants';
import { StockOperationStatusTypes } from '../core/api/types/stockOperation/StockOperationStatus';
import styles from '../stock-items/stock-items-table.scss';

interface StockOperationFiltersProps {
  conceptUuid?: string;
  filterName: string;
  onFilterChange: (selectedItems: any[], filterType: string) => void;
}

const StockOperationsFilters: React.FC<StockOperationFiltersProps> = ({ conceptUuid, onFilterChange, filterName }) => {
  const { t } = useTranslation();
  const { items, isLoading } = useConcept(conceptUuid);
  const [isDataLoading, setIsDataLoading] = useState(false);
  const [dataItems, setDataItems] = useState([]);

  const statusLabels = useMemo<Record<string, string>>(() => {
    return {
      NEW: t('new', 'New'),
      SUBMITTED: t('submitted', 'Submitted'),
      DISPATCHED: t('dispatched', 'Dispatched'),
      RETURNED: t('returned', 'Returned'),
      COMPLETED: t('completed', 'Completed'),
      CANCELLED: t('cancelled', 'Cancelled'),
      REJECTED: t('rejected', 'Rejected'),
    };
  }, [t]);

  useEffect(() => {
    setIsDataLoading(true);
    switch (filterName) {
      case StockFilters.STATUS:
        setDataItems(
          StockOperationStatusTypes.map((option) => ({
            uuid: option,
            display: statusLabels[option] ?? option,
          })),
        );
        break;
      case StockFilters.SOURCES:
        if (items?.answers?.length) {
          setDataItems([...items.answers]);
          setIsDataLoading(isLoading);
        }

        break;
      case StockFilters.OPERATION:
        getStockOperationTypes().then((response) => {
          setIsDataLoading(true);
          if (response.data?.results.length) {
            setDataItems(
              response.data.results.map((result) => ({
                uuid: result.uuid,
                display: result.name,
              })),
            );
          }

          setIsDataLoading(false);
        });
    }
    setIsDataLoading(false);
  }, [filterName, isLoading, items.answers, statusLabels]);

  if (isDataLoading) {
    return <DropdownSkeleton />;
  }

  return (
    <MultiSelect
      autoAlign
      className={styles.filtersAlign}
      disabled={!dataItems.length}
      id="multiSelect"
      label={filterName}
      labelInline
      items={dataItems}
      itemToString={(item) => (item ? item.display : t('notSet', 'Not Set'))}
      onChange={({ selectedItems }) => {
        if (selectedItems) {
          onFilterChange(
            selectedItems.map((selectedItem) => selectedItem.uuid),
            filterName,
          );
        }
      }}
      placeholder={t('filterBy', 'Filter by {{filterName}}', { filterName })}
    />
  );
};

export default StockOperationsFilters;
