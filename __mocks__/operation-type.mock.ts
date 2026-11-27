export const adjustmentOpeationTypeMock = {
  name: 'Adjustment',
  operationType: 'adjustment',
  hasSource: true,
  sourceType: 'Location',
  hasDestination: false,
  destinationType: null,
  availableWhenReserved: true,
  allowExpiredBatchNumbers: false,
  stockOperationTypeLocationScopes: [
    {
      locationTag: 'Main Pharmacy',
      isSource: true,
      isDestination: false,
    },
    {
      locationTag: 'Main Store',
      isSource: true,
      isDestination: false,
    },
    {
      locationTag: 'Dispensary',
      isSource: true,
      isDestination: false,
    },
  ],
};

export const disposalOperationTypeMock = {
  name: 'Disposal',
  operationType: 'disposed',
  hasSource: true,
  sourceType: 'Location',
  hasDestination: false,
  destinationType: null,
  availableWhenReserved: true,
  allowExpiredBatchNumbers: true,
  stockOperationTypeLocationScopes: [
    {
      locationTag: 'Main Store',
      isSource: true,
      isDestination: false,
    },
    {
      locationTag: 'Main Pharmacy',
      isSource: true,
      isDestination: false,
    },
    {
      locationTag: 'Dispensary',
      isSource: true,
      isDestination: false,
    },
  ],
};

export const tranferOutOperationTypeMock = {
  name: 'Transfer Out',
  operationType: 'transferout',
  hasSource: true,
  sourceType: 'Location',
  hasDestination: true,
  destinationType: 'Other',
  availableWhenReserved: true,
  allowExpiredBatchNumbers: false,
  stockOperationTypeLocationScopes: [
    {
      locationTag: 'Main Store',
      isSource: true,
      isDestination: false,
    },
  ],
};

export const receiptOperationTypeMock = {
  name: 'Receipt',
  operationType: 'receipt',
  hasSource: true,
  sourceType: 'Other',
  hasDestination: true,
  destinationType: 'Location',
  availableWhenReserved: false,
  allowExpiredBatchNumbers: false,
  stockOperationTypeLocationScopes: [
    {
      locationTag: 'Main Store',
      isSource: false,
      isDestination: true,
    },
  ],
};

export const returnOperationTypeMock = {
  name: 'Return',
  operationType: 'return',
  hasSource: true,
  sourceType: 'Location',
  hasDestination: true,
  destinationType: 'Location',
  availableWhenReserved: true,
  allowExpiredBatchNumbers: false,
  stockOperationTypeLocationScopes: [
    {
      locationTag: 'Main Pharmacy',
      isSource: true,
      isDestination: false,
    },
    {
      locationTag: 'Dispensary',
      isSource: true,
      isDestination: false,
    },
    {
      locationTag: 'Main Store',
      isSource: false,
      isDestination: true,
    },
  ],
};

export const stockIssueOperationtypeMock = {
  name: 'Stock Issue',
  operationType: 'stockissue',
  hasSource: true,
  sourceType: 'Location',
  hasDestination: true,
  destinationType: 'Location',
  availableWhenReserved: true,
  allowExpiredBatchNumbers: false,
  stockOperationTypeLocationScopes: [
    {
      locationTag: 'Main Pharmacy',
      isSource: false,
      isDestination: true,
    },
    {
      locationTag: 'Dispensary',
      isSource: false,
      isDestination: true,
    },
    {
      locationTag: 'Main Store',
      isSource: true,
      isDestination: false,
    },
  ],
};

export const requisitionOperationTypeMock = {
  name: 'Requisition',
  operationType: 'requisition',
  hasSource: true,
  sourceType: 'Location',
  hasDestination: true,
  destinationType: 'Location',
  availableWhenReserved: false,
  allowExpiredBatchNumbers: false,
  stockOperationTypeLocationScopes: [
    {
      locationTag: 'Dispensary',
      isSource: true,
      isDestination: false,
    },
    {
      locationTag: 'Main Pharmacy',
      isSource: true,
      isDestination: false,
    },
    {
      locationTag: 'Main Store',
      isSource: false,
      isDestination: true,
    },
  ],
};

export const stockTakeOperationTypeMock = {
  name: 'Stock Take',
  operationType: 'stocktake',
  hasSource: true,
  sourceType: 'Location',
  hasDestination: false,
  destinationType: null,
  availableWhenReserved: true,
  allowExpiredBatchNumbers: false,
  stockOperationTypeLocationScopes: [
    {
      locationTag: 'Dispensary',
      isSource: true,
      isDestination: false,
    },
    {
      locationTag: 'Main Store',
      isSource: true,
      isDestination: false,
    },
    {
      locationTag: 'Main Pharmacy',
      isSource: true,
      isDestination: false,
    },
  ],
};

export const openingStockOperationTypeMock = {
  name: 'Opening Stock',
  operationType: 'initial',
  hasSource: true,
  sourceType: 'Location',
  hasDestination: false,
  destinationType: null,
  availableWhenReserved: false,
  allowExpiredBatchNumbers: false,
  stockOperationTypeLocationScopes: [
    {
      locationTag: 'Main Pharmacy',
      isSource: true,
      isDestination: false,
    },
    {
      locationTag: 'Main Store',
      isSource: true,
      isDestination: false,
    },
    {
      locationTag: 'Dispensary',
      isSource: true,
      isDestination: false,
    },
  ],
};

export const operationTypesMock = [
  adjustmentOpeationTypeMock,
  disposalOperationTypeMock,
  tranferOutOperationTypeMock,
  receiptOperationTypeMock,
  returnOperationTypeMock,
  stockIssueOperationtypeMock,
  requisitionOperationTypeMock,
  stockTakeOperationTypeMock,
  openingStockOperationTypeMock,
];
