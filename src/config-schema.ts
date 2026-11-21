import { Type } from '@openmrs/esm-framework';
export const configSchema = {
  autoPopulateResponsiblePerson: {
    _type: Type.Boolean,
    _default: false,
    _description: 'Auto-populate responsible person in stock operations with the currently logged-in user',
  },
  dispensingUnitsUUID: {
    _type: Type.ConceptUuid,
    _description: 'UUID for the stock dispensing units',
    _default: '162402AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
  },
  enablePrintButton: {
    _type: Type.Boolean,
    _default: true,
    _description: 'Enable or disable the print button in the stock management UI',
  },
  facilityName: {
    _type: Type.String,
    _default: 'Health Center',
    _description: 'The facility name shown on requisition, stock transfer and goods received printouts',
  },
  logo: {
    src: {
      _type: Type.String,
      _default: null,
      _description: 'A path or URL to an image',
    },
    alt: {
      _type: Type.String,
      _default: 'Logo',
      _description: 'Alt text shown on hover',
    },
    name: {
      _type: Type.String,
      _default: null,
      _description: 'The organization name displayed when image is absent',
    },
  },
  mainStoreLocationTag: {
    _type: Type.String,
    _default: 'Main Store',
    _description:
      "The name of the location tag for the main store. The source or destination of a new stock operation is prefilled when this is the only tag the operation type allows on that side. It needs to match a tag in the backend's operation type location scopes",
  },
  packingUnitsUUID: {
    _type: Type.ConceptUuid,
    _description: 'UUID for the packaging unit',
    _default: 'a6d438fe-05c1-4d4d-9755-c11cf6b0b3b9',
  },
  printBalanceOnHand: {
    _type: Type.Boolean,
    _default: false,
    _description: 'Whether to include balance on hand on the printout',
  },
  printItemCost: {
    _type: Type.Boolean,
    _default: false,
    _description: 'Whether to include item costs on the printout',
  },
  stockAdjustmentReasonUUID: {
    _type: Type.ConceptUuid,
    _description: 'UUID for the stock adjustment reasons',
    _default: '3a9021d1-d6c1-4fc2-8e30-ca8e204e44de',
  },
  stockItemCategoryUUID: {
    _type: Type.ConceptUuid,
    _description: 'UUID for the stock item category',
    _default: '8ccf6066-9297-4d76-aaf3-00aa3714d198',
  },
  stockLocationTags: {
    _type: Type.Array,
    _elements: {
      _type: Type.String,
    },
    _default: ['Main Store', 'Main Pharmacy', 'Dispensary', 'Sub Store'],
    _description:
      "The names of the location tags for stock locations. Locations without one of these tags don't appear in the stock locations table, the user role scope form, stock rules, reports or the location filters. This doesn't change which locations stock operations accept. That comes from each operation type's location scopes in the backend",
  },
  stockRoleUUIDs: {
    _type: Type.Array,
    _elements: {
      _type: Type.UUID,
    },
    _default: [
      'd210eb66-2188-11ed-9dff-507b9dea1806',
      'cca4be4b-2188-11ed-9dff-507b9dea1806',
      '84bdd876-4694-11ed-8109-00155dcc3fc0',
      'a49be648-6b0a-11ed-93a2-806d973f13a9',
      '2083fd40-3391-11ed-a667-507b9dea1806',
    ],
    _description: 'The UUIDs of the roles that identify stock roles in the user role scope form',
  },
  stockSourceTypeUUID: {
    _type: Type.ConceptUuid,
    _description: 'UUID for the stock source types',
    _default: '937a0440-95f7-42f6-aaef-16cf611fcf10',
  },
  stockTakeReasonUUID: {
    _type: Type.ConceptUuid,
    _description: 'UUID for the stock take reasons',
    _default: 'faa466c5-0953-4d4f-8ea7-d9a06341c3f3',
  },
  useItemCommonNameAsDisplay: {
    _type: Type.Boolean,
    _description: 'Use item common name as display (true) or drug name as display (false)',
    _default: true,
  },
};

export type ConfigObject = {
  autoPopulateResponsiblePerson: boolean;
  dispensingUnitsUUID: string;
  enablePrintButton: boolean;
  facilityName: string;
  logo: {
    src: string;
    alt: string;
    name: string;
  };
  mainStoreLocationTag: string;
  packingUnitsUUID: string;
  printBalanceOnHand: boolean;
  printItemCost: boolean;
  stockAdjustmentReasonUUID: string;
  stockItemCategoryUUID: string;
  stockLocationTags: Array<string>;
  stockRoleUUIDs: Array<string>;
  stockSourceTypeUUID: string;
  stockTakeReasonUUID: string;
  useItemCommonNameAsDisplay: boolean;
};
