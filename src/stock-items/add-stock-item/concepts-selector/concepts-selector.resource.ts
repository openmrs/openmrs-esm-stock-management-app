import { useMemo } from 'react';
import { useConfig } from '@openmrs/esm-framework';
import { type ResourceRepresentation } from '../../../core/api/api';
import { type ConfigObject } from '../../../config-schema';
import { type Concept } from '../../../core/api/types/concept/Concept';
import { type ConceptFilterCriteria, useConcepts } from '../../../stock-lookups/stock-lookups.resource';

const MEDICAL_SUPPLY_CLASS = 'Medical supply';
const CONCEPT_REPRESENTATION = 'custom:(uuid,display,conceptClass:(name))' as unknown as ResourceRepresentation;

// Class filtering happens after the search, so without a set more results are needed to find enough matches
const SEARCH_LIMIT_IN_SET = 20;
const SEARCH_LIMIT_BY_CLASS = 50;

type ConceptWithClass = Concept & { conceptClass?: { name?: string } };

export function useNonDrugConcepts(searchTerm: string) {
  const { nonDrugItemsConceptSetUUID } = useConfig<ConfigObject>();
  const q = searchTerm.trim();

  const filter: ConceptFilterCriteria = {
    v: CONCEPT_REPRESENTATION,
    q,
    limit: nonDrugItemsConceptSetUUID ? SEARCH_LIMIT_IN_SET : SEARCH_LIMIT_BY_CLASS,
    ...(nonDrugItemsConceptSetUUID ? { memberOf: nonDrugItemsConceptSetUUID } : {}),
  };

  const {
    items: { results },
    isLoading,
  } = useConcepts(filter, q.length > 0);

  // The REST concept search ignores its class parameter, so the class is checked here
  const concepts = useMemo(
    () =>
      nonDrugItemsConceptSetUUID
        ? results
        : results?.filter((concept: ConceptWithClass) => concept.conceptClass?.name === MEDICAL_SUPPLY_CLASS),
    [results, nonDrugItemsConceptSetUUID],
  );

  return { concepts: concepts ?? [], isLoading };
}
