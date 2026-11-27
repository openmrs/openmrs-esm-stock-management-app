import { type BaseOpenmrsData } from '../src/core/api/types/BaseOpenmrsData';
import { type UserRoleScope } from '../src/core/api/types/identity/UserRoleScope';
import { type StockOperationType } from '../src/core/api/types/stockOperation/StockOperationType';
import { operationTypesMock } from './operation-type.mock';

const auditFields: Omit<BaseOpenmrsData, 'uuid'> = {
  creator: null,
  dateCreated: new Date('2026-01-01T12:00:00Z'),
  changedBy: null,
  dateChanged: null,
  voided: false,
  voidedBy: null,
  dateVoided: null,
  voidReason: null,
};

export const roleScopeOperationTypes = operationTypesMock.map(
  (operation): StockOperationType => ({
    ...operation,
    sourceType: operation.hasSource ? 'Location' : null,
    destinationType: operation.hasDestination ? 'Location' : null,
    stockOperationTypeLocationScopes: [],
  }),
);

export const userRoleScopeMock: UserRoleScope = {
  ...auditFields,
  uuid: 'scope-jane',
  userUuid: 'user-jane',
  userFamilyName: 'Doe',
  userGivenName: 'Jane',
  role: 'Inventory Manager',
  permanent: false,
  activeFrom: new Date('2026-01-01T12:00:00Z'),
  enabled: true,
  operationTypes: roleScopeOperationTypes.map((operation) => ({
    ...auditFields,
    uuid: `scope-operation-${operation.operationType}`,
    operationType: operation.operationType,
    operationTypeName: operation.name,
  })),
  locations: [
    'Central Medical Supplies Main Store',
    'Outpatient Department Main Pharmacy',
    'Maternal and Child Health Pharmacy',
    'Emergency and Trauma Department Store',
    'Community Outreach Supply Store',
  ].map((locationName, index) => ({
    ...auditFields,
    uuid: `scope-location-${index}`,
    locationUuid: `location-${index}`,
    locationName,
    enableDescendants: index === 0,
  })),
};
