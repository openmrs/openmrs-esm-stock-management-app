import { useMemo, useState } from 'react';
import {
  type ConceptFilterCriteria,
  type UserFilterCriteria,
  useUsers,
} from '../../../stock-lookups/stock-lookups.resource';
import { ResourceRepresentation } from '../../../core/api/api';

const useSearchUser = (filter?: ConceptFilterCriteria) => {
  const [searchString, setSearchString] = useState<string | null>(null);
  const [limit, setLimit] = useState(filter?.limit || 10);
  const [representation, setRepresentation] = useState<string>(filter?.v || ResourceRepresentation.Default);

  // No search term means no request, so an unfiltered page of users is never loaded.
  const userFilter = useMemo<UserFilterCriteria | null>(
    () =>
      searchString ? { startIndex: 0, v: representation as ResourceRepresentation, limit, q: searchString } : null,
    [searchString, limit, representation],
  );

  const {
    items: { results: userList },
    isLoading,
  } = useUsers(userFilter);

  return {
    userList,
    setLimit,
    setRepresentation,
    setSearchString,
    isLoading,
    hasSearchTerm: Boolean(searchString),
  };
};

export default useSearchUser;
