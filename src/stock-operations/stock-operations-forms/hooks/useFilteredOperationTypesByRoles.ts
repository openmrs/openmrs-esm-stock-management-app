import { useMemo } from 'react';
import { useStockManagementSession, useStockOperationTypes } from '../../../stock-lookups/stock-lookups.resource';

/**
 * Returns the operation types in the current user's privilege scopes.
 * @param privilege Only count scopes that grant this privilege. Leave it out to count every scope.
 */
const useFilteredOperationTypesByRoles = (privilege?: string) => {
  const {
    types: { results },
    isLoading: isStockOperationTypesLoading,
    error: stockOperationTypesError,
  } = useStockOperationTypes();

  const {
    privilegeScopes,
    isLoading: isPrivilegeScopesLoading,
    error: privilegeScopesError,
  } = useStockManagementSession();

  const operationTypes = useMemo(() => {
    const applicableOperationTypeUuids = new Set(
      privilegeScopes
        ?.filter((scope) => !privilege || scope.privilege === privilege)
        .map((scope) => scope.operationTypeUuid),
    );

    return results?.filter((p) => applicableOperationTypeUuids.has(p.uuid)) || [];
  }, [results, privilegeScopes, privilege]);

  const isLoading = isStockOperationTypesLoading || isPrivilegeScopesLoading;
  const error = stockOperationTypesError || privilegeScopesError;

  return {
    operationTypes,
    isLoading,
    error,
  };
};

export default useFilteredOperationTypesByRoles;
