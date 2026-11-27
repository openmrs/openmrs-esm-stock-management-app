import { type BaseOpenmrsData } from '../BaseOpenmrsData';

export interface UserRoleScopeOperationType extends BaseOpenmrsData {
  operationType: string;
  operationTypeName: string;
}
