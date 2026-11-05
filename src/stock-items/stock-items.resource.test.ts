import { openmrsFetch, restBaseUrl } from '@openmrs/esm-framework';
import { describe, expect, it } from 'vitest';
import { deleteStockItemPackagingUnit } from './stock-items.resource';

describe('deleteStockItemPackagingUnit', () => {
  it('sends the void reason as a query parameter', () => {
    deleteStockItemPackagingUnit('packaging-uuid', 'No longer used');

    expect(openmrsFetch).toHaveBeenCalledWith(
      `${restBaseUrl}/stockmanagement/stockitempackaginguom/packaging-uuid?reason=No%20longer%20used`,
      expect.objectContaining({ method: 'DELETE' }),
    );
  });
});
