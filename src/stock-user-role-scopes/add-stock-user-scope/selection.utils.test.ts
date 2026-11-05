import { describe, expect, it } from 'vitest';
import { getAllLocations, getAllOperationTypes, getSelectionState } from './selection.utils';

describe('scope group selection helpers', () => {
  it('selects every available operation type', () => {
    expect(
      getAllOperationTypes([
        { uuid: 'receive', name: 'Receive' },
        { uuid: 'issue', name: 'Issue' },
      ] as any),
    ).toEqual([
      { operationTypeUuid: 'receive', operationTypeName: 'Receive' },
      { operationTypeUuid: 'issue', operationTypeName: 'Issue' },
    ]);
  });

  it('selects every location with descendants disabled by default', () => {
    expect(
      getAllLocations([
        { id: 'store', name: 'Store' },
        { id: 'pharmacy', name: 'Pharmacy' },
      ] as any),
    ).toEqual([
      { locationUuid: 'store', locationName: 'Store', enableDescendants: false },
      { locationUuid: 'pharmacy', locationName: 'Pharmacy', enableDescendants: false },
    ]);
  });

  it('preserves existing location entries when selecting all', () => {
    const existingLocation = {
      locationUuid: 'store',
      locationName: 'Old store name',
      enableDescendants: true,
    };

    expect(
      getAllLocations(
        [
          { id: 'store', name: 'Store' },
          { id: 'pharmacy', name: 'Pharmacy' },
        ] as any,
        [existingLocation as any],
      ),
    ).toEqual([existingLocation, { locationUuid: 'pharmacy', locationName: 'Pharmacy', enableDescendants: false }]);
  });

  it('reports checked, unchecked and indeterminate group states', () => {
    expect(getSelectionState(0, 3)).toEqual({ checked: false, indeterminate: false });
    expect(getSelectionState(3, 3)).toEqual({ checked: true, indeterminate: false });
    expect(getSelectionState(1, 3)).toEqual({ checked: false, indeterminate: true });
  });
});
