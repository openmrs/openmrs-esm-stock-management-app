import React, { useMemo } from 'react';
import { Dropdown } from '@carbon/react';
import { useTranslation } from 'react-i18next';
import { useStockRules } from './stock-rules.resource';
import { ResourceRepresentation } from '../../../core/api/api';
import styles from './stock-rules-filter.scss';

export type StockRuleStatusFilter = 'all' | 'enabled' | 'disabled';

interface StockRulesFilterProps {
  stockItemUuid: string;
  selectedLocationUuid: string;
  selectedStatus: StockRuleStatusFilter;
  onLocationChange: (locationUuid: string) => void;
  onStatusChange: (status: StockRuleStatusFilter) => void;
}

const StockRulesFilter: React.FC<StockRulesFilterProps> = ({
  stockItemUuid,
  selectedLocationUuid,
  selectedStatus,
  onLocationChange,
  onStatusChange,
}) => {
  const { t } = useTranslation();
  // All of the item's rules, so the location list doesn't shrink to the one selected
  const { items } = useStockRules({ v: ResourceRepresentation.Default, stockItemUuid });

  const locations = useMemo(() => {
    const allLocations = { uuid: '', name: t('allLocations', 'All locations') };
    const ruleLocations = (items?.results ?? []).reduce<Array<{ uuid: string; name: string }>>((unique, rule) => {
      if (rule.locationUuid && !unique.some((location) => location.uuid === rule.locationUuid)) {
        unique.push({ uuid: rule.locationUuid, name: rule.locationName });
      }
      return unique;
    }, []);
    return [allLocations, ...ruleLocations];
  }, [items, t]);

  const statuses: Array<{ id: StockRuleStatusFilter; text: string }> = [
    { id: 'all', text: t('allStatuses', 'All statuses') },
    { id: 'enabled', text: t('enabled', 'Enabled') },
    { id: 'disabled', text: t('disabled', 'Disabled') },
  ];

  return (
    <div className={styles.filterContainer}>
      <Dropdown
        id="stockRulesLocationFilter"
        items={locations}
        itemToString={(item) => item?.name ?? ''}
        label=""
        onChange={({ selectedItem }) => onLocationChange(selectedItem?.uuid ?? '')}
        selectedItem={locations.find((location) => location.uuid === selectedLocationUuid) ?? locations[0]}
        size="sm"
        titleText={t('location', 'Location')}
        type="inline"
      />
      <Dropdown
        id="stockRulesStatusFilter"
        items={statuses}
        itemToString={(item) => item?.text ?? ''}
        label=""
        onChange={({ selectedItem }) => onStatusChange(selectedItem?.id ?? 'all')}
        selectedItem={statuses.find((status) => status.id === selectedStatus)}
        size="sm"
        titleText={t('status', 'Status')}
        type="inline"
      />
    </div>
  );
};

export default StockRulesFilter;
