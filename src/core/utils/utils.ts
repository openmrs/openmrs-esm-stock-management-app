import { type User } from '../api/types/identity/User';

export const initialStockOperationValue = () => {
  return {
    atLocationName: '',
    atLocationUuid: '',
    cancelReason: '',
    cancelledBy: 0,
    cancelledByFamilyName: '',
    cancelledByGivenName: '',
    cancelledDate: undefined,
    completedBy: 0,
    completedByFamilyName: '',
    completedByGivenName: '',
    completedDate: undefined,
    creator: 0,
    creatorFamilyName: '',
    creatorGivenName: '',
    dateCreated: undefined,
    destinationName: '',
    destinationUuid: '',
    dispatchedByFamilyName: '',
    dispatchedByGivenName: '',
    dispatchedDate: undefined,
    externalReference: '',
    locked: false,
    operationDate: new Date(),
    operationNumber: '',
    operationOrder: 0,
    operationType: '',
    operationTypeName: '',
    operationTypeUuid: '',
    permission: undefined,
    reasonName: '',
    reasonUuid: '',
    rejectedByFamilyName: '',
    rejectedByGivenName: '',
    rejectedDate: undefined,
    rejectionReason: '',
    remarks: '',
    requisitionStockOperationUuid: '',
    responsiblePerson: 0,
    responsiblePersonFamilyName: '',
    responsiblePersonGivenName: '',
    responsiblePersonOther: '',
    responsiblePersonUuid: '',
    returnReason: '',
    returnedByFamilyName: '',
    returnedByGivenName: '',
    returnedDate: undefined,
    sourceName: '',
    sourceUuid: '',
    status: undefined,
    stockOperationItems: [],
    submitted: false,
    submittedBy: '',
    submittedByFamilyName: '',
    submittedByGivenName: '',
    submittedDate: undefined,
    uuid: '',
  };
};

export const pick = <T extends object>(obj: T, fields: string[]): Partial<T> => {
  if (!obj || typeof obj !== 'object') {
    throw new TypeError('First argument must be an object');
  }

  if (!Array.isArray(fields)) {
    throw new TypeError('Second argument must be an array');
  }

  const getNestedValue = (obj: any, path: string): any => {
    return path.split('.').reduce((acc, key) => (acc && acc[key] !== undefined ? acc[key] : undefined), obj);
  };

  return fields.reduce((result, field) => {
    const value = getNestedValue(obj, field);
    if (value !== undefined) {
      const keys = field.split('.');
      const lastKey = keys.pop()!;

      // Create nested structure in result
      keys.reduce((nested, key) => {
        if (!nested[key]) nested[key] = {};
        return nested[key];
      }, result as any)[lastKey] = value;
    }
    return result;
  }, {} as Partial<T>);
};

// react-hook-form stores an array/object field's nested validation errors (e.g. one row in a
// list of stock operation items) under the parent field's key rather than as a top-level message.
// This digs through that structure for the first human-readable message so it can be surfaced
// instead of the raw field key.
export const findFirstFieldErrorMessage = (error: unknown): string | undefined => {
  if (!error || typeof error !== 'object') {
    return undefined;
  }

  const message = (error as { message?: unknown }).message;
  if (typeof message === 'string' && message) {
    return message;
  }

  for (const value of Object.values(error)) {
    const nestedMessage = findFirstFieldErrorMessage(value);
    if (nestedMessage) {
      return nestedMessage;
    }
  }

  return undefined;
};

export const otherUser: User = {
  uuid: 'Other',
  display: 'Other',
  person: {
    display: 'Other',
  },
} as unknown as User;
