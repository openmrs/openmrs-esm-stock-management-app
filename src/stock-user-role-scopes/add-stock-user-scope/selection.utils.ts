import { type UserRoleScopeLocation } from '../../core/api/types/identity/UserRoleScopeLocation';
import { type UserRoleScopeOperationType } from '../../core/api/types/identity/UserRoleScopeOperationType';
import { type StockOperationType } from '../../core/api/types/stockOperation/StockOperationType';

export const getSelectionState = (selectedCount: number, totalCount: number) => ({
  checked: totalCount > 0 && selectedCount === totalCount,
  indeterminate: selectedCount > 0 && selectedCount < totalCount,
});

export const getAllOperationTypes = (operations: StockOperationType[]): UserRoleScopeOperationType[] =>
  operations.map((operation) => ({
    operationTypeName: operation.name,
    operationTypeUuid: operation.uuid,
  })) as UserRoleScopeOperationType[];

export const getAllLocations = (
  locations: fhir.Location[],
  existingLocations: UserRoleScopeLocation[] = [],
): UserRoleScopeLocation[] => {
  const selectedLocations = new Map(existingLocations.map((location) => [location.locationUuid, location]));

  locations.forEach((location) => {
    if (!selectedLocations.has(location.id)) {
      selectedLocations.set(location.id, {
        locationName: location.name,
        locationUuid: location.id,
        enableDescendants: false,
      } as UserRoleScopeLocation);
    }
  });

  return Array.from(selectedLocations.values());
};
