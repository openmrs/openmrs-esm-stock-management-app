import { useConfig } from '@openmrs/esm-framework';
import { type ResourceRepresentation } from '../../../core/api/api';
import { type ConfigObject } from '../../../config-schema';
import { type ConceptFilterCriteria, useConcepts } from '../../../stock-lookups/stock-lookups.resource';

const CONCEPT_REPRESENTATION = 'custom:(uuid,display)' as unknown as ResourceRepresentation;
const SEARCH_LIMIT = 20;

export function useNonDrugConcepts(searchTerm: string) {
  const { nonDrugItemsConceptSetUUID, nonDrugItemsConceptClassUUID } = useConfig<ConfigObject>();
  const q = searchTerm.trim();

  // Without a set, search by name, as that search filters by class on the server; q ignores class
  const filter: ConceptFilterCriteria = nonDrugItemsConceptSetUUID
    ? { v: CONCEPT_REPRESENTATION, q, limit: SEARCH_LIMIT, memberOf: nonDrugItemsConceptSetUUID }
    : {
        v: CONCEPT_REPRESENTATION,
        name: q,
        searchType: 'fuzzy',
        class: nonDrugItemsConceptClassUUID,
        limit: SEARCH_LIMIT,
      };

  const {
    items: { results },
    isLoading,
  } = useConcepts(filter, q.length > 0);

  return { concepts: results ?? [], isLoading };
}
