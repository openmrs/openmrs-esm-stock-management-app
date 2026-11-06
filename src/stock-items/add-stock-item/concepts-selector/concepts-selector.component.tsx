import React, { type ReactNode, useState } from 'react';
import { ComboBox, InlineLoading } from '@carbon/react';
import { type Control, Controller, type FieldValues } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { useDebounce } from '@openmrs/esm-framework';
import { type Concept } from '../../../core/api/types/concept/Concept';
import { useNonDrugConcepts } from './concepts-selector.resource';

interface ConceptsSelectorProps<T> {
  conceptUuid?: string;
  control: Control<FieldValues, T>;
  controllerName: string;
  initialConceptName?: string;
  invalid?: boolean;
  invalidText?: ReactNode;
  name: string;
  onConceptUuidChange?: (unit: Concept) => void;
  placeholder?: string;
  title?: string;
}

const ConceptsSelector = <T,>(props: ConceptsSelectorProps<T>) => {
  const { t } = useTranslation();
  const [inputValue, setInputValue] = useState('');
  const debouncedInputValue = useDebounce(inputValue);
  const { concepts, isLoading } = useNonDrugConcepts(debouncedInputValue);
  const [selectedConcept, setSelectedConcept] = useState<Concept | null>(null);

  return (
    <div>
      <Controller
        control={props.control}
        name={props.controllerName}
        render={({ field: { onChange, value, ref } }) => {
          // The selected concept has to stay selectable when a later search doesn't return it
          const current =
            selectedConcept?.uuid === value
              ? selectedConcept
              : value && props.initialConceptName
              ? ({ uuid: value, display: props.initialConceptName } as Concept)
              : null;
          const items =
            current && !concepts.some((concept) => concept.uuid === current.uuid) ? [current, ...concepts] : concepts;

          return (
            <ComboBox
              id={props.name}
              invalid={props.invalid}
              invalidText={props.invalidText}
              items={items}
              itemToString={(item?: Concept) => item?.display ?? ''}
              name={props.name}
              onChange={(data: { selectedItem: Concept | null | undefined }) => {
                setSelectedConcept(data.selectedItem ?? null);
                if (data.selectedItem) {
                  props.onConceptUuidChange?.(data.selectedItem);
                  onChange(data.selectedItem.uuid);
                } else {
                  onChange('');
                }
              }}
              onInputChange={setInputValue}
              placeholder={props.placeholder}
              ref={ref}
              selectedItem={items.find((concept) => concept.uuid === value) ?? null}
              shouldFilterItem={() => true}
              size="md"
              titleText={props.title}
            />
          );
        }}
      />
      {isLoading && (
        <InlineLoading
          status="active"
          iconDescription={t('searching', 'Searching...')}
          description={t('searching', 'Searching...')}
        />
      )}
    </div>
  );
};

export default ConceptsSelector;
