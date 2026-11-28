import React, { type ReactNode } from 'react';
import { ComboBox, TextInputSkeleton } from '@carbon/react';
import { type Control, Controller, type FieldValues } from 'react-hook-form';
import { type StockSource } from '../../../core/api/types/stockOperation/StockSource';
import { useStockSources } from '../../../stock-sources/stock-sources.resource';
import { ResourceRepresentation } from '../../../core/api/api';

interface StockSourceSelectorProps<T> {
  onSourceChange?: (unit: StockSource) => void;
  title?: string;
  placeholder?: string;
  invalid?: boolean;
  invalidText?: ReactNode;

  // Control
  controllerName: string;
  name: string;
  control: Control<FieldValues, T>;
}

const StockSourceSelector = <T,>(props: StockSourceSelectorProps<T>) => {
  const {
    items: { results: sourcesList },
    isLoading,
  } = useStockSources({
    v: ResourceRepresentation.Default,
  });
  if (isLoading) return <TextInputSkeleton />;

  return (
    <Controller
      name={props.controllerName}
      control={props.control}
      render={({ field: { onChange, value, ref } }) => (
        <ComboBox
          titleText={props.title}
          id={props.name}
          size={'md'}
          items={sourcesList || []}
          onChange={(data: { selectedItem: StockSource | null | undefined }) => {
            props.onSourceChange?.(data.selectedItem);
            onChange(data.selectedItem?.uuid ?? '');
          }}
          selectedItem={sourcesList?.find((p) => p.uuid === value) ?? null}
          itemToString={(item?: StockSource) => item?.name ?? ''}
          shouldFilterItem={() => true}
          placeholder={props.placeholder}
          ref={ref}
          invalid={props.invalid}
          invalidText={props.invalidText}
        />
      )}
    />
  );
};

export default StockSourceSelector;
