import React, { type ReactNode } from 'react';
import { ComboBox, TextInputSkeleton } from '@carbon/react';
import { type Concept } from '../../../core/api/types/concept/Concept';
import { type Control, Controller, type FieldValues } from 'react-hook-form';
import { useConcept } from '../../../stock-lookups/stock-lookups.resource';
import { type ConfigObject } from '../../../config-schema';
import { type StockItemPackagingUOMDTO } from '../../../core/api/types/stockItem/StockItemPackagingUOM';
import { useConfig } from '@openmrs/esm-framework';

interface PackagingUnitsConceptSelectorProps<T> {
  row?: StockItemPackagingUOMDTO;
  onPackageUnitChange?: (unit: { uuid: string; display: string }) => void;
  title?: string;
  placeholder?: string;
  invalid?: boolean;
  invalidText?: ReactNode;

  // Control
  controllerName: string;
  name: string;
  control: Control<FieldValues, T>;
}

const PackagingUnitsConceptSelector = <T,>(props: PackagingUnitsConceptSelectorProps<T>) => {
  const { packingUnitsUUID } = useConfig<ConfigObject>();

  const { items: conceptSet, isLoading } = useConcept(packingUnitsUUID);

  // deployments may model the units either as a question concept (its answers) or as a
  // concept set (its set members); also tolerate a failed lookup with an empty list
  const unitOptions = conceptSet?.answers?.length ? conceptSet.answers : conceptSet?.setMembers ?? [];

  if (isLoading) return <TextInputSkeleton />;

  return (
    <Controller
      name={props.controllerName}
      control={props.control}
      render={({ field: { onChange } }) => (
        <ComboBox
          titleText={props.title}
          id={`${props.name}-${props.row.id}-${props.row.uuid}`}
          size="md"
          items={
            props.row?.packagingUomUuid
              ? [
                  ...(unitOptions.some((x) => x.uuid === props.row?.packagingUomUuid)
                    ? []
                    : [
                        {
                          uuid: props.row?.packagingUomUuid,
                          display: props.row?.packagingUomName,
                        },
                      ]),
                  ...unitOptions,
                ]
              : unitOptions
          }
          onChange={(data: { selectedItem: { uuid: string; display: string } }) => {
            props.onPackageUnitChange?.(data?.selectedItem);
            onChange(data?.selectedItem?.uuid || ''); // Provide a default value if needed
          }}
          initialSelectedItem={
            props.row?.packagingUomUuid
              ? {
                  uuid: props.row?.packagingUomUuid,
                  display: props.row?.packagingUomName,
                }
              : null
          }
          selectedItem={
            props.row?.packagingUomUuid
              ? {
                  uuid: props.row?.packagingUomUuid,
                  display: props.row?.packagingUomName,
                }
              : null
          }
          itemToString={(item?: Concept) => (item && item?.display ? `${item?.display}` : '')}
          shouldFilterItem={() => true}
          placeholder={props.placeholder}
          invalid={props.invalid}
          invalidText={props.invalidText}
        />
      )}
    />
  );
};

export default PackagingUnitsConceptSelector;
